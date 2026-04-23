import twilio from "twilio";
import { storage } from "./storage";
import { agentRouter } from "./ai-agents";
import { humanGreetingSystem } from "./human-greetings";
import { receptionistAI } from "./services/ReceptionistAIService";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

let twilioClient: twilio.Twilio;

if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
}

export interface CallWebhookData {
  CallSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  RecordingUrl?: string;
  Duration?: string;
  CallerName?: string;
}

export async function handleIncomingCall(webhookData: CallWebhookData) {
  try {
    // Check if caller is a known contact and get routing rules
    console.log("Checking contact for phone:", webhookData.From);
    const contact = await storage.getContactByPhone(webhookData.From);
    console.log("Found contact:", contact?.firstName, contact?.lastName);
    
    // Get contact-specific routing rules
    const contactRoutes = await storage.getContactRoutesForPhone(webhookData.From, "88872271-d973-49c5-a3bd-6d4fc18c60f2");
    console.log("Contact routes found:", contactRoutes.length);
    
    // Block spam calls immediately
    if (contact?.isSpam) {
      console.log(`Blocking spam call from ${webhookData.From}`);
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.hangup();
      
      // Log the blocked call
      await storage.createCall({
        callSid: webhookData.CallSid,
        from: webhookData.From,
        to: webhookData.To,
        status: "blocked",
        direction: webhookData.Direction,
        organizationId: "88872271-d973-49c5-a3bd-6d4fc18c60f2",
        callerName: `${contact.firstName} ${contact.lastName}`.trim(),
        startTime: new Date(),
        aiHandled: false,
        forwarded: false
      });
      
      return twiml.toString();
    }
    
    const existingCall = await storage.getCallBySid(webhookData.CallSid);
    
    if (!existingCall) {
      // Create new call record with contact information
      await storage.createCall({
        callSid: webhookData.CallSid,
        from: webhookData.From,
        to: webhookData.To,
        status: webhookData.CallStatus,
        direction: webhookData.Direction || "inbound",
        organizationId: "88872271-d973-49c5-a3bd-6d4fc18c60f2",
        callerName: contact ? `${contact.firstName} ${contact.lastName}`.trim() : webhookData.CallerName,
        startTime: new Date(),
        aiHandled: contactRoutes.length === 0 || contactRoutes[0]?.action === "ai",
        forwarded: contactRoutes.length > 0 && contactRoutes[0]?.action === "forward"
      });
    } else {
      // Update existing call
      await storage.updateCall(existingCall.id, {
        status: webhookData.CallStatus,
        duration: webhookData.Duration ? parseInt(webhookData.Duration) : undefined,
        endTime: webhookData.CallStatus === "completed" ? new Date() : undefined
      });
    }

    // Generate TwiML response based on contact routing rules
    const twiml = new twilio.twiml.VoiceResponse();
    
    if (webhookData.CallStatus === "ringing") {
      // Apply contact-specific routing if available
      if (contactRoutes.length > 0) {
        const primaryRoute = contactRoutes[0];
        
        switch (primaryRoute.action) {
          case "block":
            twiml.say("This number is currently blocked.");
            twiml.hangup();
            return twiml.toString();
            
          case "voicemail":
            const vmGreeting = contact?.isVip 
              ? `Hello ${contact.firstName}, please leave your message after the tone.`
              : "Please leave your message after the tone.";
            twiml.say(vmGreeting);
            twiml.redirect("/api/twilio/voicemail");
            return twiml.toString();
            
          case "forward":
            if (primaryRoute.forwardTo) {
              const forwardGreeting = contact?.isVip
                ? `Hello ${contact.firstName}, transferring you now.`
                : "Please hold while I transfer your call.";
              twiml.say(forwardGreeting);
              twiml.dial(primaryRoute.forwardTo);
              return twiml.toString();
            }
            break;
            
          case "ai":
          default:
            // Use the new AI Receptionist service for natural conversation
            const { receptionistAI } = await import('./services/ReceptionistAIService');
            
            const aiResponse = await receptionistAI.handleIncomingCall(
              webhookData.CallSid,
              webhookData.From,
              contact ? `${contact.firstName} ${contact.lastName}`.trim() : webhookData.CallerName
            );
            
            twiml.say(aiResponse.text);
            
            if (aiResponse.action === 'continue') {
              twiml.gather({
                input: ['speech'],
                speechTimeout: '5',
                speechModel: 'phone_call',
                enhanced: true,
                action: `/api/twilio/call-gather`
              });
              
              twiml.say("I didn't hear anything. Please speak clearly, or I can transfer you to a representative.");
              
              twiml.redirect(`/api/twilio/call-gather`);
            } else if (aiResponse.action === 'transfer' && aiResponse.transferTo) {
              twiml.say("Please hold while I transfer you to the right person.");
              
              twiml.dial(aiResponse.transferTo);
            } else if (aiResponse.action === 'end_call') {
              twiml.hangup();
            }
            
            return twiml.toString();
            break;
        }
      }
      
      // === NEW: Route unknown callers to the AI Receptionist for natural conversation ===
      // (Removes old DTMF menu fallback; LLM now handles all unrouted calls.)
      const { receptionistAI } = await import('./services/ReceptionistAIService');
      const aiResponse = await receptionistAI.handleIncomingCall(
        webhookData.CallSid,
        webhookData.From,
        contact ? `${contact.firstName} ${contact.lastName}`.trim() : webhookData.CallerName,
        webhookData.To,
      );

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
        twiml.say({ voice: 'Polly.Joanna-Neural' }, "I didn't catch that. Are you still there?");
        twiml.redirect('/api/twilio/call-gather');
      } else if (aiResponse.action === 'transfer' && aiResponse.transferTo) {
        twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Please hold while I connect you.');
        twiml.dial(aiResponse.transferTo);
      } else {
        twiml.hangup();
      }

      return twiml.toString();

      // Legacy DTMF-menu path retained for reference (unreachable)
      const aiConfig = await storage.getAiConfig();
      console.log("AI Config loaded:", {
        useAdvancedConversation: aiConfig?.useAdvancedConversation,
        greeting: aiConfig?.greeting?.substring(0, 50) + "...",
        configExists: !!aiConfig
      });

      // Standard AI routing with menu options
      const gather = twiml.gather({
        input: ["speech", "dtmf"],
        timeout: 10,
        speechTimeout: "auto",
        action: "/api/twilio/gather",
        method: "POST"
      });
      
      // Generate dynamic, human-like greeting
      let fullMessage;
      
      // Check if advanced conversation is enabled
      if (aiConfig?.useAdvancedConversation === true) {
        try {
          // Use advanced human greeting system when enabled
          console.log("Using advanced conversation framework for caller:", webhookData.From);
          
          if (humanGreetingSystem && typeof humanGreetingSystem.analyzeCallerContext === 'function') {
            const callHistory = await storage.getCallsByPhone(webhookData.From);
            const greetingContext = await humanGreetingSystem.analyzeCallerContext(
              webhookData.From, 
              callHistory
            );
            
            const dynamicGreeting = await humanGreetingSystem.generateDynamicGreeting(greetingContext);
            
            // Use only the greeting part to avoid double questions
            const completeGreeting = `${dynamicGreeting.greeting} You can press 1 for sales, 2 for support, 3 for voicemail, or 0 to continue with AI assistance.`;
            fullMessage = humanGreetingSystem.addNaturalSpeechPatterns(completeGreeting);
            
            console.log("Generated dynamic greeting:", fullMessage);
          } else {
            console.log("humanGreetingSystem not available, falling back to custom greeting");
            throw new Error("humanGreetingSystem not available");
          }
        } catch (error) {
          console.error("Error generating dynamic greeting:", error);
          // Fallback to custom greeting if dynamic greeting fails
          const greeting = aiConfig?.greeting || "Hello! You've reached our AI assistant.";
          fullMessage = `${greeting} You can press 1 for sales, 2 for support, 3 for voicemail, or 0 to continue with AI assistance.`;
        }
      } else {
        // Advanced conversation is disabled - use custom greeting as default
        console.log("Advanced conversation disabled, using custom greeting");
        console.log("AI Config greeting:", aiConfig?.greeting);
        console.log("useAdvancedConversation value:", aiConfig?.useAdvancedConversation);
        
        if (aiConfig?.greeting && aiConfig.greeting.trim().length > 0) {
          // Use custom greeting when available
          console.log("Using custom AI greeting:", aiConfig.greeting);
          fullMessage = `${aiConfig.greeting} You can press 1 for sales, 2 for support, 3 for voicemail, or 0 to continue with AI assistance.`;
        } else {
          // Use traditional greeting when no custom greeting is set
          if (contact) {
            if (contact.isVip) {
              fullMessage = `Hello ${contact.firstName}, welcome back! I'm your AI assistant. Please tell me how I can assist you today, or press 1 for sales, 2 for support, or 0 to continue speaking with me.`;
            } else {
              fullMessage = `Hello ${contact.firstName}, thank you for calling. I'm here to assist you. You can press 1 for sales, 2 for support, 3 for voicemail, or 0 to continue with AI assistance.`;
            }
          } else {
            // Default fallback greeting for unknown callers
            fullMessage = "Hello! You've reached our AI assistant. How can I help you today? You can also press 1 for sales, 2 for support, 3 for voicemail, or 0 to continue speaking with me.";
          }
        }
      }
      
      gather.say({
        voice: "Polly.Joanna"
      }, fullMessage);
    }
    
    return twiml.toString();
  } catch (error) {
    console.error("Error handling incoming call:", error);
    
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say("Thank you for calling. Due to a temporary system issue, please leave your message after the tone and we'll get back to you promptly.");
    twiml.record({
      action: "/api/twilio/recording",
      method: "POST",
      maxLength: 120,
      transcribe: true
    });
    
    return twiml.toString();
  }
}

