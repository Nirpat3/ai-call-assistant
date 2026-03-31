import { WebSocket, WebSocketServer } from "ws";
import type { Server } from "http";
import { storage } from "../storage";
import type { InsertNotification, Notification, Call, Contact, SMSMessage } from "@shared/schema";

export type WebSocketEventType = 
  | 'connected'
  | 'notification'
  | 'call_update'
  | 'call_new'
  | 'call_ended'
  | 'contact_update'
  | 'contact_new'
  | 'contact_deleted'
  | 'sms_new'
  | 'sms_update'
  | 'voicemail_new'
  | 'agent_status'
  | 'conversation_update'
  | 'system';

export interface WebSocketMessage {
  type: WebSocketEventType;
  data?: any;
  message?: string;
  timestamp: string;
}

export class NotificationService {
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, { userId?: number; organizationId?: string }>();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    
    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.set(ws, {});
      console.log('Client connected to WebSocket');
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'auth' && message.userId) {
            this.clients.set(ws, { 
              userId: message.userId, 
              organizationId: message.organizationId 
            });
            console.log(`WebSocket authenticated for user ${message.userId}`);
          }
          if (message.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch (e) {
          // Ignore parse errors
        }
      });
      
      ws.on('close', () => {
        this.clients.delete(ws);
        console.log('Client disconnected from WebSocket');
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
      
      // Send welcome message
      this.sendTo(ws, {
        type: 'connected',
        message: 'Connected to real-time update server',
        timestamp: new Date().toISOString()
      });
    });
  }

  private sendTo(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        this.clients.delete(ws);
      }
    }
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const created = await storage.createNotification(notification);
      
      // Broadcast to all connected clients
      this.broadcast({
        type: 'notification',
        data: created
      });
      
      return created;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async createCallNotification(callSid: string, callerNumber: string, type: 'incoming' | 'missed' | 'completed') {
    const notification: InsertNotification = {
      type: 'call',
      title: type === 'incoming' ? 'Incoming Call' : type === 'missed' ? 'Missed Call' : 'Call Completed',
      message: `Call from ${callerNumber}`,
      priority: type === 'missed' ? 'high' : 'medium',
      actionUrl: `/call-log`,
      isRead: false
    };

    return this.createNotification(notification);
  }

  async createVoicemailNotification(callerNumber: string, transcription?: string) {
    const notification: InsertNotification = {
      type: 'voicemail',
      title: 'New Voicemail',
      message: transcription ? `${callerNumber}: ${transcription.substring(0, 100)}...` : `New voicemail from ${callerNumber}`,
      priority: 'high',
      actionUrl: `/voicemails`,
      isRead: false
    };

    return this.createNotification(notification);
  }

  async createSystemNotification(title: string, message: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') {
    const notification: InsertNotification = {
      type: 'system',
      title,
      message,
      priority,
      isRead: false
    };

    return this.createNotification(notification);
  }

  private broadcast(message: WebSocketMessage, organizationId?: string) {
    this.clients.forEach((metadata, client) => {
      if (client.readyState === WebSocket.OPEN) {
        if (organizationId && metadata.organizationId && metadata.organizationId !== organizationId) {
          return;
        }
        this.sendTo(client, message);
      }
    });
  }

  broadcastCallUpdate(call: Call, eventType: 'call_new' | 'call_update' | 'call_ended' = 'call_update') {
    this.broadcast({
      type: eventType,
      data: call,
      timestamp: new Date().toISOString()
    }, call.organizationId || undefined);
  }

  broadcastContactUpdate(contact: Contact, eventType: 'contact_new' | 'contact_update' | 'contact_deleted' = 'contact_update') {
    this.broadcast({
      type: eventType,
      data: contact,
      timestamp: new Date().toISOString()
    }, contact.organizationId || undefined);
  }

  broadcastSMSUpdate(sms: SMSMessage, eventType: 'sms_new' | 'sms_update' = 'sms_new') {
    this.broadcast({
      type: eventType,
      data: sms,
      timestamp: new Date().toISOString()
    }, sms.organizationId || undefined);
  }

  broadcastVoicemailNew(voicemail: any) {
    this.broadcast({
      type: 'voicemail_new',
      data: voicemail,
      timestamp: new Date().toISOString()
    });
  }

  broadcastAgentStatus(agentId: string, status: 'available' | 'busy' | 'offline', organizationId?: string) {
    this.broadcast({
      type: 'agent_status',
      data: { agentId, status },
      timestamp: new Date().toISOString()
    }, organizationId);
  }

  broadcastConversationUpdate(conversationState: any) {
    this.broadcast({
      type: 'conversation_update',
      data: conversationState,
      timestamp: new Date().toISOString()
    }, conversationState.organizationId);
  }

  broadcastSystem(message: string, data?: any) {
    this.broadcast({
      type: 'system',
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  getConnectedClients(): number {
    return this.clients.size;
  }

  async getNotifications(): Promise<Notification[]> {
    return storage.getNotifications();
  }

  async markAsRead(id: number): Promise<Notification> {
    return storage.updateNotification(id, { isRead: true });
  }

  async markAllAsRead(): Promise<void> {
    const notifications = await storage.getNotifications();
    const unreadNotifications = notifications.filter(n => !n.isRead);
    
    for (const notification of unreadNotifications) {
      await storage.updateNotification(notification.id, { isRead: true });
    }
  }

  async deleteNotification(id: number): Promise<void> {
    return storage.deleteNotification(id);
  }
}

export const notificationService = new NotificationService();