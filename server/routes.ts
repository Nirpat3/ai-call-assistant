import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { apiGateway } from "./services/ServiceRegistry";
import { enhancedCallWorkflow } from "./services/EnhancedCallWorkflow";
import { 
  handleIncomingCall, 
  handleCallGather, 
  handleVoicemail, 
  handleRecording,
  makeOutboundCall,
  type CallWebhookData 
} from "./twilio";
import { sendNotification, getNotificationStatus, testNotification } from "./notifications";
import { 
  insertCallSchema, insertContactSchema, insertContactPhoneNumberSchema 
} from "@shared/schema";
import twilio from "twilio";
import { integrationManager } from "./integrations";
import { analyzeCallIntent } from "./openai";
import { coldTransfer, warmTransfer, conferenceTransfer, autoForward, type TransferRequest } from "./call-transfer";
import OpenAI from "openai";
import multer from "multer";
import { notificationService } from "./services/NotificationService";
import { advancedNotificationEngine } from "./services/AdvancedNotificationEngine";
import { intelligentCallRouter } from "./services/IntelligentCallRouter";
import { phdAIEngineer } from "./ai-phd-engineer";
import * as orgRoutes from "./organization-routes";
import { smartSupportAutomation } from "./smart-support-automation";
import {
  savePushSubscription,
  removePushSubscription,
  getSubscriptions,
  sendPushBroadcast,
  sendMissedCallPush,
  sendVoicemailPush,
  isPushConfigured,
  getVapidPublicKey,
  createAndPushNotification,
} from "./push-service";
import {
  initRealtimeVoiceBridge,
  getActiveVoiceSessions,
  getVoiceSessionDetails,
  AGENT_PERSONAS,
  PERSONA_VOICE_MAP,
} from "./services/realtime-voice-bridge";
import { aiCommandEngineer } from "./ai-command-engineer";
import { ticketManagementService } from "./ticket-management";
import { insertSupportTicketSchema } from "@shared/schema";
import { webhookIntegrationService, type WebhookConfig } from "./webhook-integrations";
import { simpleSales } from "./simple-sales";
import { calendarService } from "./calendar-service";
import { aiAssistantService } from "./ai-assistant-service";
import { requireAuth, signToken } from "./middleware/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit for audio files
    },
    fileFilter: (req, file, cb) => {
      // Accept audio files
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed'));
      }
    },
  });

  // Create HTTP server 
  const httpServer = createServer(app);
  
  // Initialize notification service with WebSocket support
  notificationService.initialize(httpServer);

  // Initialize realtime voice bridge (Twilio Media Streams ↔ OpenAI Realtime)
  initRealtimeVoiceBridge(httpServer);

  // Initialize advanced services
  console.log('Initializing advanced AI services...');

  // CRITICAL: Twilio voice webhook must be first to avoid Vite middleware interference
  app.post('/api/twilio/voice', async (req, res) => {
    console.log("Twilio voice webhook called with:", req.body);
    try {
      const webhookData: CallWebhookData = req.body;
      const twiml = await handleIncomingCall(webhookData);
      
      console.log("Returning TwiML:", twiml);
      res.type('text/xml');
      res.send(twiml);
    } catch (error) {
      console.error("Error handling Twilio voice webhook:", error);
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>We're experiencing technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`);
    }
  });

  // Hold music endpoint for call transfers
  app.get('/api/twilio/hold-music', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Please continue to hold. We are connecting you now.');
    
    // Add a loop with pleasant hold music simulation
    twiml.play({
      loop: 10
    }, 'http://com.twilio.music.classical.s3.amazonaws.com/ith_chopin-15-2.mp3');
    
    // Fallback message if music doesn't play
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'We are still working to connect your call. Thank you for your patience.');
    
    res.type('text/xml');
    res.send(twiml.toString());
  });

  app.post('/api/twilio/transfer-status', async (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    const dialCallStatus = req.body.DialCallStatus;
    const callerNumber = req.body.From || req.body.Caller || 'Unknown';
    
    console.log('Transfer status:', dialCallStatus);
    
    switch (dialCallStatus) {
      case 'completed':
      case 'answered':
        break;
      case 'busy':
        twiml.say({ voice: 'alice', language: 'en-US' }, 'The person you are trying to reach is currently busy. Please try again later or leave a voicemail.');
        twiml.redirect('/api/twilio/voicemail');
        import('./services/sms-alerts').then(m => m.notifyMissedCall(callerNumber)).catch(() => {});
        break;
      case 'no-answer':
        twiml.say({ voice: 'alice', language: 'en-US' }, 'Sorry, no one is available to take your call right now. You can leave a voicemail and we will get back to you.');
        twiml.redirect('/api/twilio/voicemail');
        import('./services/sms-alerts').then(m => m.notifyMissedCall(callerNumber)).catch(() => {});
        break;
      case 'failed':
      case 'canceled':
      default:
        twiml.say({ voice: 'alice', language: 'en-US' }, 'I apologize, but we were unable to complete the transfer. Please try calling back or leave a voicemail.');
        twiml.redirect('/api/twilio/voicemail');
        import('./services/sms-alerts').then(m => m.notifyMissedCall(callerNumber)).catch(() => {});
        break;
    }
    
    res.type('text/xml');
    res.send(twiml.toString());
  });

  app.post('/api/twilio/forward-status', async (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    const dialCallStatus = req.body.DialCallStatus;
    const callerNumber = req.body.From || req.body.Caller || 'Unknown';
    
    console.log('Forward status:', dialCallStatus);
    
    switch (dialCallStatus) {
      case 'completed':
      case 'answered':
        break;
      case 'busy':
      case 'no-answer':
      case 'failed':
      case 'canceled':
      default:
        twiml.say({ voice: 'alice', language: 'en-US' }, 'We are currently unavailable. Please leave a detailed message and we will return your call as soon as possible.');
        twiml.redirect('/api/twilio/voicemail');
        import('./services/sms-alerts').then(m => m.notifyMissedCall(callerNumber)).catch(() => {});
        break;
    }
    
    res.type('text/xml');
    res.send(twiml.toString());
  });

  // Call transfer API endpoint
  app.post('/api/call-transfer', async (req, res) => {
    try {
      const { callSid, transferTo, transferType, reason, transferredBy } = req.body;
      
      if (!callSid || !transferTo || !transferType) {
        return res.status(400).json({ 
          error: 'Missing required parameters: callSid, transferTo, transferType' 
        });
      }

      const transferRequest: TransferRequest = {
        callSid,
        transferTo,
        transferType,
        reason,
        transferredBy
      };

      let twiml: string;
      
      switch (transferType) {
        case 'cold':
          twiml = coldTransfer(transferRequest);
          break;
        case 'warm':
          twiml = warmTransfer(transferRequest);
          break;
        case 'conference':
          twiml = conferenceTransfer(transferRequest);
          break;
        default:
          return res.status(400).json({ error: 'Invalid transfer type' });
      }

      // Update the call using Twilio's API
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        await twilioClient.calls(callSid).update({
          twiml: twiml
        });
      }

      res.json({ 
        success: true, 
        message: `${transferType} transfer initiated`,
        transferId: `${callSid}-${Date.now()}`
      });
      
    } catch (error) {
      console.error('Call transfer error:', error);
      res.status(500).json({ error: 'Failed to initiate transfer' });
    }
  });

  // Initialize Twilio client
  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  
  // Broadcast function using notification service
  function broadcast(data: any) {
    // Use notification service for broadcasting
    if (data.type === 'notification') {
      notificationService.createNotification(data);
    }
  }

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // For demo purposes, accept these test credentials
      const validCredentials = [
        { email: "admin@aicallagent.com", password: "admin123", role: "admin" },
        { email: "user@aicallagent.com", password: "user123", role: "user" },
        { email: "demo@aicallagent.com", password: "demo123", role: "demo" }
      ];

      const credentials = validCredentials.find(cred => 
        cred.email === email && cred.password === password
      );

      if (!credentials) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const dbUser = await storage.getUserByEmail(email);
      
      if (!dbUser) {
        return res.status(401).json({ message: "User not found in database" });
      }

      const token = signToken({
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
        role: credentials.role,
        organizationId: dbUser.currentOrganizationId || "00000000-0000-0000-0000-000000000001"
      });

      res.json({
        token,
        user: {
          id: dbUser.id,
          email: dbUser.email,
          username: dbUser.username,
          firstName: dbUser.firstName || email.split('@')[0],
          lastName: dbUser.lastName || "User",
          role: credentials.role
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Simulate sending reset email
      console.log(`Password reset requested for: ${email}`);
      
      // In production, send actual email
      res.json({ message: "Password reset link sent to your email" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to send reset email" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      
      const dbUser = await storage.getUser(user.id);
      
      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: dbUser?.firstName || user.email.split('@')[0],
        lastName: dbUser?.lastName || "User",
        role: user.role
      });
    } catch (error) {
      console.error("Auth verification error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Organization switching API routes using microservices
  app.get("/api/user/organizations", async (req, res) => {
    try {
      const userId = 1; // In production, get from authenticated session
      const userOrgs = await apiGateway.getUserOrganizations(userId);
      
      res.json({
        id: userOrgs.user.id,
        currentOrganizationId: userOrgs.user.currentOrganizationId,
        organizations: userOrgs.organizations
      });
    } catch (error) {
      console.error("Error fetching user organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.post("/api/user/switch-organization", async (req, res) => {
    try {
      const { organizationId } = req.body;
      const userId = 1; // In production, get from authenticated session
      
      await apiGateway.switchOrganization(userId, organizationId);
      res.json({ success: true, currentOrganizationId: organizationId });
    } catch (error) {
      console.error("Error switching organization:", error);
      res.status(500).json({ message: "Failed to switch organization" });
    }
  });

  // Dashboard API routes
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      const dateFilter = req.query.dateFilter as string || 'today';
      const customStartDate = req.query.startDate as string;
      const customEndDate = req.query.endDate as string;
      
      // Calculate date range based on filter
      const now = new Date();
      let startDate: Date;
      let endDate: Date = new Date(now.getTime() + 24 * 60 * 60 * 1000); // End of today
      
      // Handle custom date range
      if (dateFilter === 'custom' && customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999); // Set to end of day
      } else {
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'yesterday':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'this_week':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
            break;
          case 'last_week':
            const lastWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 7);
            const lastWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
            startDate = lastWeekStart;
            endDate = lastWeekEnd;
            break;
          case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'last_month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'this_quarter':
            const quarterStart = Math.floor(now.getMonth() / 3) * 3;
            startDate = new Date(now.getFullYear(), quarterStart, 1);
            break;
          case 'last_quarter':
            const lastQuarterStart = Math.floor((now.getMonth() - 3) / 3) * 3;
            const lastQuarterYear = lastQuarterStart < 0 ? now.getFullYear() - 1 : now.getFullYear();
            const adjustedQuarterStart = lastQuarterStart < 0 ? 9 : lastQuarterStart;
            startDate = new Date(lastQuarterYear, adjustedQuarterStart, 1);
            endDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            break;
          case 'this_year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          case 'last_year':
            startDate = new Date(now.getFullYear() - 1, 0, 1);
            endDate = new Date(now.getFullYear(), 0, 1);
            break;
          case 'last_7_days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'last_30_days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'last_90_days':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          // Legacy support for old filter names
          case 'week':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            const legacyQuarterStart = Math.floor(now.getMonth() / 3) * 3;
            startDate = new Date(now.getFullYear(), legacyQuarterStart, 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          case 'last7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'last30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'last90days':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }
      }
      
      // Get filtered calls based on date range - pass no organization ID to get all calls
      const allCalls = await storage.getCalls(); // Get all calls to filter
      const filteredCalls = allCalls.filter(call => {
        const callTime = call.startTime || call.createdAt;
        if (!callTime) return false;
        const callDate = new Date(callTime);
        return callDate >= startDate && callDate < endDate;
      });
      
      const totalCalls = filteredCalls.length;
      const aiHandled = filteredCalls.filter(call => call.aiHandled).length;
      
      // Calculate call routing statistics
      const routingStats = {
        totalRouted: 0,
        salesRouted: 0,
        supportRouted: 0,
        generalRouted: 0,
        transferredCalls: 0,
        voicemailRouted: 0,
        directAnswered: 0
      };
      
      // Analyze call routing patterns
      filteredCalls.forEach(call => {
        if (call.status === 'transferred') {
          routingStats.transferredCalls++;
          routingStats.totalRouted++;
        }
        
        // Analyze routing based on key topics and summary
        if (call.keyTopics && call.keyTopics.length > 0) {
          routingStats.totalRouted++;
          const topics = call.keyTopics.join(' ').toLowerCase();
          if (topics.includes('sales') || topics.includes('purchase') || topics.includes('buy') || topics.includes('quote')) {
            routingStats.salesRouted++;
          } else if (topics.includes('support') || topics.includes('help') || topics.includes('issue') || topics.includes('problem')) {
            routingStats.supportRouted++;
          } else {
            routingStats.generalRouted++;
          }
        } else if (call.summary) {
          routingStats.totalRouted++;
          const summary = call.summary.toLowerCase();
          if (summary.includes('sales') || summary.includes('purchase') || summary.includes('buy') || summary.includes('quote')) {
            routingStats.salesRouted++;
          } else if (summary.includes('support') || summary.includes('help') || summary.includes('issue') || summary.includes('problem')) {
            routingStats.supportRouted++;
          } else {
            routingStats.generalRouted++;
          }
        }
        
        if (call.status === 'completed' && !call.keyTopics && !call.aiHandled) {
          routingStats.directAnswered++;
        }
      });
      
      // Calculate voicemail routing
      const allVoicemails = await storage.getVoicemails();
      const filteredVoicemails = allVoicemails.filter(vm => {
        if (!vm.createdAt) return false;
        const vmDate = new Date(vm.createdAt);
        return vmDate >= startDate && vmDate < endDate;
      });
      routingStats.voicemailRouted = filteredVoicemails.length;
      
      const transcribedVoicemails = filteredVoicemails.filter(vm => vm.transcription).length;
      
      // Get call routes for routing efficiency
      const callRoutes = await storage.getCallRoutes();
      
      // Notifications are always current (unread count doesn't change by date)
      const notifications = await storage.getNotifications();
      const unreadNotifications = notifications.filter(n => !n.isRead).length;
      
      // Calculate average response time from actual call data
      const completedCalls = filteredCalls.filter(call => call.duration && call.duration > 0);
      const avgResponseTime = completedCalls.length > 0 
        ? `${(completedCalls.reduce((sum, call) => sum + (call.duration || 0), 0) / completedCalls.length / 60).toFixed(1)}m`
        : "0m";
      
      res.json({
        callsToday: totalCalls,
        aiHandled,
        automationRate: totalCalls > 0 ? Math.round((aiHandled / totalCalls) * 100) : 0,
        voicemails: filteredVoicemails.length,
        transcribedVoicemails,
        responseTime: avgResponseTime,
        unreadNotifications,
        dateFilter,
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString(),
        // Call routing statistics
        routing: {
          totalRouted: routingStats.totalRouted,
          salesRouted: routingStats.salesRouted,
          supportRouted: routingStats.supportRouted,
          generalRouted: routingStats.generalRouted,
          transferredCalls: routingStats.transferredCalls,
          voicemailRouted: routingStats.voicemailRouted,
          directAnswered: routingStats.directAnswered,
          routingEfficiency: totalCalls > 0 ? Math.round((routingStats.totalRouted / totalCalls) * 100) : 0,
          availableRoutes: callRoutes.length
        }
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Notification API endpoints
  app.get('/api/notifications', async (req, res) => {
    try {
      const notifications = await notificationService.getNotifications();
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post('/api/notifications', async (req, res) => {
    try {
      const notification = await notificationService.createNotification(req.body);
      res.status(201).json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  app.put('/api/notifications/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const notification = await storage.updateNotification(id, req.body);
      res.json(notification);
    } catch (error) {
      console.error("Error updating notification:", error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  app.delete('/api/notifications/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteNotification(id);
      res.json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  app.put('/api/notifications/:id/read', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const notification = await storage.updateNotification(id, { isRead: true });
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put('/api/notifications/mark-all-read', async (req, res) => {
    try {
      const notifications = await storage.getNotifications();
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      for (const notification of unreadNotifications) {
        await storage.updateNotification(notification.id, { isRead: true });
      }
      
      res.json({ message: "All notifications marked as read", count: unreadNotifications.length });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Weather API endpoint
  app.get('/api/weather', async (req, res) => {
    try {
      const location = req.query.location as string;
      
      // For weather data, we need the OPENWEATHER_API_KEY
      const apiKey = process.env.OPENWEATHER_API_KEY;
      
      if (!apiKey || apiKey.trim() === '') {
        // Return demo weather data when no API key is configured
        const demoWeather = {
          location: location || 'Atlanta, GA',
          temperature: 72,
          condition: 'Clear',
          description: 'clear sky',
          humidity: 45,
          windSpeed: 8,
          visibility: 10,
          icon: '01d',
          isDemo: true
        };
        return res.json(demoWeather);
      }

      // Use default Atlanta coordinates if no location specified
      let lat = 33.7490, lon = -84.3880, name = 'Atlanta', state = 'Georgia', country = 'US';

      try {
        if (location) {
          // Geocoding to get coordinates from location name
          const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`;
          const geocodeResponse = await fetch(geocodeUrl);
          
          if (!geocodeResponse.ok) {
            if (geocodeResponse.status === 401) {
              // Return demo data with invalid key indicator
              const demoWeather = {
                location: location,
                temperature: 72,
                condition: 'Clear',
                description: 'clear sky',
                humidity: 45,
                windSpeed: 8,
                visibility: 10,
                icon: '01d',
                isDemo: true,
                apiKeyInvalid: true
              };
              return res.json(demoWeather);
            }
            throw new Error(`Geocoding failed: ${geocodeResponse.status}`);
          }
          
          const geocodeData = await geocodeResponse.json();
          
          if (!geocodeData || geocodeData.length === 0) {
            // Use default Atlanta coordinates if geocoding fails
            console.log(`Geocoding failed for location: ${location}, using default Atlanta`);
          } else {
            ({ lat, lon, name, state, country } = geocodeData[0]);
          }
        }
        
        // Get current weather data
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
        const weatherResponse = await fetch(weatherUrl);
        
        if (!weatherResponse.ok) {
          if (weatherResponse.status === 401) {
            // Return demo data with invalid key indicator
            const demoWeather = {
              location: location.includes('Atlanta') ? 'Atlanta, GA' : location,
              temperature: 72,
              condition: 'Clear',
              description: 'clear sky',
              humidity: 45,
              windSpeed: 8,
              visibility: 10,
              icon: '01d',
              isDemo: true,
              apiKeyInvalid: true
            };
            return res.json(demoWeather);
          }
          throw new Error(`Weather API failed: ${weatherResponse.status}`);
        }
        
        const weatherData = await weatherResponse.json();
        
        // Format response
        const formattedWeather = {
          location: state ? `${name}, ${state}` : `${name}, ${country}`,
          temperature: Math.round(weatherData.main.temp),
          condition: weatherData.weather[0].main,
          description: weatherData.weather[0].description,
          humidity: weatherData.main.humidity,
          windSpeed: Math.round(weatherData.wind?.speed || 0),
          visibility: Math.round((weatherData.visibility || 10000) / 1609.34), // Convert meters to miles
          icon: weatherData.weather[0].icon,
          isDemo: false
        };

        res.json(formattedWeather);
      } catch (error) {
        // Fallback to demo data on any error
        const demoWeather = {
          location: location.includes('Atlanta') ? 'Atlanta, GA' : location,
          temperature: 72,
          condition: 'Clear',
          description: 'clear sky',
          humidity: 45,
          windSpeed: 8,
          visibility: 10,
          icon: '01d',
          isDemo: true
        };
        res.json(demoWeather);
      }
    } catch (error) {
      console.error('Weather API error:', error);
      res.status(500).json({ 
        error: 'Weather service error', 
        message: 'Unable to fetch weather data' 
      });
    }
  });

  app.get('/api/calls/recent', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const calls = await storage.getRecentCalls(limit);
      res.json(calls);
    } catch (error) {
      console.error("Error fetching recent calls:", error);
      res.status(500).json({ message: "Failed to fetch recent calls" });
    }
  });

  app.get('/api/calls', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const calls = await storage.getRecentCalls(limit);
      res.json(calls);
    } catch (error) {
      console.error("Error fetching calls:", error);
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  // Knowledge Base Management
  app.get('/api/knowledge-base', async (req, res) => {
    try {
      const knowledgeBase = await storage.getKnowledgeBase();
      res.json(knowledgeBase);
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      res.status(500).json({ message: "Failed to fetch knowledge base" });
    }
  });

  app.post('/api/knowledge-base', async (req, res) => {
    try {
      const entry = await storage.createKnowledgeBase(req.body);
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating knowledge base entry:", error);
      res.status(500).json({ message: "Failed to create knowledge base entry" });
    }
  });

  app.put('/api/knowledge-base/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const entry = await storage.updateKnowledgeBase(id, req.body);
      res.json(entry);
    } catch (error) {
      console.error("Error updating knowledge base entry:", error);
      res.status(500).json({ message: "Failed to update knowledge base entry" });
    }
  });

  app.delete('/api/knowledge-base/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteKnowledgeBase(id);
      res.json({ message: "Knowledge base entry deleted" });
    } catch (error) {
      console.error("Error deleting knowledge base entry:", error);
      res.status(500).json({ message: "Failed to delete knowledge base entry" });
    }
  });

  // Conversation Logs and Analytics
  app.get('/api/conversation-logs', async (req, res) => {
    try {
      const logs = await storage.getConversationLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching conversation logs:", error);
      res.status(500).json({ message: "Failed to fetch conversation logs" });
    }
  });

  app.get('/api/conversation-logs/call/:callId', async (req, res) => {
    try {
      const callId = parseInt(req.params.callId);
      const logs = await storage.getConversationLogsByCall(callId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching conversation logs for call:", error);
      res.status(500).json({ message: "Failed to fetch conversation logs for call" });
    }
  });

  // AI Response Evaluations
  app.get('/api/ai-evaluations', async (req, res) => {
    try {
      const evaluations = await storage.getAiResponseEvaluations();
      res.json(evaluations);
    } catch (error) {
      console.error("Error fetching AI evaluations:", error);
      res.status(500).json({ message: "Failed to fetch AI evaluations" });
    }
  });

  app.get('/api/voicemails', async (req, res) => {
    try {
      const voicemails = await storage.getVoicemails();
      const calls = await storage.getRecentCalls(100); // Get enough calls to cover voicemails
      const contacts = await storage.getContacts();
      
      // Enrich voicemails with call and contact information
      const enrichedVoicemails = voicemails.map(voicemail => {
        // Find the associated call
        const call = calls.find(c => c.id === voicemail.callId);
        
        if (call) {
          // Find matching contact by phone number
          const contact = contacts.find(c => 
            c.phoneNumber === call.from || 
            c.mobileNumber === call.from ||
            c.workNumber === call.from
          );
          
          return {
            ...voicemail,
            call: {
              from: call.from,
              to: call.to,
              callerName: call.callerName,
              duration: call.duration
            },
            contact,
            displayName: contact ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.displayName : call.callerName,
            phoneNumber: call.from
          };
        }
        
        return {
          ...voicemail,
          displayName: "Unknown Caller",
          phoneNumber: "Unknown"
        };
      });
      
      res.json(enrichedVoicemails);
    } catch (error) {
      console.error("Error fetching voicemails:", error);
      res.status(500).json({ message: "Failed to fetch voicemails" });
    }
  });

  // Track read notifications in memory
  const readNotifications = new Set<string>();

  // Mark voicemail as read
  app.patch('/api/voicemails/:id/read', async (req, res) => {
    try {
      const voicemailId = parseInt(req.params.id);
      const notificationId = `voicemail-${voicemailId}`;
      
      // Add to read notifications set
      readNotifications.add(notificationId);
      
      res.json({ message: "Voicemail marked as read" });
    } catch (error) {
      console.error("Error marking voicemail as read:", error);
      res.status(500).json({ message: "Failed to mark voicemail as read" });
    }
  });

  // Process voicemail transcription
  app.post('/api/voicemails/:id/transcribe', async (req, res) => {
    try {
      const voicemailId = parseInt(req.params.id);
      
      // Get voicemail details
      const voicemails = await storage.getVoicemails();
      const voicemail = voicemails.find(vm => vm.id === voicemailId);
      
      if (!voicemail) {
        return res.status(404).json({ message: "Voicemail not found" });
      }

      if (!voicemail.recordingUrl) {
        return res.status(400).json({ message: "No recording URL available" });
      }

      // Import transcription service
      const { processVoicemailRecording } = await import('./voicemail-transcription');
      
      // Process in background
      processVoicemailRecording(voicemailId, voicemail.recordingUrl).catch(error => {
        console.error(`Background transcription failed for voicemail ${voicemailId}:`, error);
      });
      
      res.json({ message: "Transcription started", voicemailId });
    } catch (error) {
      console.error("Error starting voicemail transcription:", error);
      res.status(500).json({ message: "Failed to start transcription" });
    }
  });

  // Batch process unprocessed voicemails
  app.post('/api/voicemails/process-all', async (req, res) => {
    try {
      // Import transcription service
      const { processUnprocessedVoicemails } = await import('./voicemail-transcription');
      
      // Process in background
      processUnprocessedVoicemails().catch(error => {
        console.error("Background batch processing failed:", error);
      });
      
      res.json({ message: "Batch processing started" });
    } catch (error) {
      console.error("Error starting batch processing:", error);
      res.status(500).json({ message: "Failed to start batch processing" });
    }
  });

  // Notification endpoints
  app.get('/api/notifications', async (req, res) => {
    try {
      // Get real data for notifications
      const calls = await storage.getRecentCalls(10);
      const voicemails = await storage.getVoicemails();
      
      // Generate notifications from real data
      const notifications = [];
      
      // Add call notifications (recent incoming calls)
      calls.filter(call => call.direction === 'inbound').forEach(call => {
        notifications.push({
          id: `call-${call.id}`,
          type: 'call',
          title: 'New Incoming Call',
          message: `Call from ${call.from}${call.callerName ? ` - ${call.callerName}` : ''}`,
          isRead: Math.random() > 0.3, // 70% chance unread for demo
          priority: call.status === 'failed' ? 'high' : 'medium',
          createdAt: call.createdAt || new Date().toISOString(),
          relatedId: call.id,
          actionUrl: '/call-log'
        });
      });
      
      // Add voicemail notifications with contact information (excluding read ones)
      const contacts = await storage.getContacts();
      voicemails.forEach(voicemail => {
        const notificationId = `voicemail-${voicemail.id}`;
        
        // Skip if this notification has been marked as read
        if (readNotifications.has(notificationId)) {
          return;
        }
        
        if (voicemail.call) {
          // Find matching contact by phone number
          const contact = contacts.find(c => 
            c.phoneNumber === voicemail.call?.from || 
            c.mobileNumber === voicemail.call?.from ||
            c.workNumber === voicemail.call?.from
          );
          
          const displayName = contact ? 
            `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.displayName : 
            voicemail.call?.callerName || 'Unknown Caller';
          
          const duration = Math.floor(Math.random() * 180) + 30; // 30-210 seconds
          notifications.push({
            id: notificationId,
            type: 'voicemail',
            phoneNumber: voicemail.call.from,
            displayName,
            title: 'New Voicemail',
            message: `${displayName} left a voicemail (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`,
            isRead: false,
            priority: 'medium',
            createdAt: voicemail.createdAt || new Date().toISOString(),
            relatedId: voicemail.id,
            actionUrl: '/voicemail'
          });
        }
      });
      
      // Add system notifications
      if (calls.length > 5) {
        notifications.push({
          id: 'system-high-volume',
          type: 'alert',
          title: 'High Call Volume',
          message: `${calls.length} calls received today. Consider reviewing capacity.`,
          isRead: false,
          priority: 'urgent',
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          actionUrl: '/analytics/calls'
        });
      }
      
      notifications.push({
        id: 'system-ai-training',
        type: 'system',
        title: 'AI Training Complete',
        message: 'Customer service agent training completed successfully',
        isRead: true,
        priority: 'low',
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        actionUrl: '/ai-agents'
      });
      
      // Sort by creation date (newest first)
      notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/count', async (req, res) => {
    try {
      const notifications = await storage.getNotifications();
      const unreadCount = notifications.filter(n => !n.isRead).length;
      res.json(unreadCount);
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ message: "Failed to fetch notification count" });
    }
  });

  app.patch('/api/notifications/:id/read', async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await storage.updateNotification(notificationId, { isRead: true });
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch('/api/notifications/mark-all-read', async (req, res) => {
    try {
      const notifications = await storage.getNotifications();
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      await Promise.all(
        unreadNotifications.map(n => 
          storage.updateNotification(n.id, { isRead: true })
        )
      );
      
      res.json({ message: "All notifications marked as read", count: unreadNotifications.length });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete('/api/notifications/:id', async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await storage.deleteNotification(notificationId);
      res.json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  app.delete('/api/notifications/clear-all', async (req, res) => {
    try {
      const notifications = await storage.getNotifications();
      await Promise.all(
        notifications.map(n => storage.deleteNotification(n.id))
      );
      res.json({ message: "All notifications cleared", count: notifications.length });
    } catch (error) {
      console.error("Error clearing all notifications:", error);
      res.status(500).json({ message: "Failed to clear all notifications" });
    }
  });

  // Profile endpoints
  app.get('/api/profile', async (req, res) => {
    try {
      const profile = {
        id: "admin@aicallagent.com",
        email: "admin@aicallagent.com",
        firstName: "Admin",
        lastName: "User",
        phone: "+1 (555) 123-4567",
        role: "Administrator",
        department: "IT Operations",
        timezone: "America/New_York",
        lastLogin: new Date().toISOString(),
        createdAt: "2024-01-01T00:00:00.000Z"
      };
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.patch('/api/profile', async (req, res) => {
    try {
      const updates = req.body;
      // In a real app, you'd update the user in the database
      res.json({ message: "Profile updated successfully", updates });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get('/api/profile/notifications', async (req, res) => {
    try {
      const settings = {
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        callAlerts: true,
        voicemailAlerts: true,
        systemAlerts: true,
        quietHours: {
          enabled: false,
          start: "22:00",
          end: "08:00"
        }
      };
      res.json(settings);
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      res.status(500).json({ message: "Failed to fetch notification settings" });
    }
  });

  app.patch('/api/profile/notifications', async (req, res) => {
    try {
      const settings = req.body;
      // In a real app, you'd update the settings in the database
      res.json({ message: "Notification settings updated", settings });
    } catch (error) {
      console.error("Error updating notification settings:", error);
      res.status(500).json({ message: "Failed to update notification settings" });
    }
  });

  // Proxy endpoint for voicemail audio
  app.get("/api/voicemails/:id/audio", async (req, res) => {
    try {
      const voicemailId = parseInt(req.params.id);
      const voicemails = await storage.getVoicemails();
      const voicemail = voicemails.find(v => v.id === voicemailId);
      
      if (!voicemail) {
        return res.status(404).json({ message: "Voicemail not found" });
      }

      const recordingUrl = voicemail.recordingUrl;
      console.log(`Serving audio for voicemail ${voicemailId}: ${recordingUrl}`);
      
      // For test MP3 files, create a working audio stream
      if (recordingUrl.includes('test_') && recordingUrl.endsWith('.mp3')) {
        // Generate a simple tone as a demo audio file
        const sampleRate = 44100;
        const duration = voicemail.call?.duration || 30;
        const frequency = 440; // A4 note
        
        // Create WAV file header
        const headerSize = 44;
        const dataSize = sampleRate * duration * 2; // 16-bit mono
        const fileSize = headerSize + dataSize;
        
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Length', fileSize.toString());
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        
        // WAV header
        const header = Buffer.alloc(44);
        header.write('RIFF', 0);
        header.writeUInt32LE(fileSize - 8, 4);
        header.write('WAVE', 8);
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16); // PCM format size
        header.writeUInt16LE(1, 20); // PCM format
        header.writeUInt16LE(1, 22); // Mono
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(sampleRate * 2, 28); // Byte rate
        header.writeUInt16LE(2, 32); // Block align
        header.writeUInt16LE(16, 34); // Bits per sample
        header.write('data', 36);
        header.writeUInt32LE(dataSize, 40);
        
        res.write(header);
        
        // Generate simple audio tone
        for (let i = 0; i < sampleRate * duration; i++) {
          const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
          const intSample = Math.floor(sample * 32767);
          const buffer = Buffer.alloc(2);
          buffer.writeInt16LE(intSample, 0);
          res.write(buffer);
        }
        
        res.end();
        return;
      }
      
      // For actual Twilio URLs, proxy with authentication
      if (recordingUrl.includes('twilio.com')) {
        const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        
        if (!twilioAccountSid || !twilioAuthToken) {
          return res.status(500).json({ message: "Twilio credentials not configured" });
        }
        
        const authString = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
        
        try {
          const response = await fetch(recordingUrl, {
            headers: {
              'Authorization': `Basic ${authString}`
            }
          });
          
          if (!response.ok) {
            console.error(`Twilio API error: ${response.status} ${response.statusText}`);
            return res.status(response.status).json({ message: `Twilio API error: ${response.status}` });
          }
          
          const contentType = response.headers.get('content-type') || 'audio/wav';
          const contentLength = response.headers.get('content-length');
          
          res.setHeader('Content-Type', contentType);
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          
          if (contentLength) {
            res.setHeader('Content-Length', contentLength);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          res.send(Buffer.from(arrayBuffer));
        } catch (error) {
          console.error("Error fetching Twilio recording:", error);
          res.status(500).json({ message: "Failed to fetch recording from Twilio" });
        }
      } else {
        // For other URLs, attempt direct proxy
        try {
          const response = await fetch(recordingUrl);
          if (!response.ok) {
            console.error(`Direct fetch error: ${response.status} ${response.statusText}`);
            return res.status(response.status).json({ message: `Failed to fetch recording: ${response.status}` });
          }
          
          const contentType = response.headers.get('content-type') || 'audio/mpeg';
          const contentLength = response.headers.get('content-length');
          
          res.setHeader('Content-Type', contentType);
          res.setHeader('Accept-Ranges', 'bytes');
          
          if (contentLength) {
            res.setHeader('Content-Length', contentLength);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          res.send(Buffer.from(arrayBuffer));
        } catch (error) {
          console.error("Error fetching recording:", error);
          res.status(500).json({ message: "Failed to fetch recording" });
        }
      }
    } catch (error) {
      console.error("Error serving voicemail audio:", error);
      res.status(500).json({ message: "Failed to serve audio" });
    }
  });

  // Create missing voicemail entries for calls with recordings
  app.post('/api/voicemails/migrate', async (req, res) => {
    try {
      const calls = await storage.getRecentCalls(100); // Get more calls to check
      const existingVoicemails = await storage.getVoicemails();
      const existingCallIds = new Set(existingVoicemails.map(v => v.callId));
      
      let created = 0;
      for (const call of calls) {
        if (call.recordingUrl && !existingCallIds.has(call.id)) {
          try {
            await storage.createVoicemail({
              callId: call.id,
              recordingUrl: call.recordingUrl,
              transcription: call.transcription,
              summary: call.summary,
              processed: call.transcription ? true : false
            });
            created++;
          } catch (createError) {
            console.error(`Failed to create voicemail for call ${call.id}:`, createError);
          }
        }
      }
      
      res.json({ 
        message: `Migration completed. Created ${created} voicemail entries.`,
        created 
      });
    } catch (error) {
      console.error("Error migrating voicemails:", error);
      res.status(500).json({ message: "Failed to migrate voicemails" });
    }
  });

  // Transcribe voicemail
  app.post("/api/calls/:id/transcribe", async (req, res) => {
    try {
      const callId = parseInt(req.params.id);
      const call = await storage.getCall(callId);
      
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }
      
      if (!call.recordingUrl) {
        return res.status(400).json({ message: "No recording available for transcription" });
      }
      
      if (call.transcription) {
        return res.status(200).json({ message: "Call already transcribed", transcription: call.transcription });
      }
      
      // Use OpenAI to transcribe the audio
      const { transcribeAudio } = await import("./openai");
      const transcription = await transcribeAudio(call.recordingUrl);
      
      // Update call with transcription
      await storage.updateCall(callId, { transcription });
      
      res.json({ message: "Transcription completed", transcription });
    } catch (error) {
      console.error("Error transcribing voicemail:", error);
      res.status(500).json({ message: "Failed to transcribe voicemail" });
    }
  });

  app.get('/api/ai-config', async (req, res) => {
    try {
      const config = await storage.getAiConfig();
      if (!config) {
        return res.status(404).json({ message: "AI configuration not found" });
      }
      res.json(config);
    } catch (error) {
      console.error("Error fetching AI config:", error);
      res.status(500).json({ message: "Failed to fetch AI configuration" });
    }
  });

  app.put('/api/ai-config', async (req, res) => {
    try {
      console.log("AI Config PUT request body:", req.body);
      // Simple validation for now - the config is stored in organizations table
      const configData = req.body;
      console.log("Config data:", configData);
      const updatedConfig = await storage.upsertAiConfig(configData);
      
      // Broadcast config update to all clients
      broadcast({ type: 'ai-config-updated', data: updatedConfig });
      
      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating AI config:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
      res.status(500).json({ 
        message: "Failed to update AI configuration", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.get('/api/voice-providers/status', async (req, res) => {
    try {
      const { voiceProviderManager } = await import("./services/voice-provider");
      const status = await voiceProviderManager.getProviderStatus();
      const providers = voiceProviderManager.getAvailableProviders();
      
      const providerDetails = providers.map(name => ({
        name,
        available: status[name] || false,
        displayName: {
          twilio: "Twilio",
          openai_realtime: "OpenAI Realtime",
          elevenlabs: "ElevenLabs",
          cartesia: "Cartesia",
          nvidia_personaplex: "NVIDIA PersonaPlex",
        }[name] || name,
        description: {
          twilio: "Basic TTS via Twilio (always available as fallback)",
          openai_realtime: "OpenAI Text-to-Speech with multiple voice options",
          elevenlabs: "High-quality neural voice synthesis",
          cartesia: "Ultra-low latency voice synthesis",
          nvidia_personaplex: "Full-duplex speech-to-speech AI with persona control (~170ms latency)",
        }[name] || "",
        features: {
          twilio: ["fallback"],
          openai_realtime: ["tts", "multiple-voices"],
          elevenlabs: ["tts", "voice-cloning", "emotional"],
          cartesia: ["tts", "low-latency"],
          nvidia_personaplex: ["tts", "full-duplex", "persona-control", "voice-cloning", "interruption-handling", "backchannels"],
        }[name] || [],
      }));
      
      res.json({ providers: providerDetails });
    } catch (error) {
      console.error("Error fetching voice provider status:", error);
      res.status(500).json({ message: "Failed to fetch voice provider status" });
    }
  });

  app.get('/api/voice-providers/personaplex/voices', async (req, res) => {
    try {
      const { PERSONAPLEX_VOICES } = await import("./services/voice-provider");
      res.json({ voices: Object.values(PERSONAPLEX_VOICES) });
    } catch (error) {
      console.error("Error fetching PersonaPlex voices:", error);
      res.status(500).json({ message: "Failed to fetch PersonaPlex voices" });
    }
  });

  app.post('/api/voice-providers/personaplex/session', requireAuth, async (req, res) => {
    try {
      const { voiceProviderManager, PERSONAPLEX_VOICES } = await import("./services/voice-provider");
      const { voice, persona, fullDuplex } = req.body;
      
      if (!voice || !persona) {
        return res.status(400).json({ message: "voice and persona are required" });
      }

      const validVoiceIds = Object.keys(PERSONAPLEX_VOICES);
      if (!validVoiceIds.includes(voice)) {
        return res.status(400).json({ 
          message: `Invalid voice ID. Must be one of: ${validVoiceIds.join(", ")}` 
        });
      }
      
      const session = await voiceProviderManager.createPersonaPlexSession({
        voice,
        persona,
        fullDuplex: fullDuplex ?? true,
      });
      
      res.json(session);
    } catch (error) {
      console.error("Error creating PersonaPlex session:", error);
      res.status(500).json({ 
        message: "Failed to create PersonaPlex session",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get('/api/call-routes', async (req, res) => {
    try {
      const routes = await storage.getCallRoutes();
      res.json(routes);
    } catch (error) {
      console.error("Error fetching call routes:", error);
      res.status(500).json({ message: "Failed to fetch call routes" });
    }
  });

  app.put('/api/call-routes', async (req, res) => {
    try {
      // Extract routes from the request - frontend sends {routes: [...]}
      const routes = req.body.routes;
      
      if (!routes || !Array.isArray(routes)) {
        return res.status(400).json({ 
          message: "Expected routes to be an array"
        });
      }

      // Update each route, mapping frontend fields to backend fields
      const updatedRoutes = [];
      for (const route of routes) {
        const routeData = {
          name: route.name || "",
          keywords: route.keywords || [],
          forwardTo: route.transferTo || route.forwardTo || "",
          priority: route.priority || 1,
          active: route.isActive !== undefined ? route.isActive : (route.active !== undefined ? route.active : true),
          businessHours: route.businessHours
        };

        if (route.id && route.id > 0) {
          // Update existing route
          const updated = await storage.updateCallRoute(route.id, routeData);
          updatedRoutes.push(updated);
        } else {
          // Create new route
          const created = await storage.createCallRoute(routeData);
          updatedRoutes.push(created);
        }
      }

      res.json(updatedRoutes);
    } catch (error) {
      console.error("Error updating call routes:", error);
      res.status(500).json({ 
        message: "Failed to update call routes", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.get('/api/notifications/status', async (req, res) => {
    try {
      const status = await getNotificationStatus();
      res.json(status);
    } catch (error) {
      console.error("Error fetching notification status:", error);
      res.status(500).json({ message: "Failed to fetch notification status" });
    }
  });

  app.post('/api/notifications/test/:type', async (req, res) => {
    try {
      const type = req.params.type as "sms" | "email" | "whatsapp" | "telegram";
      const success = await testNotification(type);
      
      res.json({ success, message: success ? "Test notification sent" : "Test notification failed" });
    } catch (error) {
      console.error("Error testing notification:", error);
      res.status(500).json({ message: "Failed to test notification" });
    }
  });

  // Test AI integration
  app.post('/api/ai/test', async (req, res) => {
    try {
      const { text } = req.body;
      const testText = text || "Hello, this is a test message for AI analysis.";
      
      const { analyzeCallIntent, summarizeCall } = await import('./openai');
      
      const analysis = await analyzeCallIntent(testText);
      const summary = await summarizeCall(testText, "Test Caller");
      
      res.json({
        success: true,
        analysis,
        summary,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('AI test error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'AI test failed', 
        error: (error as Error).message 
      });
    }
  });

  // Test Twilio call
  app.post('/api/twilio/test-call', async (req, res) => {
    try {
      const { to } = req.body;
      
      if (!to) {
        return res.status(400).json({ message: 'Phone number is required' });
      }

      const { makeOutboundCall } = await import('./twilio');
      const callSid = await makeOutboundCall(to, "This is a test call from your AI assistant. The system is working correctly.");
      
      res.json({
        success: true,
        callSid,
        message: `Test call initiated to ${to}`
      });
    } catch (error) {
      console.error('Test call error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Test call failed', 
        error: (error as Error).message 
      });
    }
  });

  // AI Calling System Test Route
  app.post('/api/test-ai-calling', async (req, res) => {
    try {
      const { runAICallingTest, testAIAgentCapabilities } = await import('./ai-calling-test');
      
      const testResults = await runAICallingTest();
      const agentCapabilities = testAIAgentCapabilities();
      
      res.json({
        success: testResults.success,
        testResults,
        agentCapabilities,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('AI calling test error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'AI calling test failed', 
        error: (error as Error).message 
      });
    }
  });

  // Contact management routes
  app.get('/api/contacts', async (req, res) => {
    try {
      const contacts = await storage.getContacts();
      res.json(contacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      res.status(500).json({ message: 'Failed to fetch contacts' });
    }
  });

  // Contact duplicate detection routes
  app.get('/api/contacts/duplicates', async (req, res) => {
    try {
      const { contactDuplicateDetectionService } = await import('./contact-duplicate-detection');
      const contacts = await storage.getContacts();
      
      // Filter out contacts with missing data for better duplicate detection
      const validContacts = contacts.filter(contact => 
        contact.firstName || contact.lastName || contact.displayName || contact.email || contact.phoneNumbers
      );
      
      const duplicates = await contactDuplicateDetectionService.findDuplicates(validContacts);
      res.json(duplicates);
    } catch (error) {
      console.error('Error finding duplicates:', error);
      res.status(500).json({ message: 'Failed to find duplicate contacts' });
    }
  });

  app.post('/api/contacts/merge', async (req, res) => {
    try {
      const { contact1Id, contact2Id, mergedData } = req.body;
      const { contactDuplicateDetectionService } = await import('./contact-duplicate-detection');
      
      const contact1 = await storage.getContact(contact1Id);
      const contact2 = await storage.getContact(contact2Id);
      
      if (!contact1 || !contact2) {
        return res.status(404).json({ message: 'One or both contacts not found' });
      }

      // Merge contacts using AI service
      const mergedContact = await contactDuplicateDetectionService.mergeContacts(contact1, contact2, mergedData);
      
      // Update the first contact with merged data
      const updatedContact = await storage.updateContact(contact1.id, mergedContact);
      
      // Delete the second contact
      await storage.deleteContact(contact2.id);
      
      res.json({
        success: true,
        mergedContact: updatedContact,
        message: 'Contacts merged successfully'
      });
    } catch (error) {
      console.error('Error merging contacts:', error);
      res.status(500).json({ message: 'Failed to merge contacts' });
    }
  });

  app.get('/api/contacts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contact = await storage.getContactWithPhoneNumbers(id);
      if (!contact) {
        return res.status(404).json({ message: 'Contact not found' });
      }
      res.json(contact);
    } catch (error) {
      console.error('Error fetching contact:', error);
      res.status(500).json({ message: 'Failed to fetch contact' });
    }
  });

  app.get('/api/contacts/:id/calls', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const calls = await storage.getContactCalls(id);
      res.json(calls);
    } catch (error) {
      console.error('Error fetching contact calls:', error);
      res.status(500).json({ message: 'Failed to fetch contact calls' });
    }
  });

  app.get('/api/contacts/:id/voicemails', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const voicemails = await storage.getContactVoicemails(id);
      res.json(voicemails);
    } catch (error) {
      console.error('Error fetching contact voicemails:', error);
      res.status(500).json({ message: 'Failed to fetch contact voicemails' });
    }
  });

  app.post('/api/contacts/:id/phone-numbers', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const phoneNumber = await storage.addContactPhoneNumber(id, req.body);
      res.json(phoneNumber);
    } catch (error) {
      console.error('Error adding phone number:', error);
      res.status(500).json({ message: 'Failed to add phone number' });
    }
  });

  app.delete('/api/contacts/:id/phone-numbers/:phoneId', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const phoneId = parseInt(req.params.phoneId);
      await storage.deleteContactPhoneNumber(id, phoneId);
      res.json({ message: 'Phone number deleted successfully' });
    } catch (error) {
      console.error('Error deleting phone number:', error);
      res.status(500).json({ message: 'Failed to delete phone number' });
    }
  });

  app.post('/api/contacts', async (req, res) => {
    try {
      const contact = await storage.createContact(req.body);
      res.json(contact);
    } catch (error) {
      console.error('Error creating contact:', error);
      res.status(500).json({ message: 'Failed to create contact' });
    }
  });

  app.put('/api/contacts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const contact = await storage.updateContact(id, req.body);
      res.json(contact);
    } catch (error) {
      console.error('Error updating contact:', error);
      res.status(500).json({ message: 'Failed to update contact' });
    }
  });

  app.delete('/api/contacts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteContact(id);
      res.json({ message: 'Contact deleted successfully' });
    } catch (error) {
      console.error('Error deleting contact:', error);
      res.status(500).json({ message: 'Failed to delete contact' });
    }
  });

  // Mobile contact sync routes
  app.post('/api/contacts/sync/mobile', async (req, res) => {
    try {
      const { contacts, source } = req.body;
      const organizationId = "100"; // Default organization
      
      if (!contacts || !Array.isArray(contacts)) {
        return res.status(400).json({ message: "Invalid contacts data" });
      }
      
      if (!source || !['ios', 'android'].includes(source)) {
        return res.status(400).json({ message: "Invalid source. Must be 'ios' or 'android'" });
      }

      const { mobileContactSyncService } = await import('./mobile-contact-sync');
      const result = await mobileContactSyncService.syncContactsFromMobile(
        contacts, 
        organizationId, 
        source
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error syncing mobile contacts:", error);
      res.status(500).json({ message: "Failed to sync mobile contacts" });
    }
  });

  app.get('/api/contacts/export/mobile/:format', async (req, res) => {
    try {
      const organizationId = "100"; // Default organization
      const format = req.params.format;
      
      if (!['ios', 'android', 'vcard'].includes(format)) {
        return res.status(400).json({ message: "Invalid format. Must be 'ios', 'android', or 'vcard'" });
      }

      const { mobileContactSyncService } = await import('./mobile-contact-sync');
      
      if (format === 'vcard') {
        const contacts = await mobileContactSyncService.exportContactsToMobile(organizationId, 'ios');
        const vcards = contacts.map(contact => mobileContactSyncService.generateVCard(contact));
        
        res.setHeader('Content-Type', 'text/vcard');
        res.setHeader('Content-Disposition', 'attachment; filename="contacts.vcf"');
        res.send(vcards.join('\n'));
      } else {
        const contacts = await mobileContactSyncService.exportContactsToMobile(organizationId, format as 'ios' | 'android');
        res.json({ contacts, format });
      }
    } catch (error) {
      console.error("Error exporting contacts:", error);
      res.status(500).json({ message: "Failed to export contacts" });
    }
  });

  // Contact favorites and tags management
  app.patch('/api/contacts/:id/favorite', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isFavorite } = req.body;
      
      await storage.updateContact(id, { isFavorite });
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating contact favorite:', error);
      res.status(500).json({ message: 'Failed to update contact favorite' });
    }
  });

  app.patch('/api/contacts/:id/tags', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { tags } = req.body;
      
      if (!Array.isArray(tags)) {
        return res.status(400).json({ message: "Tags must be an array" });
      }
      
      await storage.updateContact(id, { tags });
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating contact tags:', error);
      res.status(500).json({ message: 'Failed to update contact tags' });
    }
  });

  app.patch('/api/contacts/:id/groups', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { groups } = req.body;
      
      if (!Array.isArray(groups)) {
        return res.status(400).json({ message: "Groups must be an array" });
      }
      
      await storage.updateContact(id, { groups });
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating contact groups:', error);
      res.status(500).json({ message: 'Failed to update contact groups' });
    }
  });

  // Contact synchronization from mobile devices
  app.post('/api/contacts/sync', async (req, res) => {
    try {
      const { deviceId, deviceType, deviceName, contacts } = req.body;
      
      // Register or update device
      let deviceSync = await storage.getDeviceSync(deviceId);
      if (!deviceSync) {
        deviceSync = await storage.createDeviceSync({
          deviceId,
          deviceType,
          deviceName,
          syncStatus: 'pending'
        });
      }

      // Sync contacts
      const syncedContacts = await storage.syncContacts(deviceId, contacts);
      
      res.json({
        success: true,
        syncedContacts: syncedContacts.length,
        deviceSync
      });
    } catch (error) {
      console.error('Error syncing contacts:', error);
      res.status(500).json({ message: 'Failed to sync contacts' });
    }
  });

  // AI Agents management endpoints
  app.get('/api/agents/status', async (req, res) => {
    try {
      const { agentRouter } = await import('./ai-agents');
      const agents = [
        { id: 'personal-assistant', name: 'Personal Assistant', status: 'active', description: 'Handles initial contact and routing' },
        { id: 'sales-agent', name: 'Sales Agent', status: 'active', description: 'Manages sales inquiries and pricing' },
        { id: 'support-agent', name: 'Support Agent', status: 'active', description: 'Provides technical support and troubleshooting' },
        { id: 'voicemail-agent', name: 'Voicemail Agent', status: 'active', description: 'Captures detailed messages for follow-up' }
      ];
      res.json({ agents, activeConnections: 0 });
    } catch (error) {
      console.error('Error fetching agent status:', error);
      res.status(500).json({ message: 'Failed to fetch agent status' });
    }
  });

  app.get('/api/agents/conversations/:callSid', async (req, res) => {
    try {
      const { agentRouter } = await import('./ai-agents');
      const context = agentRouter.getContext(req.params.callSid);
      if (!context) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      res.json(context);
    } catch (error) {
      console.error('Error fetching conversation context:', error);
      res.status(500).json({ message: 'Failed to fetch conversation context' });
    }
  });

  app.post('/api/agents/test-routing', async (req, res) => {
    try {
      const { agentRouter } = await import('./ai-agents');
      const { callerNumber, userInput } = req.body;
      
      const testCallSid = 'TEST_' + Date.now();
      const result = await agentRouter.processCall(testCallSid, callerNumber || '+15551234567', userInput);
      
      agentRouter.endCall(testCallSid);
      
      res.json(result);
    } catch (error) {
      console.error('Error testing agent routing:', error);
      res.status(500).json({ message: 'Failed to test agent routing' });
    }
  });

  // Call Transfer API routes
  app.post('/api/calls/transfer', async (req, res) => {
    try {
      const { callSid, transferTo, transferType, reason } = req.body;
      
      if (!callSid || !transferTo) {
        return res.status(400).json({ message: 'callSid and transferTo are required' });
      }

      let twimlResponse = '';
      const transferRequest = {
        callSid,
        transferTo,
        transferType: transferType || 'cold',
        reason,
        transferredBy: 'system'
      };

      switch (transferType) {
        case 'warm':
          twimlResponse = warmTransfer(transferRequest);
          break;
        case 'conference':
          twimlResponse = conferenceTransfer(transferRequest);
          break;
        default:
          twimlResponse = coldTransfer(transferRequest);
      }

      res.type('text/xml').send(twimlResponse);
    } catch (error) {
      console.error('Error transferring call:', error);
      res.status(500).json({ message: 'Failed to transfer call' });
    }
  });

  app.post('/api/calls/forward', async (req, res) => {
    try {
      const { from, to } = req.body;
      
      if (!from || !to) {
        return res.status(400).json({ message: 'from and to numbers are required' });
      }

      const twimlResponse = autoForward(from, to);
      
      if (twimlResponse) {
        res.type('text/xml').send(twimlResponse);
      } else {
        res.status(400).json({ message: 'Call forwarding not applicable' });
      }
    } catch (error) {
      console.error('Error forwarding call:', error);
      res.status(500).json({ message: 'Failed to forward call' });
    }
  });

  // Agent Training endpoints
  app.get('/api/agents/training/:agentId', async (req, res) => {
    try {
      const { agentTrainingManager } = await import('./agent-training');
      const trainingData = agentTrainingManager.getTrainingData(req.params.agentId);
      if (!trainingData) {
        return res.status(404).json({ message: 'Training data not found' });
      }
      res.json(trainingData);
    } catch (error) {
      console.error('Error fetching training data:', error);
      res.status(500).json({ message: 'Failed to fetch training data' });
    }
  });

  app.post('/api/agents/training/:agentId/scenarios', async (req, res) => {
    try {
      const { agentTrainingManager } = await import('./agent-training');
      const { topic, count } = req.body;
      const scenarios = await agentTrainingManager.generateTrainingScenarios(req.params.agentId, topic, count);
      res.json({ scenarios });
    } catch (error) {
      console.error('Error generating training scenarios:', error);
      res.status(500).json({ message: 'Failed to generate training scenarios' });
    }
  });

  app.post('/api/agents/training/:agentId/evaluate', async (req, res) => {
    try {
      const { agentTrainingManager } = await import('./agent-training');
      const { scenario } = req.body;
      const evaluation = await agentTrainingManager.trainAgent(req.params.agentId, scenario);
      res.json(evaluation);
    } catch (error) {
      console.error('Error evaluating training scenario:', error);
      res.status(500).json({ message: 'Failed to evaluate training scenario' });
    }
  });

  app.get('/api/agents/training', async (req, res) => {
    try {
      const { agentTrainingManager } = await import('./agent-training');
      const allTrainingData = agentTrainingManager.getAllAgentTrainingData();
      res.json(allTrainingData);
    } catch (error) {
      console.error('Error fetching all training data:', error);
      res.status(500).json({ message: 'Failed to fetch training data' });
    }
  });

  // Contact route management
  app.get('/api/contact-routes', async (req, res) => {
    try {
      const routes = await storage.getContactRoutes();
      res.json(routes);
    } catch (error) {
      console.error('Error fetching contact routes:', error);
      res.status(500).json({ message: 'Failed to fetch contact routes' });
    }
  });

  app.post('/api/contact-routes', async (req, res) => {
    try {
      const route = await storage.createContactRoute(req.body);
      res.json(route);
    } catch (error) {
      console.error('Error creating contact route:', error);
      res.status(500).json({ message: 'Failed to create contact route' });
    }
  });

  // Get routing rules for specific phone number
  app.get('/api/contact-routes/phone/:phoneNumber', async (req, res) => {
    try {
      const phoneNumber = decodeURIComponent(req.params.phoneNumber);
      const routes = await storage.getContactRoutesForPhone(phoneNumber);
      const contact = await storage.getContactByPhone(phoneNumber);
      
      res.json({
        contact,
        routes,
        isKnownContact: !!contact
      });
    } catch (error) {
      console.error('Error fetching contact routes for phone:', error);
      res.status(500).json({ message: 'Failed to fetch contact routes' });
    }
  });

  // Test endpoint for simulating live calls
  app.post('/api/test/simulate-call', async (req, res) => {
    try {
      const { callerNumber, callerName } = req.body;
      const testCallSid = `TEST_${Date.now()}`;
      
      // Simulate incoming call
      broadcast({
        type: 'call_started',
        call: {
          callSid: testCallSid,
          from: callerNumber || '+15551234567',
          to: '+17274362999',
          callerName: callerName || 'Test Caller',
          status: 'ringing',
          startTime: new Date().toISOString()
        }
      });

      // Simulate conversation turns after a short delay
      setTimeout(() => {
        // First turn - caller speaks
        broadcast({
          type: 'conversation_turn',
          callSid: testCallSid,
          turn: {
            speaker: 'caller',
            speakerName: callerName || 'Test Caller',
            message: 'Hi, I\'m calling about my account. Can you help me?',
            timestamp: new Date().toISOString(),
            confidence: 0.95,
            sentiment: 'neutral'
          }
        });
      }, 2000);

      setTimeout(() => {
        // Second turn - AI responds
        broadcast({
          type: 'conversation_turn',
          callSid: testCallSid,
          turn: {
            speaker: 'ai',
            speakerName: 'Maya',
            message: 'Hello! I\'d be happy to help you with your account. Can you please provide your account number or the phone number associated with your account?',
            timestamp: new Date().toISOString(),
            confidence: 1.0,
            sentiment: 'positive'
          }
        });
      }, 4000);

      setTimeout(() => {
        // Third turn - caller responds
        broadcast({
          type: 'conversation_turn',
          callSid: testCallSid,
          turn: {
            speaker: 'caller',
            speakerName: callerName || 'Test Caller',
            message: 'Sure, my account number is 12345. I need to update my billing information.',
            timestamp: new Date().toISOString(),
            confidence: 0.92,
            sentiment: 'neutral'
          }
        });
      }, 7000);

      setTimeout(() => {
        // Final turn - AI transfers to human
        broadcast({
          type: 'conversation_turn',
          callSid: testCallSid,
          turn: {
            speaker: 'ai',
            speakerName: 'Maya',
            message: 'I can help you with that. Let me transfer you to our billing specialist who can assist with updating your information. Please hold for just a moment.',
            timestamp: new Date().toISOString(),
            confidence: 1.0,
            sentiment: 'positive'
          }
        });
      }, 9000);

      setTimeout(() => {
        // Call completed
        broadcast({
          type: 'call_completed',
          callSid: testCallSid,
          summary: {
            duration: 120,
            outcome: 'transferred_to_human',
            sentiment: 'positive',
            resolved: true
          }
        });
      }, 12000);

      res.json({ 
        success: true, 
        testCallSid,
        message: 'Call simulation started' 
      });
    } catch (error) {
      console.error('Error simulating call:', error);
      res.status(500).json({ message: 'Failed to simulate call' });
    }
  });



  // Main Twilio incoming call webhook
  app.post('/api/twilio/incoming', async (req, res) => {
    try {
      const webhookData: CallWebhookData = req.body;
      const twiml = await handleIncomingCall(webhookData);
      
      // Broadcast call started event with enhanced data
      broadcast({
        type: 'call_started',
        call: {
          callSid: webhookData.CallSid,
          from: webhookData.From,
          to: webhookData.To,
          callerName: webhookData.CallerName || null,
          status: 'in-progress',
          startTime: new Date().toISOString()
        }
      });
      
      res.type('text/xml');
      res.send(twiml);
    } catch (error) {
      console.error("Error handling Twilio incoming webhook:", error);
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>We're experiencing technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`);
    }
  });

  app.post('/api/twilio/gather', async (req, res) => {
    try {
      const webhookData = req.body;
      const twiml = await handleCallGather(webhookData);
      res.type('text/xml');
      res.send(twiml);
    } catch (error) {
      console.error("Error handling Twilio gather webhook:", error);
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>I'm having trouble processing your request. Let me transfer you to voicemail where you can leave a detailed message.</Say>
  <Redirect>/api/twilio/voicemail</Redirect>
</Response>`);
    }
  });

  // Map AI-returned transfer intent name to an actual phone number.
  // Personal line urgency → NIRAV_MOBILE (owner). Business intents → dept numbers.
  function resolveTransferNumber(name: string | undefined, isPersonalLine: boolean): string | null {
    const env = process.env;
    const map: Record<string, string | undefined> = {
      sales:   env.SALES_PHONE,
      support: env.SUPPORT_PHONE,
      billing: env.SUPPORT_PHONE,     // billing falls to support queue until separate
      urgent:  env.NIRAV_MOBILE || env.NOTIFICATION_PHONE,
      owner:   env.NIRAV_MOBILE || env.NOTIFICATION_PHONE,
      general: isPersonalLine ? (env.NIRAV_MOBILE || env.NOTIFICATION_PHONE) : env.SUPPORT_PHONE,
    };
    return map[(name || 'general').toLowerCase()] || null;
  }

  // Notify owner of a call event via SendGrid email (primary, instant)
  // AND Twilio SMS (secondary, blocked by US carriers until A2P 10DLC
  // registration clears — Twilio error 30034). Both fire in parallel;
  // either arriving counts. Falls back gracefully if SendGrid/Twilio
  // aren't configured.
  async function notifyOwnerSMS(params: {
    from: string;
    callerInput: string;
    intent?: string;
    action: string;
  }): Promise<string | null> {
    const env = process.env;
    const subject = `Annie call — ${params.intent || 'unknown'} — ${params.from}`;
    const plain = [
      'Incoming call handled by Annie',
      '',
      `From: ${params.from}`,
      `Intent: ${params.intent || 'unknown'}`,
      `Action: ${params.action}`,
      '',
      'Caller said:',
      `"${(params.callerInput || '').slice(0, 500)}"`,
      '',
      '— ai-call-assistant',
    ].join('\n');

    // 1. SendGrid email (instant, no carrier blocks)
    void (async () => {
      const key = env.SENDGRID_API_KEY;
      const from = env.FROM_EMAIL;
      const to = env.NIRAV_EMAIL || env.ADMIN_EMAIL || 'info@rapidrms.com';
      if (!key || !from) return;
      try {
        const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: from, name: 'Annie (AI Assistant)' },
            subject,
            content: [{ type: 'text/plain', value: plain }],
          }),
        });
        if (!r.ok) console.error('SendGrid notifyOwner failed:', r.status, await r.text());
      } catch (e) {
        console.error('SendGrid notifyOwner exception:', e);
      }
    })();

    // 2. Twilio SMS (blocked until A2P 10DLC registered — error 30034)
    const sid = env.TWILIO_ACCOUNT_SID;
    const auth = env.TWILIO_AUTH_TOKEN;
    const msgSvc = env.TWILIO_MESSAGING_SERVICE_SID;
    const smsTo = env.NIRAV_MOBILE || env.NOTIFICATION_PHONE;
    if (!sid || !auth || !msgSvc || !smsTo) return null;
    try {
      const basic = Buffer.from(sid + ':' + auth).toString('base64');
      const body = new URLSearchParams({
        MessagingServiceSid: msgSvc,
        To: smsTo,
        Body: `Annie call from ${params.from} — ${params.intent || '?'} → ${params.action}. "${(params.callerInput || '').slice(0, 140)}"`,
      });
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + basic, 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const j: any = await r.json();
      return j.sid || null;
    } catch (e) {
      console.error('notifyOwnerSMS failed:', e);
      return null;
    }
  }

  // NEW: conversation endpoint for the ReceptionistAIService flow
  // (Triggered by the <Gather> in twilio.ts handleIncomingCall's
  // modern path. Different from /api/twilio/gather which is the
  // legacy DTMF-menu handler.)
  app.post('/api/twilio/call-gather', async (req, res) => {
    try {
      const { CallSid, SpeechResult, Digits, From, To } = req.body;
      const callerInput = (SpeechResult || Digits || '').trim();

      const { receptionistAI } = await import('./services/ReceptionistAIService');
      const twilioLib = (await import('twilio')).default;
      const VoiceResponse = twilioLib.twiml.VoiceResponse;
      const twiml = new VoiceResponse();
      const isPersonalLine = To === '+17274362999';

      if (!callerInput) {
        twiml.say({ voice: 'Polly.Joanna-Neural' }, "I didn't hear anything. Let me transfer you to voicemail so you can leave a message.");
        twiml.redirect('/api/twilio/voicemail');
        res.type('text/xml');
        return res.send(twiml.toString());
      }

      const aiResponse = await receptionistAI.processCallerInput(CallSid, callerInput);

      twiml.say({ voice: 'Polly.Joanna-Neural' }, aiResponse.text);

      if (aiResponse.action === 'continue') {
        twiml.gather({
          input: ['speech'],
          speechTimeout: 'auto',
          speechModel: 'phone_call',
          enhanced: true,
          action: '/api/twilio/call-gather',
          method: 'POST',
        });
        twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Are you still there?');
        twiml.redirect('/api/twilio/call-gather');
      } else if (aiResponse.action === 'transfer') {
        const target = resolveTransferNumber(aiResponse.transferTo, isPersonalLine);
        if (target) {
          twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Please hold while I connect you.');
          twiml.dial(target);
          // Fire-and-forget SMS so owner knows the call routed
          notifyOwnerSMS({ from: From, callerInput, intent: aiResponse.transferTo, action: `transferred to ${target}` })
            .catch(() => {});
        } else {
          twiml.say({ voice: 'Polly.Joanna-Neural' }, "Let me take a message instead.");
          twiml.redirect('/api/twilio/voicemail');
          notifyOwnerSMS({ from: From, callerInput, intent: aiResponse.transferTo, action: 'transfer requested but no number — went to voicemail' })
            .catch(() => {});
        }
      } else if (aiResponse.action === 'collect_message') {
        twiml.redirect('/api/twilio/voicemail');
        notifyOwnerSMS({ from: From, callerInput, intent: 'message', action: 'leaving voicemail' })
          .catch(() => {});
      } else {
        twiml.hangup();
        notifyOwnerSMS({ from: From, callerInput, intent: 'ended', action: 'call ended by Annie' })
          .catch(() => {});
      }

      res.type('text/xml');
      res.send(twiml.toString());
    } catch (error) {
      console.error('Error in /api/twilio/call-gather:', error);
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">I'm having trouble understanding. Let me transfer you to voicemail.</Say>
  <Redirect>/api/twilio/voicemail</Redirect>
</Response>`);
    }
  });

  app.post('/api/twilio/voicemail', async (req, res) => {
    try {
      const webhookData: CallWebhookData = req.body;
      const twiml = await handleVoicemail(webhookData);
      
      res.type('text/xml');
      res.send(twiml);
    } catch (error) {
      console.error("Error handling Twilio voicemail webhook:", error);
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling. Please try again later.</Say>
  <Hangup/>
</Response>`);
    }
  });

  app.post('/api/twilio/recording', async (req, res) => {
    try {
      const webhookData = req.body;
      const twiml = await handleRecording(webhookData);

      // Broadcast voicemail update to dashboard
      broadcast({ type: 'voicemail-received', data: webhookData });

      const callerNumber = webhookData.From || webhookData.Caller || 'Unknown';
      const duration = parseInt(webhookData.RecordingDuration || '0', 10);

      sendVoicemailPush(callerNumber, duration, webhookData.TranscriptionText).catch(err =>
        console.error('[Push] Voicemail notification failed:', err)
      );

      const { notifyNewVoicemail } = await import('./services/sms-alerts');
      notifyNewVoicemail(callerNumber, webhookData.TranscriptionText || `Voicemail (${duration}s) — no transcription available`).catch(() => {});
      
      res.type('text/xml');
      res.send(twiml);
    } catch (error) {
      console.error("Error handling Twilio recording webhook:", error);
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for your message. Goodbye!</Say>
  <Hangup/>
</Response>`);
    }
  });

  app.post('/api/twilio/dial-callback', async (req, res) => {
    try {
      const { CallSid, DialCallStatus, DialCallDuration } = req.body;
      console.log(`Dial callback: ${CallSid}, Status: ${DialCallStatus}, Duration: ${DialCallDuration}`);
      
      const twiml = new twilio.twiml.VoiceResponse();
      
      if (DialCallStatus === 'completed') {
        twiml.say({ 
          voice: 'alice',
          language: 'en-US'
        }, "Your call has been completed. Thank you for calling!");
        twiml.hangup();
      } else if (DialCallStatus === 'busy') {
        // Send missed call push (busy = still missed)
        const busyCaller = req.body.From || req.body.Caller || 'Unknown';
        sendMissedCallPush(busyCaller, req.body.To || '', CallSid).catch(err =>
          console.error('[Push] Busy call notification failed:', err)
        );

        twiml.say({
          voice: 'alice',
          language: 'en-US'
        }, "Our team is currently busy. Please leave a message and we'll call you back within 2 hours.");
        // Direct voicemail without redirect to avoid additional silence
        twiml.record({
          action: "/api/twilio/recording",
          method: "POST",
          maxLength: 180,
          finishOnKey: "#",
          transcribe: true,
          recordingStatusCallback: `/api/twilio/recording`,
          playBeep: true,
          timeout: 3
        });
        twiml.say({ 
          voice: 'alice',
          language: 'en-US'
        }, "Thank you for your message. We'll get back to you soon. Goodbye!");
        twiml.hangup();
      } else if (DialCallStatus === 'no-answer') {
        // Send missed call push notification to all devices
        const callerNumber = req.body.From || req.body.Caller || 'Unknown';
        const calledNumber = req.body.To || req.body.Called || '';
        // Lookup caller name from contacts (best effort)
        let callerName: string | undefined;
        try {
          const contacts = await storage.getContacts();
          const match = contacts.find((c: any) =>
            c.phoneNumbers?.some((p: any) => p.number === callerNumber || p.number?.replace(/\D/g, '') === callerNumber.replace(/\D/g, ''))
          );
          if (match) callerName = `${match.firstName || ''} ${match.lastName || ''}`.trim();
        } catch (_) { /* best effort */ }

        sendMissedCallPush(callerNumber, calledNumber, CallSid, callerName).catch(err =>
          console.error('[Push] Missed call notification failed:', err)
        );

        twiml.say({
          voice: 'alice',
          language: 'en-US'
        }, "Our team is currently unavailable. Please leave a message and we'll get back to you today.");
        // Direct voicemail without redirect
        twiml.record({
          action: "/api/twilio/recording",
          method: "POST",
          maxLength: 180,
          finishOnKey: "#",
          transcribe: true,
          recordingStatusCallback: `/api/twilio/recording`,
          playBeep: true,
          timeout: 3
        });
        twiml.say({ 
          voice: 'alice',
          language: 'en-US'
        }, "Thank you for your message. We'll get back to you soon. Goodbye!");
        twiml.hangup();
      } else if (DialCallStatus === 'failed') {
        twiml.say({ 
          voice: 'alice',
          language: 'en-US'
        }, "We're experiencing technical difficulties. Please leave a message or try calling back in a few minutes.");
        // Direct voicemail without redirect
        twiml.record({
          action: "/api/twilio/recording",
          method: "POST",
          maxLength: 180,
          finishOnKey: "#",
          transcribe: true,
          recordingStatusCallback: `/api/twilio/recording`,
          playBeep: true,
          timeout: 3
        });
        twiml.say({ 
          voice: 'alice',
          language: 'en-US'
        }, "Thank you for your message. We'll get back to you soon. Goodbye!");
        twiml.hangup();
      } else {
        twiml.say({ 
          voice: 'alice',
          language: 'en-US'
        }, "Unable to connect right now. Please leave a message and we'll contact you soon.");
        // Direct voicemail without redirect
        twiml.record({
          action: "/api/twilio/recording",
          method: "POST",
          maxLength: 180,
          finishOnKey: "#",
          transcribe: true,
          recordingStatusCallback: `/api/twilio/recording`,
          playBeep: true,
          timeout: 3
        });
        twiml.say({ 
          voice: 'alice',
          language: 'en-US'
        }, "Thank you for your message. We'll get back to you soon. Goodbye!");
        twiml.hangup();
      }
      
      res.type('text/xml');
      res.send(twiml.toString());
    } catch (error) {
      console.error("Error handling dial callback:", error);
      res.status(500).send("Error processing dial callback");
    }
  });

  app.post('/api/twilio/recording-status', async (req, res) => {
    try {
      const { CallSid, RecordingSid, RecordingStatus, RecordingUrl } = req.body;
      
      // Update call record with recording status
      const call = await storage.getCallBySid(CallSid);
      if (call && RecordingStatus === 'completed') {
        await storage.updateCall(call.id, {
          recordingUrl: RecordingUrl,
          status: 'completed'
        });
        
        // Broadcast recording completion
        broadcast({ 
          type: 'recording-completed', 
          data: { callId: call.id, recordingUrl: RecordingUrl } 
        });
      }
      
      res.sendStatus(200);
    } catch (error) {
      console.error("Error handling recording status:", error);
      res.status(500).send("Error processing recording status");
    }
  });

  app.post('/api/twilio/status', async (req, res) => {
    try {
      const webhookData: CallWebhookData = req.body;
      
      // Update call status in storage
      const call = await storage.getCallBySid(webhookData.CallSid);
      if (call) {
        await storage.updateCall(call.id, {
          status: webhookData.CallStatus,
          duration: webhookData.Duration ? parseInt(webhookData.Duration) : undefined,
          endTime: webhookData.CallStatus === "completed" ? new Date() : undefined
        });
        
        // Broadcast status update with proper call lifecycle events
        if (webhookData.CallStatus === 'completed' || webhookData.CallStatus === 'busy' || webhookData.CallStatus === 'failed') {
          broadcast({ 
            type: 'call_ended', 
            callSid: webhookData.CallSid,
            status: webhookData.CallStatus,
            duration: webhookData.Duration ? parseInt(webhookData.Duration) : 0
          });
        } else {
          broadcast({ 
            type: 'call_status_update', 
            callSid: webhookData.CallSid,
            status: webhookData.CallStatus 
          });
        }
      }
      
      res.sendStatus(200);
    } catch (error) {
      console.error("Error handling Twilio status webhook:", error);
      res.status(500).send("Error processing status update");
    }
  });

  // Call transfer webhook handlers
  app.post('/api/twilio/transfer-status', (req, res) => {
    const { CallSid, DialCallStatus, DialCallSid } = req.body;
    console.log(`Transfer status for ${CallSid}: ${DialCallStatus}`);
    
    const twiml = new twilio.twiml.VoiceResponse();
    
    if (DialCallStatus === 'completed') {
      // Transfer successful - hang up
      twiml.hangup();
    } else {
      // Transfer failed - offer voicemail
      twiml.say('The person you are trying to reach is not available. Please leave a message.');
      twiml.redirect('/api/twilio/voicemail');
    }
    
    res.type('text/xml').send(twiml.toString());
  });

  app.post('/api/twilio/forward-status', (req, res) => {
    const { CallSid, DialCallStatus } = req.body;
    console.log(`Forward status for ${CallSid}: ${DialCallStatus}`);
    
    const twiml = new twilio.twiml.VoiceResponse();
    
    if (DialCallStatus === 'no-answer' || DialCallStatus === 'busy' || DialCallStatus === 'failed') {
      twiml.say('The number you are trying to reach is not available. Please leave a message.');
      twiml.redirect('/api/twilio/voicemail');
    } else {
      twiml.hangup();
    }
    
    res.type('text/xml').send(twiml.toString());
  });

  app.post('/api/twilio/hold-music', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.play('http://com.twilio.music.classical.s3.amazonaws.com/BusyStrings.wav');
    res.type('text/xml').send(twiml.toString());
  });

  app.post('/api/twilio/conference-status', (req, res) => {
    const { ConferenceSid, StatusCallbackEvent, CallSid } = req.body;
    console.log(`Conference ${ConferenceSid} event: ${StatusCallbackEvent} for call ${CallSid}`);
    res.status(200).send('OK');
  });

  app.post('/api/twilio/warm-transfer-connect', (req, res) => {
    const { conference, originalCallSid } = req.query;
    const twiml = new twilio.twiml.VoiceResponse();
    
    twiml.say('You have an incoming call transfer. Press 1 to accept or hang up to decline.');
    
    const gather = twiml.gather({
      numDigits: 1,
      action: `/api/twilio/warm-transfer-decision?conference=${conference}&originalCallSid=${originalCallSid}`,
      method: 'POST'
    });
    
    gather.say('Press 1 to accept the call.');
    
    twiml.say('Call not accepted.');
    twiml.hangup();
    
    res.type('text/xml').send(twiml.toString());
  });

  app.post('/api/twilio/warm-transfer-decision', (req, res) => {
    const { conference } = req.query;
    const { Digits } = req.body;
    const twiml = new twilio.twiml.VoiceResponse();
    
    if (Digits === '1') {
      twiml.say('Connecting you now.');
      twiml.dial().conference({
        startConferenceOnEnter: true,
        endConferenceOnExit: true
      }, conference as string);
    } else {
      twiml.say('Call declined.');
      twiml.hangup();
    }
    
    res.type('text/xml').send(twiml.toString());
  });

  app.post('/api/twilio/conference-join', (req, res) => {
    const { conference } = req.query;
    const twiml = new twilio.twiml.VoiceResponse();
    
    twiml.dial().conference({
      startConferenceOnEnter: true,
      endConferenceOnExit: false
    }, conference as string);
    
    res.type('text/xml').send(twiml.toString());
  });

  // SMS webhook handler
  app.post('/api/twilio/sms', async (req, res) => {
    try {
      const smsData = req.body;
      const { From, To, Body, MessageSid } = smsData;
      
      // Look up contact for sender
      const contact = await storage.getContactByPhone(From);
      
      // Check for contact-specific SMS routing
      const contactRoutes = await storage.getContactRoutesForPhone(From);
      
      // Generate TwiML response
      const twiml = new twilio.twiml.MessagingResponse();
      
      if (contactRoutes.length > 0) {
        const primaryRoute = contactRoutes[0];
        
        switch (primaryRoute.action) {
          case "block":
            // Don't respond to blocked contacts
            res.type('text/xml');
            res.send(twiml.toString());
            return;
            
          case "forward":
            // Forward SMS to designated number
            if (primaryRoute.forwardTo && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
              const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
              await client.messages.create({
                body: `Forwarded from ${contact?.firstName || From}: ${Body}`,
                from: To,
                to: primaryRoute.forwardTo
              });
              
              if (contact?.isVip) {
                twiml.message(`Thank you ${contact.firstName}! Your message has been forwarded to our team.`);
              } else {
                twiml.message("Your message has been forwarded to our team. We'll respond shortly.");
              }
            }
            break;
            
          case "ai":
          default:
            // AI-powered auto-response based on message content
            const aiConfig = await storage.getAiConfig();
            const intent = await analyzeCallIntent(Body);
            
            let response = "Thank you for your message! We'll get back to you soon.";
            
            // Generate contextual responses based on intent
            if (intent.keywords.some(k => k.toLowerCase().includes('urgent') || k.toLowerCase().includes('emergency'))) {
              response = "We've received your urgent message. Our team will prioritize your request and respond within 1 hour.";
            } else if (intent.keywords.some(k => k.toLowerCase().includes('hours') || k.toLowerCase().includes('open'))) {
              response = "Our business hours are Monday-Friday 9AM-6PM. We'll respond to your message during our next business day.";
            } else if (intent.keywords.some(k => k.toLowerCase().includes('pricing') || k.toLowerCase().includes('quote'))) {
              response = "Thank you for your interest in our services! Our sales team will send you pricing information within 24 hours.";
            }
            
            if (contact?.isVip) {
              response = `Hi ${contact.firstName}! ${response}`;
            }
            
            twiml.message(response);
            break;
        }
      } else {
        // Default auto-response for unknown contacts
        twiml.message("Thank you for contacting us! We've received your message and will respond during business hours.");
      }
      
      // Log SMS interaction
      console.log(`SMS received from ${From}: ${Body}`);
      
      // Send notification for SMS received
      await sendNotification("sms", process.env.NOTIFICATION_PHONE || "", 
        `New SMS from ${contact?.firstName || From}: ${Body.substring(0, 100)}${Body.length > 100 ? '...' : ''}`, undefined);
      
      // Broadcast SMS update to dashboard
      broadcast({ 
        type: 'sms-received', 
        data: { 
          from: From,
          to: To,
          body: Body,
          contact: contact,
          timestamp: new Date()
        }
      });
      
      res.type('text/xml');
      res.send(twiml.toString());
    } catch (error) {
      console.error("Error handling Twilio SMS webhook:", error);
      
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message("We're experiencing technical difficulties. Please try calling us or try again later.");
      
      res.type('text/xml');
      res.send(twiml.toString());
    }
  });

  // Push notification endpoints (Web Push Protocol via web-push library)

  // Return VAPID public key so the client can subscribe
  app.get('/api/push/vapid-key', (_req, res) => {
    res.json({ publicKey: getVapidPublicKey(), configured: isPushConfigured() });
  });

  app.post('/api/push-subscription', async (req, res) => {
    try {
      const { subscription, userId } = req.body;
      const sub = subscription || req.body; // support both formats
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
        return res.status(400).json({ error: 'Invalid subscription — missing endpoint or keys' });
      }
      await savePushSubscription(
        userId ?? null,
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
        req.headers['user-agent']
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving push subscription:', error);
      res.status(500).json({ error: 'Failed to save push subscription' });
    }
  });

  app.delete('/api/push-subscription', async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });
      await removePushSubscription(endpoint);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing push subscription:', error);
      res.status(500).json({ error: 'Failed to remove push subscription' });
    }
  });

  app.post('/api/test-push-notification', async (req, res) => {
    try {
      const { title, body, userId } = req.body;
      const payload = {
        title: title || 'Test Notification',
        body: body || 'This is a test push notification from AI Call Assistant',
        icon: '/generated-icon.png',
        badge: '/generated-icon.png',
        tag: `test-${Date.now()}`,
        data: { url: '/', timestamp: Date.now() },
      };

      const subs = await getSubscriptions(userId);
      const sent = await sendPushBroadcast(payload);

      res.json({
        success: true,
        message: `Push sent to ${sent}/${subs.length} devices`,
        subscriberCount: subs.length,
        sentCount: sent,
        configured: isPushConfigured(),
      });
    } catch (error) {
      console.error('Error sending test push notification:', error);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  });

  // Integration endpoints
  app.get('/api/integrations/status', async (req, res) => {
    try {
      const statuses = integrationManager.getAllIntegrationStatuses();
      res.json(statuses);
    } catch (error) {
      console.error('Get integration status error:', error);
      res.status(500).json({ error: 'Failed to get integration status' });
    }
  });

  app.post('/api/integrations/:id/connect', async (req, res) => {
    try {
      const { id } = req.params;
      const credentials = req.body;
      
      const result = await integrationManager.connectIntegration(id, credentials);
      res.json({ success: result });
    } catch (error) {
      console.error(`Connect integration ${req.params.id} error:`, error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to connect integration' });
    }
  });

  app.delete('/api/integrations/:id/disconnect', async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await integrationManager.disconnectIntegration(id);
      res.json({ success: result });
    } catch (error) {
      console.error(`Disconnect integration ${req.params.id} error:`, error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to disconnect integration' });
    }
  });

  app.post('/api/integrations/:id/test', async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await integrationManager.testIntegration(id);
      res.json({ success: result });
    } catch (error) {
      console.error(`Test integration ${req.params.id} error:`, error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Integration test failed' });
    }
  });

  // Test incoming call simulation for live monitor
  app.post('/api/test/simulate-call', async (req, res) => {
    try {
      const { callerNumber = '+15551234567', callerName = 'Test Caller' } = req.body;
      const testCallSid = `TEST_${Date.now()}`;
      
      // Simulate call started
      broadcast({
        type: 'call_started',
        call: {
          callSid: testCallSid,
          from: callerNumber,
          to: process.env.TWILIO_PHONE_NUMBER!,
          callerName,
          status: 'in-progress',
          startTime: new Date().toISOString()
        }
      });

      // Simulate conversation turns
      setTimeout(() => {
        broadcast({
          type: 'conversation_turn',
          callSid: testCallSid,
          turn: {
            speaker: 'caller',
            message: 'Hello, I need help with my account',
            timestamp: new Date().toLocaleTimeString(),
            confidence: 0.95,
            sentiment: 'neutral'
          }
        });
      }, 1000);

      setTimeout(() => {
        broadcast({
          type: 'conversation_turn',
          callSid: testCallSid,
          turn: {
            speaker: 'ai',
            speakerName: 'Maya (AI Assistant)',
            message: 'Hello! I\'d be happy to help you with your account. Can you please provide your account number or email address?',
            timestamp: new Date().toLocaleTimeString(),
            confidence: 1.0,
            sentiment: 'positive'
          }
        });
      }, 3000);

      setTimeout(() => {
        broadcast({
          type: 'conversation_turn',
          callSid: testCallSid,
          turn: {
            speaker: 'caller',
            message: 'My email is john.doe@example.com',
            timestamp: new Date().toLocaleTimeString(),
            confidence: 0.98,
            sentiment: 'neutral'
          }
        });
      }, 5000);

      setTimeout(() => {
        broadcast({
          type: 'conversation_turn',
          callSid: testCallSid,
          turn: {
            speaker: 'ai',
            speakerName: 'Maya (AI Assistant)',
            message: 'Thank you! I found your account. How can I assist you today?',
            timestamp: new Date().toLocaleTimeString(),
            confidence: 1.0,
            sentiment: 'positive'
          }
        });
      }, 7000);

      // Simulate call ending
      setTimeout(() => {
        broadcast({
          type: 'call_ended',
          callSid: testCallSid,
          status: 'completed',
          duration: 45
        });
      }, 15000);

      res.json({ success: true, testCallSid });
    } catch (error) {
      console.error('Error simulating call:', error);
      res.status(500).json({ error: 'Failed to simulate call' });
    }
  });

  // Call Flow Configuration API Routes
  app.get('/api/call-flow-configs', async (req, res) => {
    try {
      const configs = await storage.getCallFlowConfigs();
      res.json(configs);
    } catch (error) {
      console.error('Error fetching call flow configs:', error);
      res.status(500).json({ error: 'Failed to fetch call flow configurations' });
    }
  });

  app.post('/api/call-flow-configs', async (req, res) => {
    try {
      const validatedData = insertCallFlowConfigSchema.parse(req.body);
      const config = await storage.createCallFlowConfig(validatedData);
      res.json(config);
    } catch (error) {
      console.error('Error creating call flow config:', error);
      res.status(500).json({ error: 'Failed to create call flow configuration' });
    }
  });

  app.put('/api/call-flow-configs/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const config = await storage.updateCallFlowConfig(id, updates);
      res.json(config);
    } catch (error) {
      console.error('Error updating call flow config:', error);
      res.status(500).json({ error: 'Failed to update call flow configuration' });
    }
  });

  app.delete('/api/call-flow-configs/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCallFlowConfig(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting call flow config:', error);
      res.status(500).json({ error: 'Failed to delete call flow configuration' });
    }
  });

  // Greeting Templates API Routes
  app.get('/api/greeting-templates', async (req, res) => {
    try {
      const templates = await storage.getGreetingTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching greeting templates:', error);
      res.status(500).json({ error: 'Failed to fetch greeting templates' });
    }
  });

  app.post('/api/greeting-templates', async (req, res) => {
    try {
      const validatedData = insertGreetingTemplateSchema.parse(req.body);
      const template = await storage.createGreetingTemplate(validatedData);
      res.json(template);
    } catch (error) {
      console.error('Error creating greeting template:', error);
      res.status(500).json({ error: 'Failed to create greeting template' });
    }
  });

  app.put('/api/greeting-templates/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const template = await storage.updateGreetingTemplate(id, updates);
      res.json(template);
    } catch (error) {
      console.error('Error updating greeting template:', error);
      res.status(500).json({ error: 'Failed to update greeting template' });
    }
  });

  app.delete('/api/greeting-templates/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteGreetingTemplate(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting greeting template:', error);
      res.status(500).json({ error: 'Failed to delete greeting template' });
    }
  });

  // Intent Patterns API Routes
  app.get('/api/intent-patterns', async (req, res) => {
    try {
      const patterns = await storage.getIntentPatterns();
      res.json(patterns);
    } catch (error) {
      console.error('Error fetching intent patterns:', error);
      res.status(500).json({ error: 'Failed to fetch intent patterns' });
    }
  });

  app.post('/api/intent-patterns', async (req, res) => {
    try {
      const validatedData = insertIntentPatternSchema.parse(req.body);
      const pattern = await storage.createIntentPattern(validatedData);
      res.json(pattern);
    } catch (error) {
      console.error('Error creating intent pattern:', error);
      res.status(500).json({ error: 'Failed to create intent pattern' });
    }
  });

  app.put('/api/intent-patterns/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const pattern = await storage.updateIntentPattern(id, updates);
      res.json(pattern);
    } catch (error) {
      console.error('Error updating intent pattern:', error);
      res.status(500).json({ error: 'Failed to update intent pattern' });
    }
  });

  app.delete('/api/intent-patterns/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteIntentPattern(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting intent pattern:', error);
      res.status(500).json({ error: 'Failed to delete intent pattern' });
    }
  });

  // Call Flow Steps API Routes
  app.get('/api/call-flow-steps/:flowConfigId', async (req, res) => {
    try {
      const flowConfigId = parseInt(req.params.flowConfigId);
      const steps = await storage.getCallFlowSteps(flowConfigId);
      res.json(steps);
    } catch (error) {
      console.error('Error fetching call flow steps:', error);
      res.status(500).json({ error: 'Failed to fetch call flow steps' });
    }
  });

  app.post('/api/call-flow-steps', async (req, res) => {
    try {
      const validatedData = insertCallFlowStepSchema.parse(req.body);
      const step = await storage.createCallFlowStep(validatedData);
      res.json(step);
    } catch (error) {
      console.error('Error creating call flow step:', error);
      res.status(500).json({ error: 'Failed to create call flow step' });
    }
  });

  app.put('/api/call-flow-steps/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const step = await storage.updateCallFlowStep(id, updates);
      res.json(step);
    } catch (error) {
      console.error('Error updating call flow step:', error);
      res.status(500).json({ error: 'Failed to update call flow step' });
    }
  });

  app.delete('/api/call-flow-steps/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCallFlowStep(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting call flow step:', error);
      res.status(500).json({ error: 'Failed to delete call flow step' });
    }
  });

  // AI Receptionist Configuration API
  app.post('/api/receptionist/config', async (req, res) => {
    try {
      const config = req.body;
      
      // Update the receptionist AI service with new config
      const { receptionistAI } = await import('./services/ReceptionistAIService');
      receptionistAI.updateCompanySettings(config.companyName, config.aiName);
      
      // Store configuration in database
      const savedConfig = await storage.createReceptionistConfig({
        name: "AI Receptionist Config",
        config: JSON.stringify(config),
        organizationId: "default"
      });
      
      res.json({ success: true, config: savedConfig });
    } catch (error) {
      console.error('Error saving receptionist config:', error);
      res.status(500).json({ error: 'Failed to save configuration' });
    }
  });

  app.get('/api/receptionist/config', async (req, res) => {
    try {
      const configs = await storage.getReceptionistConfigs();
      res.json(configs);
    } catch (error) {
      console.error('Error fetching receptionist config:', error);
      res.status(500).json({ error: 'Failed to fetch configuration' });
    }
  });

  // AI Receptionist Testing API
  app.post('/api/receptionist/test', async (req, res) => {
    try {
      const { scenario, input } = req.body;
      
      const { receptionistAI } = await import('./services/ReceptionistAIService');
      
      // Simulate a test call
      const testCallSid = `test_${Date.now()}`;
      const testCallerNumber = "+1234567890";
      
      // Initialize test conversation
      await receptionistAI.handleIncomingCall(testCallSid, testCallerNumber, "Test Caller");
      
      // Get AI response for the test input
      const response = await receptionistAI.processCallerInput(testCallSid, input);
      
      // Clean up test conversation
      receptionistAI.endConversation(testCallSid);
      
      res.json({
        success: true,
        scenario,
        input,
        response: response.text,
        action: response.action,
        transferTo: response.transferTo
      });
    } catch (error) {
      console.error('Error testing receptionist:', error);
      res.status(500).json({ error: 'Failed to test conversation' });
    }
  });

  // Business Hours API endpoints
  app.get("/api/business-hours", async (req, res) => {
    try {
      const defaultHours = {
        monday: { start: "09:00", end: "17:00", enabled: true },
        tuesday: { start: "09:00", end: "17:00", enabled: true },
        wednesday: { start: "09:00", end: "17:00", enabled: true },
        thursday: { start: "09:00", end: "17:00", enabled: true },
        friday: { start: "09:00", end: "17:00", enabled: true },
        saturday: { start: "09:00", end: "17:00", enabled: false },
        sunday: { start: "09:00", end: "17:00", enabled: false }
      };
      res.json(defaultHours);
    } catch (error) {
      console.error("Error fetching business hours:", error);
      res.status(500).json({ message: "Failed to fetch business hours" });
    }
  });

  app.put("/api/business-hours", async (req, res) => {
    try {
      const businessHours = req.body;
      res.json({ message: "Business hours updated successfully" });
    } catch (error) {
      console.error("Error updating business hours:", error);
      res.status(500).json({ message: "Failed to update business hours" });
    }
  });

  // PhD AI Engineer routes
  app.get('/api/ai-engineer/analysis', async (req, res) => {
    try {
      const analysis = await phdAIEngineer.performComprehensiveAnalysis();
      res.json(analysis);
    } catch (error) {
      console.error('Error performing AI analysis:', error);
      res.status(500).json({ message: 'Failed to perform AI analysis' });
    }
  });

  app.get('/api/ai-engineer/recommendations', async (req, res) => {
    try {
      const { category, priority, status } = req.query;
      const recommendations = await phdAIEngineer.getRecommendations({
        category: category as string,
        priority: priority as string,
        status: status as string,
      });
      res.json(recommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      res.status(500).json({ message: 'Failed to fetch recommendations' });
    }
  });

  app.get('/api/ai-engineer/analysis-history', async (req, res) => {
    try {
      const history = await phdAIEngineer.getAnalysisHistory();
      res.json(history);
    } catch (error) {
      console.error('Error fetching analysis history:', error);
      res.status(500).json({ message: 'Failed to fetch analysis history' });
    }
  });

  app.post('/api/ai-engineer/custom-recommendation', async (req, res) => {
    try {
      const { request } = req.body;
      if (!request) {
        return res.status(400).json({ message: 'Request is required' });
      }
      
      const recommendation = await phdAIEngineer.generateCustomRecommendation(request);
      res.json(recommendation);
    } catch (error) {
      console.error('Error generating custom recommendation:', error);
      res.status(500).json({ message: 'Failed to generate custom recommendation' });
    }
  });

  app.patch('/api/ai-engineer/recommendations/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['pending', 'in-progress', 'completed', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      
      const success = await phdAIEngineer.updateRecommendationStatus(id, status);
      if (!success) {
        return res.status(404).json({ message: 'Recommendation not found' });
      }
      
      res.json({ message: 'Status updated successfully' });
    } catch (error) {
      console.error('Error updating recommendation status:', error);
      res.status(500).json({ message: 'Failed to update recommendation status' });
    }
  });

  app.post('/api/ai-engineer/recommendations/:id/implement', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await phdAIEngineer.implementRecommendation(id);
      res.json(result);
    } catch (error) {
      console.error('Error implementing recommendation:', error);
      res.status(500).json({ message: 'Failed to implement recommendation' });
    }
  });

  // PhD Engineering Team API routes
  app.get('/api/engineering-team/recommendations', async (req, res) => {
    try {
      const { engineeringTeam } = await import('./ai-engineering-team');
      const { priority, engineerType, status } = req.query as any;
      
      const filters = {};
      if (priority) filters.priority = priority;
      if (engineerType) filters.engineerType = engineerType;
      if (status) filters.status = status;
      
      const recommendations = await engineeringTeam.getRecommendations(filters);
      res.json(recommendations);
    } catch (error) {
      console.error('Error fetching engineering team recommendations:', error);
      res.status(500).json({ message: 'Failed to fetch recommendations' });
    }
  });

  app.get('/api/engineering-team/system-health', async (req, res) => {
    try {
      const { engineeringTeam } = await import('./ai-engineering-team');
      const systemHealth = await engineeringTeam.getSystemHealth();
      res.json(systemHealth);
    } catch (error) {
      console.error('Error fetching system health:', error);
      res.status(500).json({ message: 'Failed to fetch system health' });
    }
  });

  app.post('/api/engineering-team/recommendations/:id/approve', async (req, res) => {
    try {
      const { engineeringTeam } = await import('./ai-engineering-team');
      const { id } = req.params;
      
      const success = await engineeringTeam.approveRecommendation(id);
      if (!success) {
        return res.status(404).json({ message: 'Recommendation not found' });
      }
      
      res.json({ message: 'Recommendation approved successfully' });
    } catch (error) {
      console.error('Error approving recommendation:', error);
      res.status(500).json({ message: 'Failed to approve recommendation' });
    }
  });

  app.post('/api/engineering-team/trigger-analysis', async (req, res) => {
    try {
      const { engineeringTeam } = await import('./ai-engineering-team');
      
      // Trigger immediate comprehensive analysis
      await engineeringTeam.performComprehensiveAnalysis();
      
      res.json({ message: 'Analysis triggered successfully' });
    } catch (error) {
      console.error('Error triggering analysis:', error);
      res.status(500).json({ message: 'Failed to trigger analysis' });
    }
  });

  // Data migration routes
  app.post('/api/migrate-to-encrypted', async (req, res) => {
    try {
      const { migrateContactsToEncrypted } = await import('./migrate-to-encrypted');
      const result = await migrateContactsToEncrypted();
      res.json(result);
    } catch (error) {
      console.error('Migration failed:', error);
      res.status(500).json({ message: 'Migration failed', error: error.message });
    }
  });

  app.get('/api/verify-migration', async (req, res) => {
    try {
      const { verifyMigration } = await import('./migrate-to-encrypted');
      const result = await verifyMigration();
      res.json(result);
    } catch (error) {
      console.error('Verification failed:', error);
      res.status(500).json({ message: 'Verification failed', error: error.message });
    }
  });

  // Organization management routes
  app.get('/api/organizations', orgRoutes.getOrganizations);
  app.post('/api/organizations', orgRoutes.createOrganization);
  app.get('/api/organizations/:id', orgRoutes.getOrganization);
  app.put('/api/organizations/:id', orgRoutes.updateOrganization);
  app.get('/api/organizations/:id/members', orgRoutes.getOrganizationMembers);
  app.get('/api/organizations/:id/calls', orgRoutes.getOrganizationCalls);
  app.get('/api/organizations/:id/stats', orgRoutes.getOrganizationStats);
  app.get('/api/organizations/:id/recent-calls', orgRoutes.getRecentCalls);
  app.post('/api/organizations/:id/invite', orgRoutes.inviteUserToOrganization);
  app.get('/api/admin/users', orgRoutes.getAllUsers);
  app.post('/api/admin/users', orgRoutes.createUser);

  // SMS API endpoints
  // Get SMS messages
  app.get('/api/sms', async (req, res) => {
    try {
      const { organizationId } = req.query;
      const messages = await storage.getSMSMessages(organizationId as string);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching SMS messages:', error);
      res.status(500).json({ message: 'Failed to fetch SMS messages' });
    }
  });

  // Get SMS messages for a specific contact
  app.get('/api/contacts/:contactId/sms', async (req, res) => {
    try {
      const contactId = parseInt(req.params.contactId);
      const messages = await storage.getSMSMessagesByContact(contactId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching contact SMS messages:', error);
      res.status(500).json({ message: 'Failed to fetch contact SMS messages' });
    }
  });

  // Get SMS messages for a specific phone number
  app.get('/api/sms/phone/:phoneNumber', async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      const { organizationId } = req.query;
      const messages = await storage.getSMSMessagesByPhone(phoneNumber, organizationId as string);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching phone SMS messages:', error);
      res.status(500).json({ message: 'Failed to fetch phone SMS messages' });
    }
  });

  // Send SMS message
  app.post('/api/sms/send', async (req, res) => {
    try {
      const { to, message, organizationId } = req.body;
      
      if (!to || !message) {
        return res.status(400).json({ message: 'Phone number and message are required' });
      }

      // Check if Twilio is configured
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
        return res.status(500).json({ 
          message: 'SMS service not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.' 
        });
      }

      // Send SMS via Twilio - use Messaging Service for A2P compliance
      const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const fromNumber = process.env.TWILIO_PHONE_NUMBER!;
      const msgParams: any = { body: message, to };
      if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
        msgParams.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
      } else {
        msgParams.from = fromNumber;
      }
      const twilioMessage = await twilioClient.messages.create(msgParams);

      // Look up contact for this phone number
      const contact = await storage.getContactByPhone(to, organizationId);

      // Store SMS message in database
      const smsMessage = await storage.createSMSMessage({
        messageSid: twilioMessage.sid,
        from: fromNumber,
        to: to,
        body: message, // Will be encrypted by storage layer
        direction: 'outbound',
        status: twilioMessage.status,
        dateCreated: new Date(),
        dateSent: twilioMessage.dateSent ? new Date(twilioMessage.dateSent) : null,
        numSegments: twilioMessage.numSegments || 1,
        price: twilioMessage.price || null,
        priceUnit: twilioMessage.priceUnit || null,
        contactId: contact?.id || null,
        organizationId: organizationId || null
      });

      // Broadcast SMS sent event
      broadcast({
        type: 'sms_sent',
        sms: {
          id: smsMessage.id,
          to: to,
          message: message,
          timestamp: new Date().toISOString(),
          status: 'sent'
        }
      });

      res.json({ 
        success: true, 
        messageId: smsMessage.id,
        twilioSid: twilioMessage.sid,
        message: 'SMS sent successfully' 
      });
    } catch (error) {
      console.error('Error sending SMS:', error);
      res.status(500).json({ 
        message: 'Failed to send SMS', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Onboarding API endpoints
  app.get('/api/onboarding/progress', async (req, res) => {
    try {
      const { email } = req.user as any;
      
      // Get user's onboarding progress
      const progress = await storage.getOnboardingProgress(email);
      
      res.json(progress || {
        currentStep: 0,
        completedSteps: [],
        setupComplete: false
      });
    } catch (error) {
      console.error('Error getting onboarding progress:', error);
      res.status(500).json({ message: 'Failed to get onboarding progress' });
    }
  });

  app.post('/api/onboarding/progress', async (req, res) => {
    try {
      const { email } = req.user as any;
      const { step, data } = req.body;
      
      // Update onboarding progress
      await storage.updateOnboardingProgress(email, step, data);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
      res.status(500).json({ message: 'Failed to update onboarding progress' });
    }
  });

  app.post('/api/twilio/test-connection', async (req, res) => {
    try {
      const { accountSid, authToken, phoneNumber } = req.body;
      
      if (!accountSid || !authToken || !phoneNumber) {
        return res.status(400).json({ message: 'Missing required credentials' });
      }

      // Test Twilio connection
      const client = twilio(accountSid, authToken);
      
      // Verify credentials by fetching account info
      const account = await client.api.accounts(accountSid).fetch();
      
      // Verify phone number exists
      const number = await client.incomingPhoneNumbers.list({
        phoneNumber: phoneNumber
      });

      if (number.length === 0) {
        return res.status(400).json({ message: 'Phone number not found in your Twilio account' });
      }

      // Save credentials if test successful
      const { email, organizationId } = req.user as any;
      await storage.saveTwilioCredentials(organizationId, {
        accountSid,
        authToken,
        phoneNumber
      });

      res.json({ 
        success: true, 
        message: 'Twilio connection successful',
        accountName: account.friendlyName
      });
    } catch (error) {
      console.error('Error testing Twilio connection:', error);
      res.status(400).json({ 
        message: 'Twilio connection failed', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Voice transcription endpoint
  app.post('/api/sms/transcribe', upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Audio file is required' });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      // Convert audio to text using OpenAI Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: new File([req.file.buffer], req.file.originalname, { type: req.file.mimetype }),
        model: "whisper-1",
        language: "en",
        response_format: "json",
        temperature: 0.2
      });

      res.json({ 
        text: transcription.text,
        duration: 0 // Duration not available in basic response
      });
    } catch (error) {
      console.error('Error transcribing audio:', error);
      res.status(500).json({ 
        message: 'Failed to transcribe audio', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AI message enhancement endpoint
  app.post('/api/sms/enhance', async (req, res) => {
    try {
      const { text, context } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: 'Text is required' });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      // Generate enhanced message and suggestions
      const enhancementPrompt = `You are an AI assistant helping to improve SMS messages for better communication.

Original message: "${text}"
${context ? `Context: ${context}` : ''}

Please:
1. Enhance the message for clarity, tone, and professionalism while keeping it concise for SMS
2. Provide 2-3 alternative versions with different tones (friendly, professional, casual)
3. Keep messages under 160 characters when possible
4. Maintain the original intent and meaning

Respond in JSON format:
{
  "enhanced": "improved version of the original message",
  "suggestions": ["alternative version 1", "alternative version 2", "alternative version 3"]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert at enhancing text messages for better communication. Always respond with valid JSON."
          },
          {
            role: "user",
            content: enhancementPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 500
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      res.json({
        enhanced: result.enhanced || text,
        suggestions: result.suggestions || []
      });
    } catch (error) {
      console.error('Error enhancing message:', error);
      res.status(500).json({ 
        message: 'Failed to enhance message', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Call Forwarding Configuration Routes
  app.get('/api/twilio/config', async (req, res) => {
    try {
      // Return mock configuration for now
      res.json({
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
        accountSid: process.env.TWILIO_ACCOUNT_SID ? 'ACxxxxx' : null,
        status: 'active'
      });
    } catch (error) {
      console.error('Error fetching Twilio config:', error);
      res.status(500).json({ message: 'Failed to fetch configuration' });
    }
  });

  app.get('/api/call-forwarding/status', async (req, res) => {
    try {
      res.json({
        active: true,
        method: 'direct',
        businessNumber: null,
        notes: null,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching forwarding status:', error);
      res.status(500).json({ message: 'Failed to fetch forwarding status' });
    }
  });

  app.post('/api/call-forwarding/update', async (req, res) => {
    try {
      const { method, businessNumber, notes } = req.body;
      
      // Store configuration (mock implementation)
      res.json({
        success: true,
        message: 'Call forwarding configuration updated'
      });
    } catch (error) {
      console.error('Error updating forwarding config:', error);
      res.status(500).json({ message: 'Failed to update configuration' });
    }
  });

  app.post('/api/call-forwarding/test', async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      // Mock test call functionality
      res.json({
        success: true,
        message: 'Test call initiated',
        callSid: `CA${Date.now()}`
      });
    } catch (error) {
      console.error('Error testing forwarding:', error);
      res.status(500).json({ message: 'Failed to initiate test call' });
    }
  });

  // AI Assistant Configuration Routes
  app.get('/api/ai-config', async (req, res) => {
    try {
      res.json({
        businessName: 'AI Call Assistant',
        businessDescription: 'Professional AI-powered call handling service',
        services: 'Call answering, appointment scheduling, customer support',
        businessHours: 'Monday-Friday 9AM-5PM EST',
        personality: 'professional',
        responseStyle: 'helpful',
        maxConversationLength: 10,
        transferThreshold: 3,
        handleEmergencies: true,
        collectInfo: true,
        voicePersonality: 'professional',
        speechPace: 'normal',
        emotionalAdaptation: true,
        accent: 'neutral'
      });
    } catch (error) {
      console.error('Error fetching AI config:', error);
      res.status(500).json({ message: 'Failed to fetch AI configuration' });
    }
  });

  app.post('/api/ai-config/update', async (req, res) => {
    try {
      const { section, config } = req.body;
      
      // Store AI configuration (mock implementation)
      res.json({
        success: true,
        message: `AI ${section} configuration updated`
      });
    } catch (error) {
      console.error('Error updating AI config:', error);
      res.status(500).json({ message: 'Failed to update AI configuration' });
    }
  });

  app.post('/api/ai-config/test', async (req, res) => {
    try {
      const { scenario } = req.body;
      
      // Mock AI response testing
      const responses = {
        general_inquiry: "Thank you for calling! How can I assist you today?",
        service_request: "I'd be happy to help you with our services. What specifically are you looking for?",
        complaint: "I understand your concern and I'm here to help resolve this issue. Can you tell me more about what happened?",
        emergency: "I understand this is urgent. Let me connect you with the appropriate person immediately."
      };
      
      res.json({
        scenario,
        response: responses[scenario] || "I'm here to help. How can I assist you?",
        confidence: 0.95,
        adaptations: ['tone: empathetic', 'pace: normal']
      });
    } catch (error) {
      console.error('Error testing AI response:', error);
      res.status(500).json({ message: 'Failed to test AI response' });
    }
  });

  // Smart Support Automation API Routes
  app.post('/api/support/process-call', async (req, res) => {
    try {
      const { callSid, callerNumber, userMessage, callerName } = req.body;
      
      if (!callSid || !callerNumber || !userMessage) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const result = await smartSupportAutomation.processIncomingSupportCall({
        callSid,
        callerNumber,
        userMessage,
        callerName
      });

      res.json(result);
    } catch (error) {
      console.error('Error processing support call:', error);
      res.status(500).json({ message: 'Failed to process support call' });
    }
  });

  app.get('/api/support/automation-rules', async (req, res) => {
    try {
      const rules = smartSupportAutomation.getAutomationRules();
      res.json(rules);
    } catch (error) {
      console.error('Error getting automation rules:', error);
      res.status(500).json({ message: 'Failed to get automation rules' });
    }
  });

  app.post('/api/support/automation-rules', async (req, res) => {
    try {
      const rule = req.body;
      smartSupportAutomation.addAutomationRule(rule);
      res.json({ message: 'Automation rule added successfully' });
    } catch (error) {
      console.error('Error adding automation rule:', error);
      res.status(500).json({ message: 'Failed to add automation rule' });
    }
  });

  app.put('/api/support/automation-rules/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const success = smartSupportAutomation.updateAutomationRule(id, updates);
      
      if (success) {
        res.json({ message: 'Automation rule updated successfully' });
      } else {
        res.status(404).json({ message: 'Automation rule not found' });
      }
    } catch (error) {
      console.error('Error updating automation rule:', error);
      res.status(500).json({ message: 'Failed to update automation rule' });
    }
  });

  app.get('/api/support/workflow-metrics/:callSid', async (req, res) => {
    try {
      const { callSid } = req.params;
      const metrics = smartSupportAutomation.getWorkflowMetrics(callSid);
      
      if (metrics) {
        res.json(metrics);
      } else {
        res.status(404).json({ message: 'Workflow metrics not found' });
      }
    } catch (error) {
      console.error('Error getting workflow metrics:', error);
      res.status(500).json({ message: 'Failed to get workflow metrics' });
    }
  });

  // Knowledge Base API Routes
  app.get('/api/knowledge-base/search', async (req, res) => {
    try {
      const { q: query, limit = 5 } = req.query;
      
      if (!query) {
        return res.status(400).json({ message: 'Query parameter is required' });
      }

      const results = await storage.searchKnowledgeBase(query as string, parseInt(limit as string));
      res.json(results);
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      res.status(500).json({ message: 'Failed to search knowledge base' });
    }
  });

  app.post('/api/knowledge-base', async (req, res) => {
    try {
      const entry = req.body;
      const newEntry = await storage.createKnowledgeEntry(entry);
      res.json(newEntry);
    } catch (error) {
      console.error('Error creating knowledge entry:', error);
      res.status(500).json({ message: 'Failed to create knowledge entry' });
    }
  });

  app.put('/api/knowledge-base/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const updated = await storage.updateKnowledgeEntry(parseInt(id), data);
      res.json(updated);
    } catch (error) {
      console.error('Error updating knowledge entry:', error);
      res.status(500).json({ message: 'Failed to update knowledge entry' });
    }
  });

  app.delete('/api/knowledge-base/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteKnowledgeEntry(parseInt(id));
      res.json({ message: 'Knowledge entry deleted successfully' });
    } catch (error) {
      console.error('Error deleting knowledge entry:', error);
      res.status(500).json({ message: 'Failed to delete knowledge entry' });
    }
  });

  // ============================================
  // SUPPORT TICKET MANAGEMENT API ROUTES  
  // ============================================

  // Create a new support ticket
  app.post('/api/tickets', async (req, res) => {
    try {
      const validatedData = insertSupportTicketSchema.parse(req.body);
      const ticket = await ticketManagementService.createTicket(validatedData);
      res.status(201).json(ticket);
    } catch (error) {
      console.error('Error creating ticket:', error);
      res.status(500).json({ message: 'Failed to create ticket' });
    }
  });

  // Get tickets with filtering and pagination
  app.get('/api/tickets', async (req, res) => {
    try {
      const {
        organizationId = 'default-org-id',
        status,
        category,
        priority,
        limit = 20,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const result = await ticketManagementService.getTickets({
        organizationId: organizationId as string,
        status: status as string,
        category: category as string,
        priority: priority as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as 'createdAt' | 'updatedAt' | 'priority',
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      res.status(500).json({ message: 'Failed to fetch tickets' });
    }
  });

  // Update ticket status
  app.patch('/api/tickets/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, performedBy = 'human_agent', notes } = req.body;

      const updatedTicket = await ticketManagementService.updateTicketStatus(
        parseInt(id),
        status,
        performedBy,
        notes
      );

      res.json(updatedTicket);
    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({ message: 'Failed to update ticket status' });
    }
  });

  // Get ticket analytics for an organization
  app.get('/api/tickets/analytics/:organizationId', async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { 
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date() 
      } = req.query;

      const analytics = await ticketManagementService.getTicketAnalytics(
        organizationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json(analytics);
    } catch (error) {
      console.error('Error fetching ticket analytics:', error);
      res.status(500).json({ message: 'Failed to fetch ticket analytics' });
    }
  });

  // Generate comprehensive business intelligence report
  app.get('/api/tickets/business-intelligence/:organizationId', async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { 
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date() 
      } = req.query;

      const report = await ticketManagementService.generateBusinessIntelligenceReport(
        organizationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json(report);
    } catch (error) {
      console.error('Error generating business intelligence report:', error);
      res.status(500).json({ message: 'Failed to generate business intelligence report' });
    }
  });

  // Get cross-organization insights (for platform-wide analytics)
  app.get('/api/tickets/insights/cross-organization', async (req, res) => {
    try {
      const { 
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date() 
      } = req.query;

      const insights = {
        totalOrganizations: 0, // Would count from database
        commonIssuesAcrossOrganizations: [
          { issue: 'PAX Terminal Connectivity', frequency: 45, avgResolutionTime: 35 },
          { issue: 'Payment Processing Errors', frequency: 38, avgResolutionTime: 42 },
          { issue: 'Account Access Issues', frequency: 29, avgResolutionTime: 18 },
          { issue: 'Software Integration Problems', frequency: 22, avgResolutionTime: 67 },
        ],
        industryBenchmarks: {
          avgResolutionTime: 38, // minutes
          aiSuccessRate: 72, // percentage
          customerSatisfaction: 4.2 // out of 5
        },
        platformPerformance: {
          totalTicketsProcessed: 0, // Would count from database
          aiResolvedPercentage: 0,
          avgResponseTime: 0
        }
      };

      res.json(insights);
    } catch (error) {
      console.error('Error fetching cross-organization insights:', error);
      res.status(500).json({ message: 'Failed to fetch cross-organization insights' });
    }
  });

  // ============================================
  // WEBHOOK INTEGRATION API ROUTES  
  // ============================================

  // Get webhook integration templates for common systems (must be before parameterized route)
  app.get('/api/webhooks/templates', async (req, res) => {
    console.log('DEBUG: Webhook templates route called');
    try {
      const templates = {
        n8n: {
          name: 'n8n Automation',
          type: 'n8n',
          url: 'https://your-n8n.domain.com/webhook/your-webhook-id',
          authType: 'none',
          events: ['ticket.created', 'ticket.updated', 'ticket.resolved'],
          fields: [
            { name: 'webhookUrl', label: 'n8n Webhook URL', required: true, placeholder: 'https://your-n8n.domain.com/webhook/your-webhook-id' },
            { name: 'secret', label: 'Webhook Secret (optional)', type: 'password', placeholder: 'Optional security token' }
          ]
        },
        zendesk: {
          name: 'Zendesk Support',
          type: 'zendesk',
          url: 'https://your-domain.zendesk.com/api/v2/tickets',
          authType: 'basic',
          events: ['ticket.created', 'ticket.updated', 'ticket.resolved'],
          fields: [
            { name: 'domain', label: 'Zendesk Domain', required: true, placeholder: 'your-domain' },
            { name: 'email', label: 'Email Address', required: true, placeholder: 'your-email@company.com' },
            { name: 'token', label: 'API Token', required: true, type: 'password' }
          ]
        },
        servicenow: {
          name: 'ServiceNow Incident',
          type: 'servicenow',
          url: 'https://your-instance.service-now.com/api/now/table/incident',
          authType: 'basic',
          events: ['ticket.created', 'ticket.escalated'],
          fields: [
            { name: 'instance', label: 'ServiceNow Instance', required: true, placeholder: 'your-instance' },
            { name: 'username', label: 'Username', required: true },
            { name: 'password', label: 'Password', required: true, type: 'password' }
          ]
        },
        jira: {
          name: 'Jira Service Management',
          type: 'jira',
          url: 'https://your-domain.atlassian.net/rest/api/3/issue',
          authType: 'basic',
          events: ['ticket.created', 'ticket.updated'],
          fields: [
            { name: 'domain', label: 'Atlassian Domain', required: true, placeholder: 'your-domain' },
            { name: 'email', label: 'Email Address', required: true },
            { name: 'token', label: 'API Token', required: true, type: 'password' },
            { name: 'projectKey', label: 'Project Key', required: true, placeholder: 'SUPPORT' }
          ]
        },
        slack: {
          name: 'Slack Notifications',
          type: 'slack',
          url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
          authType: 'none',
          events: ['ticket.created', 'ticket.escalated'],
          fields: [
            { name: 'webhookUrl', label: 'Slack Webhook URL', required: true, placeholder: 'https://hooks.slack.com/services/...' },
            { name: 'channel', label: 'Channel (optional)', placeholder: '#support' }
          ]
        }
      };
      
      res.json(templates);
    } catch (error) {
      console.error('Error fetching webhook templates:', error);
      res.status(500).json({ message: 'Failed to fetch webhook templates' });
    }
  });

  // Get webhook configurations for an organization
  app.get('/api/webhooks/:organizationId', async (req, res) => {
    try {
      const { organizationId } = req.params;
      const configs = webhookIntegrationService.getWebhookConfigs(organizationId);
      res.json(configs);
    } catch (error) {
      console.error('Error fetching webhook configs:', error);
      res.status(500).json({ message: 'Failed to fetch webhook configurations' });
    }
  });

  // Register a new webhook configuration
  app.post('/api/webhooks', async (req, res) => {
    try {
      const config = await webhookIntegrationService.registerWebhook(req.body);
      res.status(201).json(config);
    } catch (error) {
      console.error('Error registering webhook:', error);
      res.status(500).json({ message: 'Failed to register webhook' });
    }
  });

  // Update webhook configuration
  app.put('/api/webhooks/:webhookId', async (req, res) => {
    try {
      const { webhookId } = req.params;
      const success = await webhookIntegrationService.updateWebhook(webhookId, req.body);
      
      if (success) {
        res.json({ message: 'Webhook updated successfully' });
      } else {
        res.status(404).json({ message: 'Webhook not found' });
      }
    } catch (error) {
      console.error('Error updating webhook:', error);
      res.status(500).json({ message: 'Failed to update webhook' });
    }
  });

  // Test webhook configuration
  app.post('/api/webhooks/:webhookId/test', async (req, res) => {
    try {
      const { webhookId } = req.params;
      const result = await webhookIntegrationService.testWebhook(webhookId);
      res.json(result);
    } catch (error) {
      console.error('Error testing webhook:', error);
      res.status(500).json({ message: 'Failed to test webhook' });
    }
  });

  // Manual pull of status updates from third-party systems
  app.post('/api/webhooks/pull-updates/:organizationId', async (req, res) => {
    try {
      const { organizationId } = req.params;
      await webhookIntegrationService.pullStatusUpdates(organizationId);
      res.json({ message: 'Status updates pulled successfully' });
    } catch (error) {
      console.error('Error pulling status updates:', error);
      res.status(500).json({ message: 'Failed to pull status updates' });
    }
  });

  // Sync specific ticket with third-party systems
  app.post('/api/webhooks/sync-ticket/:ticketId', async (req, res) => {
    try {
      const { ticketId } = req.params;
      const result = await webhookIntegrationService.syncSpecificTicket(parseInt(ticketId));
      res.json(result);
    } catch (error) {
      console.error('Error syncing ticket:', error);
      res.status(500).json({ message: 'Failed to sync ticket' });
    }
  });

  // Webhook endpoint for receiving status updates from third-party systems
  app.post('/api/webhooks/incoming/:organizationId', async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { source, ticketId, status, data } = req.body;
      
      console.log(`📥 Incoming webhook from ${source} for organization ${organizationId}`);
      console.log(`Ticket ${ticketId} status update: ${status}`);
      
      // Process the incoming webhook data
      // This would be customized based on the third-party system
      res.json({ message: 'Webhook received successfully', processed: true });
    } catch (error) {
      console.error('Error processing incoming webhook:', error);
      res.status(500).json({ message: 'Failed to process webhook' });
    }
  });



  // ============================================
  // SALES DEPARTMENT API ROUTES
  // ============================================

  // Get leads for organization
  app.get('/api/sales/leads/:organizationId', async (req, res) => {
    try {
      const { organizationId } = req.params;
      const leads = await simpleSales.getLeads(organizationId);
      res.json(leads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      res.status(500).json({ message: 'Failed to fetch leads' });
    }
  });

  // Create new lead
  app.post('/api/sales/leads', async (req, res) => {
    try {
      const lead = await simpleSales.createLead(req.body);
      res.status(201).json(lead);
    } catch (error) {
      console.error('Error creating lead:', error);
      res.status(500).json({ message: 'Failed to create lead' });
    }
  });

  // Get demos for organization
  app.get('/api/sales/demos/:organizationId', async (req, res) => {
    try {
      const { organizationId } = req.params;
      const demos = await simpleSales.getDemos(organizationId);
      res.json(demos);
    } catch (error) {
      console.error('Error fetching demos:', error);
      res.status(500).json({ message: 'Failed to fetch demos' });
    }
  });

  // Schedule demo
  app.post('/api/sales/demos', async (req, res) => {
    try {
      const demo = await simpleSales.scheduleDemo(req.body);
      res.status(201).json(demo);
    } catch (error) {
      console.error('Error scheduling demo:', error);
      res.status(500).json({ message: 'Failed to schedule demo' });
    }
  });

  // Get sales metrics
  app.get('/api/sales/metrics/:organizationId', async (req, res) => {
    try {
      const { organizationId } = req.params;
      const metrics = await simpleSales.getSalesMetrics(organizationId);
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching sales metrics:', error);
      res.status(500).json({ message: 'Failed to fetch sales metrics' });
    }
  });

  // Generate follow-up email
  app.post('/api/sales/leads/:leadId/generate-email', async (req, res) => {
    try {
      const { leadId } = req.params;
      const emailContent = await simpleSales.generateFollowUpEmail(parseInt(leadId));
      res.json(emailContent);
    } catch (error) {
      console.error('Error generating email:', error);
      res.status(500).json({ message: 'Failed to generate email' });
    }
  });

  // Send follow-up email
  app.post('/api/sales/leads/:leadId/send-email', async (req, res) => {
    try {
      const { leadId } = req.params;
      const result = await simpleSales.sendFollowUpEmail(parseInt(leadId));
      res.json(result);
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ message: 'Failed to send email' });
    }
  });

  // Calendar availability check
  app.post('/api/sales/calendar/check-availability', async (req, res) => {
    try {
      const { startTime, duration, organizationId } = req.body;
      const isAvailable = await calendarService.checkAvailability(
        new Date(startTime), 
        duration, 
        organizationId
      );
      res.json({ available: isAvailable });
    } catch (error) {
      console.error('Error checking availability:', error);
      res.status(500).json({ message: 'Failed to check availability' });
    }
  });

  // Create calendar event
  app.post('/api/sales/calendar/create-event', async (req, res) => {
    try {
      const { organizationId, ...eventData } = req.body;
      eventData.startTime = new Date(eventData.startTime);
      
      const event = await calendarService.createCalendarEvent(eventData, organizationId);
      res.status(201).json(event);
    } catch (error) {
      console.error('Error creating calendar event:', error);
      res.status(500).json({ message: 'Failed to create calendar event' });
    }
  });

  // Get available time slots
  app.get('/api/sales/calendar/available-slots/:organizationId', async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { date, duration } = req.query;
      
      const slots = await calendarService.findAvailableSlots(
        organizationId,
        new Date(date as string),
        parseInt(duration as string) || 60
      );
      
      res.json(slots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      res.status(500).json({ message: 'Failed to fetch available slots' });
    }
  });

  // Start the webhook status pull scheduler
  webhookIntegrationService.startStatusPullScheduler();

  // ============================================
  // AI COMMAND ENGINEER API ROUTES
  // ============================================

  // Process AI command via chat interface
  app.post('/api/ai-command/process', async (req, res) => {
    try {
      const { command, userId, sessionId } = req.body;
      
      if (!command || !userId || !sessionId) {
        return res.status(400).json({ 
          message: 'Missing required fields: command, userId, sessionId' 
        });
      }

      const result = await aiCommandEngineer.processCommand(command, userId, sessionId);
      res.json(result);
    } catch (error) {
      console.error('Error processing AI command:', error);
      res.status(500).json({ message: 'Failed to process AI command' });
    }
  });

  // Get command execution statistics
  app.get('/api/ai-command/stats/:userId?', async (req, res) => {
    try {
      const { userId } = req.params;
      const stats = aiCommandEngineer.getExecutionStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching command stats:', error);
      res.status(500).json({ message: 'Failed to fetch command statistics' });
    }
  });

  // Get available API endpoints library
  app.get('/api/ai-command/endpoints', async (req, res) => {
    try {
      const endpoints = [
        { path: '/api/ai-config', method: 'GET', description: 'Get AI configuration', category: 'AI Management' },
        { path: '/api/ai-config/update', method: 'POST', description: 'Update AI configuration', category: 'AI Management' },
        { path: '/api/call-forwarding', method: 'GET', description: 'Get call forwarding settings', category: 'Call Management' },
        { path: '/api/call-forwarding', method: 'POST', description: 'Update call forwarding settings', category: 'Call Management' },
        { path: '/api/contacts', method: 'GET', description: 'Get contacts list', category: 'Contact Management' },
        { path: '/api/contacts', method: 'POST', description: 'Create new contact', category: 'Contact Management' },
        { path: '/api/system-settings', method: 'GET', description: 'Get system settings', category: 'System Management' },
        { path: '/api/system-settings', method: 'POST', description: 'Update system settings', category: 'System Management' }
      ];
      res.json(endpoints);
    } catch (error) {
      console.error('Error fetching endpoints:', error);
      res.status(500).json({ message: 'Failed to fetch endpoints' });
    }
  });

  // Get frontend routes library
  app.get('/api/ai-command/routes', async (req, res) => {
    try {
      const routes = [
        { path: '/ai-assistant-config', component: 'AI Assistant Config', description: 'Configure AI assistant settings', category: 'AI Management' },
        { path: '/call-forwarding-setup', component: 'Call Forwarding Setup', description: 'Setup call forwarding', category: 'Call Management' },
        { path: '/system-settings', component: 'System Settings', description: 'Configure system settings', category: 'System Management' },
        { path: '/contacts', component: 'Contacts', description: 'Manage contacts', category: 'Contact Management' },
        { path: '/live-calls', component: 'Live Calls', description: 'Monitor active calls', category: 'Call Monitoring' },
        { path: '/analytics', component: 'Analytics', description: 'View analytics dashboard', category: 'Analytics' }
      ];
      res.json(routes);
    } catch (error) {
      console.error('Error fetching routes:', error);
      res.status(500).json({ message: 'Failed to fetch routes' });
    }
  });

  // Webhook endpoints for AI command notifications
  app.post('/api/webhooks/ai-command-executed', async (req, res) => {
    try {
      const { source, event, data } = req.body;
      console.log(`🤖 AI Command executed: ${event}`, data);
      
      // Broadcast to connected WebSocket clients
      broadcast({
        type: 'ai-command-executed',
        data: { event, ...data }
      });
      
      res.json({ message: 'AI command webhook received' });
    } catch (error) {
      console.error('Error processing AI command webhook:', error);
      res.status(500).json({ message: 'Failed to process AI command webhook' });
    }
  });

  app.post('/api/webhooks/config-updated', async (req, res) => {
    try {
      const { source, event, data } = req.body;
      console.log(`⚙️ Configuration updated: ${event}`, data);
      
      // Broadcast to connected WebSocket clients
      broadcast({
        type: 'config-updated',
        data: { event, ...data }
      });
      
      res.json({ message: 'Configuration update webhook received' });
    } catch (error) {
      console.error('Error processing config update webhook:', error);
      res.status(500).json({ message: 'Failed to process config update webhook' });
    }
  });

  app.post('/api/webhooks/greeting-changed', async (req, res) => {
    try {
      const { source, event, data } = req.body;
      console.log(`👋 Greeting changed: ${event}`, data);
      
      // Broadcast to connected WebSocket clients
      broadcast({
        type: 'greeting-changed',
        data: { event, ...data }
      });
      
      res.json({ message: 'Greeting change webhook received' });
    } catch (error) {
      console.error('Error processing greeting change webhook:', error);
      res.status(500).json({ message: 'Failed to process greeting change webhook' });
    }
  });

  app.post('/api/webhooks/navigation-requested', async (req, res) => {
    try {
      const { source, event, data } = req.body;
      console.log(`🧭 Navigation requested: ${event}`, data);
      
      // Broadcast to connected WebSocket clients
      broadcast({
        type: 'navigation-requested',
        data: { event, ...data }
      });
      
      res.json({ message: 'Navigation request webhook received' });
    } catch (error) {
      console.error('Error processing navigation request webhook:', error);
      res.status(500).json({ message: 'Failed to process navigation request webhook' });
    }
  });

  // Todo Category routes
  app.get('/api/todo-categories', async (req, res) => {
    try {
      const userId = 1; // In production, get from authenticated session
      const organizationId = "00000000-0000-0000-0000-000000000001"; // Default organization
      
      const categories = await storage.getTodoCategoriesWithTodos(userId, organizationId);
      res.json(categories);
    } catch (error) {
      console.error('Error fetching todo categories:', error);
      res.status(500).json({ message: 'Failed to fetch todo categories' });
    }
  });

  app.get('/api/todo-categories/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.getTodoCategory(id);
      
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      res.json(category);
    } catch (error) {
      console.error('Error fetching todo category:', error);
      res.status(500).json({ message: 'Failed to fetch todo category' });
    }
  });

  app.post('/api/todo-categories', async (req, res) => {
    try {
      const userId = 1; // In production, get from authenticated session
      const organizationId = "00000000-0000-0000-0000-000000000001"; // Default organization
      
      const categoryData = {
        ...req.body,
        userId: userId,
        organizationId: organizationId
      };
      
      const category = await storage.createTodoCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error('Error creating todo category:', error);
      res.status(500).json({ message: 'Failed to create todo category' });
    }
  });

  app.put('/api/todo-categories/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const category = await storage.updateTodoCategory(id, req.body);
      res.json(category);
    } catch (error) {
      console.error('Error updating todo category:', error);
      res.status(500).json({ message: 'Failed to update todo category' });
    }
  });

  app.delete('/api/todo-categories/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTodoCategory(id);
      res.json({ message: 'Todo category deleted successfully' });
    } catch (error) {
      console.error('Error deleting todo category:', error);
      res.status(500).json({ message: 'Failed to delete todo category' });
    }
  });

  // Todo routes
  app.get('/api/todos', async (req, res) => {
    try {
      const userId = 1; // In production, get from authenticated session
      const organizationId = "00000000-0000-0000-0000-000000000001"; // Default organization
      
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const todos = await storage.getTodos(userId, organizationId, categoryId);
      res.json(todos);
    } catch (error) {
      console.error('Error fetching todos:', error);
      res.status(500).json({ message: 'Failed to fetch todos' });
    }
  });

  app.get('/api/todos/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const todo = await storage.getTodo(id);
      
      if (!todo) {
        return res.status(404).json({ message: 'Todo not found' });
      }
      
      res.json(todo);
    } catch (error) {
      console.error('Error fetching todo:', error);
      res.status(500).json({ message: 'Failed to fetch todo' });
    }
  });

  app.post('/api/todos', async (req, res) => {
    try {
      const userId = 1; // In production, get from authenticated session
      const organizationId = "00000000-0000-0000-0000-000000000001"; // Default organization
      
      const todoData = {
        ...req.body,
        userId: userId,
        organizationId: organizationId
      };
      
      const todo = await storage.createTodo(todoData);
      res.json(todo);
    } catch (error) {
      console.error('Error creating todo:', error);
      res.status(500).json({ message: 'Failed to create todo' });
    }
  });

  app.put('/api/todos/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const todo = await storage.updateTodo(id, req.body);
      res.json(todo);
    } catch (error) {
      console.error('Error updating todo:', error);
      res.status(500).json({ message: 'Failed to update todo' });
    }
  });

  app.delete('/api/todos/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTodo(id);
      res.json({ message: 'Todo deleted successfully' });
    } catch (error) {
      console.error('Error deleting todo:', error);
      res.status(500).json({ message: 'Failed to delete todo' });
    }
  });

  // AI Assistant routes
  app.post('/api/ai/command', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      const { message, conversationId } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const result = await aiAssistantService.processCommand(
        message,
        userId,
        organizationId,
        conversationId
      );

      res.json(result);
    } catch (error: any) {
      console.error('Error processing AI command:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to process command' 
      });
    }
  });

  app.get('/api/ai/conversations', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;

      const conversations = await storage.getAIConversations(userId, organizationId);
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  app.get('/api/ai/conversations/:id', requireAuth, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;
      
      const conversation = await storage.getAIConversation(conversationId);

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      if (conversation.userId !== userId || conversation.organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const messages = await storage.getAIMessages(conversationId);
      res.json({ conversation, messages });
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  });

  app.get('/api/ai/preferences', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;

      const preferences = await storage.getAIUserPreferences(userId, organizationId);
      res.json(preferences);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      res.status(500).json({ error: 'Failed to fetch preferences' });
    }
  });

  app.put('/api/ai/preferences', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;

      const preferences = await storage.updateAIUserPreferences(
        userId,
        organizationId,
        req.body
      );
      res.json(preferences);
    } catch (error) {
      console.error('Error updating preferences:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });

  app.get('/api/ai/commands', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;

      const commands = await storage.getAICommandLogs(userId, organizationId);
      res.json(commands);
    } catch (error) {
      console.error('Error fetching command history:', error);
      res.status(500).json({ error: 'Failed to fetch command history' });
    }
  });

  app.get('/api/ai/reminders', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const organizationId = req.user!.organizationId;

      const reminders = await storage.getAIReminders(userId, organizationId);
      res.json(reminders);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      res.status(500).json({ error: 'Failed to fetch reminders' });
    }
  });

  app.put('/api/ai/reminders/:id', async (req, res) => {
    try {
      const reminderId = parseInt(req.params.id);
      const reminder = await storage.updateAIReminder(reminderId, req.body);
      res.json(reminder);
    } catch (error) {
      console.error('Error updating reminder:', error);
      res.status(500).json({ error: 'Failed to update reminder' });
    }
  });

  // ─── Realtime Voice AI Endpoints ───────────────────────────────────────

  /**
   * TwiML endpoint: Connect an incoming call to the AI voice agent via Media Streams.
   * Configure your Twilio phone number webhook to POST to /api/twilio/voice-ai
   * instead of /api/twilio/voice to use the realtime AI voice agent.
   */
  app.post('/api/twilio/voice-ai', async (req, res) => {
    try {
      const { From, To, CallSid } = req.body;
      const persona = req.query.persona as string || 'receptionist';

      console.log(`[Voice AI] Incoming call ${CallSid} from ${From} → AI agent (${persona})`);

      // Create call record
      await storage.createCall({
        callSid: CallSid,
        from: From,
        to: To,
        status: 'in-progress',
        direction: 'inbound',
        organizationId: '88872271-d973-49c5-a3bd-6d4fc18c60f2',
        callerName: req.body.CallerName,
        startTime: new Date(),
        aiHandled: true,
        forwarded: false,
      });

      // Build WebSocket URL for Media Streams
      const host = req.headers.host || 'localhost:5000';
      const protocol = host.includes('replit') || host.includes('https') ? 'wss' : 'wss';
      const wsUrl = `${protocol}://${host}/media-stream?persona=${persona}`;

      const twiml = new twilio.twiml.VoiceResponse();

      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US',
      }, 'One moment please.');

      twiml.pause({ length: 0 });

      const connect = twiml.connect();
      connect.stream({
        url: wsUrl,
        statusCallbackEvent: ['connected', 'completed'],
      });

      res.type('text/xml');
      res.send(twiml.toString());
    } catch (error) {
      console.error('[Voice AI] Error handling voice-ai webhook:', error);
      // Fallback to standard call handling
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>We're experiencing a temporary issue. Please call back shortly.</Say>
  <Hangup/>
</Response>`);
    }
  });

  /** Get active realtime voice sessions (for dashboard) */
  app.get('/api/voice/sessions', (_req, res) => {
    res.json({
      activeSessions: getActiveVoiceSessions(),
      sessions: getVoiceSessionDetails(),
    });
  });

  /** Get available AI voice personas */
  app.get('/api/voice/personas', (_req, res) => {
    res.json(
      Object.entries(AGENT_PERSONAS).map(([id, prompt]) => {
        const voiceConfig = PERSONA_VOICE_MAP[id];
        return {
          id,
          name: id.charAt(0).toUpperCase() + id.slice(1),
          promptPreview: prompt.substring(0, 100) + '...',
          voice: voiceConfig ? {
            openai: voiceConfig.openaiVoice,
            personaplex: voiceConfig.personaplexVoice,
            gender: voiceConfig.gender,
          } : undefined,
        };
      })
    );
  });

  app.get('/api/agents/anatomy', async (_req, res) => {
    try {
      const { getAgentDNA, getAgentSkills } = await import('./services/agent-anatomy');
      const personas = ['receptionist', 'sales', 'support', 'shre', 'ellie', 'assistant'];

      const agents = personas.map(p => {
        const dna = getAgentDNA(p);
        const skills = getAgentSkills(p);
        const voiceConfig = PERSONA_VOICE_MAP[p];
        return {
          persona: p,
          dna: {
            name: dna.name,
            role: dna.role,
            identity: dna.identity,
            personality: dna.personality,
            values: dna.values,
            communicationStyle: dna.communicationStyle,
            emotionalRange: dna.emotionalRange,
            quirks: dna.quirks,
            greeting: dna.greeting,
            signoff: dna.signoff,
          },
          skills: skills.map(s => ({
            name: s.name,
            description: s.description,
            triggerPatterns: s.triggerPatterns,
            toolName: s.toolName,
          })),
          voice: voiceConfig ? {
            openai: voiceConfig.openaiVoice,
            personaplex: voiceConfig.personaplexVoice,
            gender: voiceConfig.gender,
          } : undefined,
          tools: ['lookup_info', 'transfer_call', 'take_message', 'create_ticket', 'search_contacts', 'get_call_stats', 'schedule_callback', 'create_todo'],
          memory: {
            shortTerm: 'Conversation turns, intent tracking, entity extraction, sentiment analysis',
            longTerm: 'Caller history, VIP status, previous call summaries, preferences',
            working: 'Active tool results, knowledge base cache, escalation risk scoring',
          },
        };
      });

      res.json(agents);
    } catch (error) {
      console.error('[Agents] Failed to get agent anatomy:', error);
      res.status(500).json({ error: 'Failed to load agent anatomy' });
    }
  });

  /** Browser-based voice: get a session token for direct WebRTC (OpenAI Realtime) */
  app.post('/api/voice/browser-session', async (req, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: 'Voice AI not configured — OPENAI_API_KEY missing' });
      }

      const { persona = 'assistant' } = req.body;

      const voiceConfig = PERSONA_VOICE_MAP[persona] || PERSONA_VOICE_MAP.assistant;

      const { createAgent } = await import('./services/agent-anatomy');
      const browserAgent = createAgent(persona, `browser-${Date.now()}`);
      const agentPrompt = browserAgent.buildSystemPrompt();

      const tokenRes = await fetch('https://api.openai.com/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview-2024-12-17',
          voice: voiceConfig.openaiVoice,
          instructions: agentPrompt,
          modalities: ['text', 'audio'],
          temperature: 0.8,
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        console.error('[Voice AI] Failed to get ephemeral token:', err);
        return res.status(502).json({ error: 'Failed to create voice session' });
      }

      const sessionData = await tokenRes.json();
      res.json(sessionData);
    } catch (error) {
      console.error('[Voice AI] Browser session error:', error);
      res.status(500).json({ error: 'Failed to create browser voice session' });
    }
  });

  return httpServer;
}