export async function handleCallGather(webhookData: CallWebhookData & { SpeechResult?: string; Digits?: string; RecordingUrl?: string }) {
  try {
    let call = await storage.getCallBySid(webhookData.CallSid);
    
    // Create call record if it doesn't exist (webhook timing issue)
    if (!call) {
      call = await storage.createCall({
        callSid: webhookData.CallSid,
        from: webhookData.From,
        to: webhookData.To,
        status: webhookData.CallStatus || "in-progress",
        direction: webhookData.Direction || "inbound",
        organizationId: "88872271-d973-49c5-a3bd-6d4fc18c60f2",
        startTime: new Date(),
        aiHandled: true,
        forwarded: false
      });
    }

    const userInput = webhookData.SpeechResult || webhookData.Digits || "";
    console.log(`Processing user input: "${userInput}" for call ${webhookData.CallSid}`);

    // Handle DTMF menu selections first
    if (webhookData.Digits) {
      return handleDTMFInput(webhookData.Digits, webhookData);
    }

    // If no speech input, fall back to voicemail
    if (!userInput.trim()) {
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.redirect("/api/twilio/voicemail");
      return twiml.toString();
    }

    try {
      // Process with AI agent router
      const result = await agentRouter.processCall(
        webhookData.CallSid,
        webhookData.From,
        userInput
      );

      // Generate TwiML response based on agent output
      const twiml = new twilio.twiml.VoiceResponse();
      
      if (result.shouldTransfer && result.transferTo === 'voicemail-agent') {
        // Transfer to voicemail recording
        twiml.say({ voice: 'alice' }, result.response);
        twiml.record({
          timeout: 10,
          transcribe: true,
          recordingStatusCallback: `/api/twilio/recording`,
          maxLength: 120,
          playBeep: true
        });
      } else if (result.shouldTransfer && result.transferTo === 'sales-agent') {
        // Transfer to sales department with immediate connection
        twiml.say({ 
          voice: 'alice',
          language: 'en-US'
        }, result.response);
        twiml.say({ 
          voice: 'alice',
          language: 'en-US'
        }, "Connecting you to our sales team now.");
        const salesDial = twiml.dial({
          timeout: 30,
          action: '/api/twilio/dial-callback',
          method: 'POST',
          callerId: process.env.TWILIO_PHONE_NUMBER,
          ringTone: 'us'
        });
        salesDial.number(process.env.SALES_PHONE || '+14045901101');
      } else if (result.shouldTransfer && result.transferTo === 'support-agent') {
        // Transfer to support department with immediate connection
        twiml.say({ 
          voice: 'alice',
          language: 'en-US'
        }, result.response);
        twiml.say({ 
          voice: 'alice',
          language: 'en-US'
        }, "Connecting you to our technical support team now.");
        const supportDial = twiml.dial({
          timeout: 30,
          action: '/api/twilio/dial-callback',
          method: 'POST',
          callerId: process.env.TWILIO_PHONE_NUMBER,
          ringTone: 'us'
        });
        supportDial.number(process.env.SUPPORT_PHONE || '+18887274302');
      } else if (result.shouldTransfer && result.transferTo) {
        // Continue conversation with new agent
        twiml.say({ voice: 'alice' }, result.response);
        twiml.gather({
          input: ['speech'],
          timeout: 10,
          speechTimeout: 'auto',
          action: '/api/twilio/gather',
          method: 'POST'
        });
      } else {
        // Continue with current agent
        twiml.say({ voice: 'alice' }, result.response);
        twiml.gather({
          input: ['speech'],
          timeout: 10,
          speechTimeout: 'auto',
          action: '/api/twilio/gather',
          method: 'POST'
        });
      }

      return twiml.toString();
    } catch (aiError) {
      console.error("AI processing failed:", aiError);
      
      // Keyword-based fallback when AI is unavailable
      const lowerInput = userInput.toLowerCase();
      const twiml = new twilio.twiml.VoiceResponse();
      
      if (lowerInput.includes('sales') || lowerInput.includes('pricing') || lowerInput.includes('buy') || lowerInput.includes('purchase')) {
        twiml.say({ voice: 'alice' }, "I understand you're interested in sales. Let me connect you with our sales team.");
        const dial = twiml.dial({
          timeout: 30,
          action: '/api/twilio/dial-callback',
          method: 'POST',
          callerId: process.env.TWILIO_PHONE_NUMBER
        });
        dial.number(process.env.SALES_PHONE || '+14045901101');
      } else if (lowerInput.includes('support') || lowerInput.includes('help') || lowerInput.includes('problem') || lowerInput.includes('issue')) {
        twiml.say({ voice: 'alice' }, "I can help you with support. Let me transfer you to our technical support team.");
        const dial = twiml.dial({
          timeout: 30,
          action: '/api/twilio/dial-callback',
          method: 'POST',
          callerId: process.env.TWILIO_PHONE_NUMBER
        });
        dial.number(process.env.SUPPORT_PHONE || '+18887274302');
      } else if (lowerInput.includes('voicemail') || lowerInput.includes('message') || lowerInput.includes('leave a message')) {
        twiml.redirect("/api/twilio/voicemail");
      } else {
        // Ask for clarification with options
        twiml.say({ voice: 'alice' }, "I understand you need assistance. To help you better, please say 'sales' for sales inquiries, 'support' for technical help, or 'voicemail' to leave a message.");
        twiml.gather({
          input: ['speech'],
          timeout: 10,
          speechTimeout: 'auto',
          action: '/api/twilio/gather',
          method: 'POST'
        });
      }
      
      return twiml.toString();
    }

  } catch (error) {
    console.error("Error in handleCallGather:", error);
    
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say("I apologize for the technical difficulty. Please leave your message after the tone.");
    twiml.redirect("/api/twilio/voicemail");
    return twiml.toString();
  }
}

function handleDTMFInput(digits: string, webhookData: CallWebhookData): string {
  const twiml = new twilio.twiml.VoiceResponse();
  
  switch (digits) {
    case "1":
      // Immediate transfer without delay
      const salesDial = twiml.dial({
        timeout: 30,
        action: "/api/twilio/dial-callback",
        method: "POST",
        callerId: process.env.TWILIO_PHONE_NUMBER,
        ringTone: 'us'
      });
      salesDial.number("+1404-590-1101");
      break;
      
    case "2":
      // Immediate transfer to support department
      twiml.say({ voice: 'alice' }, "Connecting you to our support team now.");
      const supportDial = twiml.dial({
        timeout: 30,
        action: "/api/twilio/dial-callback", 
        method: "POST",
        callerId: process.env.TWILIO_PHONE_NUMBER,
        ringTone: 'us'
      });
      supportDial.number("+1888-727-4302");
      break;
      
    case "3":
      // Direct voicemail handling with immediate recording
      twiml.say({ 
        voice: 'alice',
        language: 'en-US'
      }, "Please leave your detailed message after the beep.");
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
      break;
    
    case "0":
      // Continue AI conversation
      twiml.say({ voice: 'alice' }, "Great, let me continue helping you. Please tell me what you need assistance with.");
      twiml.gather({
        input: ['speech', 'dtmf'],
        timeout: 10,
        speechTimeout: 'auto',
        action: '/api/twilio/gather',
        method: 'POST'
      });
      twiml.say("I didn't hear anything. Please try again or press 1 for sales, 2 for support.");
      twiml.redirect('/api/twilio/gather');
      break;
      
    default:
      twiml.say("I didn't understand that option. Let me transfer you to someone who can help.");
      twiml.dial(process.env.SALES_PHONE || '+14045901101');
      break;
  }
  
  return twiml.toString();
}

export async function handleVoicemail(webhookData: CallWebhookData) {
  try {
    const twiml = new twilio.twiml.VoiceResponse();
    
    twiml.say({ 
      voice: 'alice',
      language: 'en-US'
    }, "Thank you for calling. Please leave your detailed message after the beep.");
    
    twiml.record({
      action: "/api/twilio/recording",
      method: "POST",
      maxLength: 180, // 3 minutes
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
    
    return twiml.toString();
  } catch (error) {
    console.error("Error handling voicemail:", error);
    
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say("Thank you for calling. Please try again later.");
    twiml.hangup();
    return twiml.toString();
  }
}

export async function handleRecording(webhookData: CallWebhookData & { RecordingUrl?: string; TranscriptionText?: string }) {
  try {
    console.log(`Recording received for call ${webhookData.CallSid}`);
    
    if (webhookData.RecordingUrl) {
      // Find the call and update with recording info
      const call = await storage.getCallBySid(webhookData.CallSid);
      if (call) {
        // Process conversation analysis if transcription is available
        let conversationData = {};
        
        if (webhookData.TranscriptionText) {
          try {
            const { processCallRecording } = await import('./conversation-analysis');
            const analysis = await processCallRecording(
              call.id,
              webhookData.RecordingUrl,
              webhookData.TranscriptionText,
              webhookData.From,
              call.duration || 0
            );
            
            conversationData = {
              conversationBreakdown: analysis.conversationBreakdown,
              sentiment: analysis.sentiment,
              keyTopics: analysis.keyTopics,
              actionItems: analysis.actionItems,
              summary: analysis.summary
            };
            
            const summaryForVoicemail = analysis.summary;
            
            console.log(`Processed conversation analysis for call ${call.id}`);
          } catch (analysisError) {
            console.error(`Error processing conversation analysis for call ${call.id}:`, analysisError);
          }
        }
        
        await storage.updateCall(call.id, {
          recordingUrl: webhookData.RecordingUrl,
          transcription: webhookData.TranscriptionText || null,
          status: "completed",
          endTime: new Date(),
          ...conversationData
        });
        
        // Create voicemail entry for this recording (with deduplication)
        try {
          // Check if voicemail already exists for this call and recording
          const existingVoicemails = await storage.getVoicemails();
          const duplicateVoicemail = existingVoicemails.find(vm => 
            vm.callId === call.id && vm.recordingUrl === webhookData.RecordingUrl
          );
          
          if (duplicateVoicemail) {
            console.log(`Voicemail already exists for call ${call.id} with recording ${webhookData.RecordingUrl}, skipping creation`);
          } else {
            const voicemail = await storage.createVoicemail({
              callId: call.id,
              recordingUrl: webhookData.RecordingUrl,
              transcription: webhookData.TranscriptionText || null,
              summary: (conversationData as any).summary || null,
              processed: webhookData.TranscriptionText ? true : false
            });
            console.log(`Created voicemail entry for call ${call.id}`);
            
            // Automatically start AI transcription if Twilio transcription is not available
            if (!webhookData.TranscriptionText && webhookData.RecordingUrl) {
              try {
                const { processVoicemailRecording } = await import('./voicemail-transcription');
                processVoicemailRecording(voicemail.id, webhookData.RecordingUrl).catch(error => {
                  console.error(`Auto-transcription failed for voicemail ${voicemail.id}:`, error);
                });
                console.log(`Auto-transcription started for voicemail ${voicemail.id}`);
              } catch (transcriptionError) {
                console.error('Error starting auto-transcription:', transcriptionError);
              }
            }
          }
        } catch (voicemailError) {
          console.error(`Error creating voicemail for call ${call.id}:`, voicemailError);
        }
        
        console.log(`Updated call ${call.id} with recording URL and conversation analysis`);
      }
    }
    
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say("Thank you for your message. We'll get back to you soon. Goodbye!");
    twiml.hangup();
    
    return twiml.toString();
  } catch (error) {
    console.error("Error handling recording:", error);
    
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.hangup();
    return twiml.toString();
  }
}

export async function makeOutboundCall(to: string, message: string): Promise<string> {
  try {
    if (!twilioClient) {
      throw new Error("Twilio client not initialized");
    }

    const call = await twilioClient.calls.create({
      url: `${process.env.BASE_URL}/api/twilio/outbound?message=${encodeURIComponent(message)}`,
      to,
      from: process.env.TWILIO_PHONE_NUMBER!
    });

    // Log the outbound call
    await storage.createCall({
      callSid: call.sid,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to,
      status: "initiated",
      direction: "outbound",
      organizationId: "88872271-d973-49c5-a3bd-6d4fc18c60f2",
      startTime: new Date(),
      aiHandled: true,
      forwarded: false
    });

    return call.sid;
  } catch (error) {
    console.error("Error making outbound call:", error);
    throw new Error("Failed to make outbound call");
  }
}