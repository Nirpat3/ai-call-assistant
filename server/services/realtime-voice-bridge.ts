/**
 * Twilio Media Streams ↔ OpenAI Realtime API Bridge
 *
 * Handles full-duplex voice AI conversations over phone calls.
 * Twilio sends raw audio via WebSocket Media Streams → we relay to
 * OpenAI's Realtime API → stream AI audio back to Twilio.
 *
 * Flow:
 *   Caller → Twilio → Media Stream WS → this bridge → OpenAI Realtime WS
 *                                                   ← AI audio ←
 *   Caller ← Twilio ← Media Stream WS ←
 */

import { WebSocket as WS, WebSocketServer } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import { voiceProviderManager } from './voice-provider';

const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime';
const OPENAI_MODEL = 'gpt-4o-realtime-preview-2024-12-17';

// Agent persona prompts for different AI personalities
export const AGENT_PERSONAS: Record<string, string> = {
  receptionist: `You are a professional and warm AI receptionist for a business. You answer incoming calls, help callers with their questions, take messages, and route calls appropriately. Be friendly, concise, and helpful. If you don't know something, offer to take a message or transfer to the right department.`,

  sales: `You are a knowledgeable and enthusiastic sales representative. Help callers understand products and services, answer pricing questions, and guide them toward the right solution. Be persuasive but not pushy. Always listen to the caller's needs first.`,

  support: `You are a patient and thorough technical support agent. Help callers troubleshoot issues step by step. Ask clarifying questions, provide clear instructions, and confirm the issue is resolved before ending the call. If you can't resolve it, escalate with full context.`,

  shre: `You are Shre, the CEO of a cutting-edge AI platform company. You speak with authority, vision, and warmth. You understand technology deeply but explain it simply. You're decisive, strategic, and always thinking about how to create value. Keep responses concise and executive-level.`,

  ellie: `You are Ellie, the President of operations at an AI platform company. You're organized, detail-oriented, and action-focused. You bridge strategy and execution. You ask the right questions and ensure nothing falls through the cracks. Professional but approachable.`,

  assistant: `You are a helpful personal assistant. You help with scheduling, reminders, information lookup, and task management. Be proactive in suggesting solutions and always confirm action items before ending the conversation.`,
};

interface MediaStreamSession {
  streamSid: string;
  callSid: string;
  openaiWs: WS | null;
  twilioWs: WS;
  persona: string;
  startTime: number;
}

const activeSessions = new Map<string, MediaStreamSession>();

/**
 * Initialize the Twilio Media Streams ↔ OpenAI Realtime bridge
 * Attaches a WebSocket upgrade handler to the HTTP server
 */
export function initRealtimeVoiceBridge(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);

    // Only handle /media-stream path (Twilio Media Streams endpoint)
    if (url.pathname === '/media-stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
    // Don't handle other upgrade paths — let NotificationService handle /ws etc.
  });

  wss.on('connection', (twilioWs: WS, request: IncomingMessage) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const persona = url.searchParams.get('persona') || 'receptionist';

    console.log(`[Voice Bridge] New Twilio Media Stream connection, persona: ${persona}`);

    let session: MediaStreamSession | null = null;

    twilioWs.on('message', async (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());

        switch (msg.event) {
          case 'connected':
            console.log('[Voice Bridge] Twilio Media Stream connected');
            break;

          case 'start':
            // Twilio tells us the stream is starting — create OpenAI session
            session = {
              streamSid: msg.start.streamSid,
              callSid: msg.start.callSid,
              openaiWs: null,
              twilioWs,
              persona,
              startTime: Date.now(),
            };
            activeSessions.set(msg.start.streamSid, session);

            console.log(`[Voice Bridge] Stream started: ${msg.start.streamSid}, call: ${msg.start.callSid}`);

            // Connect to OpenAI Realtime API
            await connectToOpenAI(session);
            break;

          case 'media':
            // Forward Twilio audio → OpenAI Realtime
            if (session?.openaiWs?.readyState === WS.OPEN) {
              session.openaiWs.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: msg.media.payload, // base64 mulaw audio
              }));
            }
            break;

          case 'stop':
            console.log(`[Voice Bridge] Stream stopped: ${msg.stop?.streamSid || 'unknown'}`);
            cleanupSession(session);
            break;
        }
      } catch (error) {
        console.error('[Voice Bridge] Error processing Twilio message:', error);
      }
    });

    twilioWs.on('close', () => {
      console.log('[Voice Bridge] Twilio WebSocket closed');
      cleanupSession(session);
    });

    twilioWs.on('error', (error) => {
      console.error('[Voice Bridge] Twilio WebSocket error:', error);
      cleanupSession(session);
    });
  });

  console.log('[Voice Bridge] Realtime voice bridge initialized on /media-stream');
}

/**
 * Connect to OpenAI Realtime API and set up bidirectional audio relay
 */
async function connectToOpenAI(session: MediaStreamSession): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[Voice Bridge] OPENAI_API_KEY not set — cannot create realtime session');
    return;
  }

  const openaiWs = new WS(`${OPENAI_REALTIME_URL}?model=${OPENAI_MODEL}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'OpenAI-Beta': 'realtime=v1',
    },
  });

  session.openaiWs = openaiWs;

  openaiWs.on('open', () => {
    console.log(`[Voice Bridge] Connected to OpenAI Realtime for stream: ${session.streamSid}`);

    // Configure the session
    openaiWs.send(JSON.stringify({
      type: 'session.update',
      session: {
        turn_detection: {
          type: 'server_vad',         // Server-side voice activity detection
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,   // 500ms silence = end of turn
        },
        input_audio_format: 'g711_ulaw',  // Twilio sends mulaw
        output_audio_format: 'g711_ulaw', // Twilio expects mulaw
        voice: 'alloy',                    // OpenAI voice
        instructions: AGENT_PERSONAS[session.persona] || AGENT_PERSONAS.receptionist,
        modalities: ['text', 'audio'],
        temperature: 0.7,
        tools: [
          {
            type: 'function',
            name: 'transfer_call',
            description: 'Transfer the caller to a specific department or person',
            parameters: {
              type: 'object',
              properties: {
                department: {
                  type: 'string',
                  enum: ['sales', 'support', 'billing', 'manager'],
                  description: 'The department to transfer to',
                },
                reason: {
                  type: 'string',
                  description: 'Why the caller needs to be transferred',
                },
              },
              required: ['department'],
            },
          },
          {
            type: 'function',
            name: 'take_message',
            description: 'Record a message for someone who is unavailable',
            parameters: {
              type: 'object',
              properties: {
                for_person: { type: 'string', description: 'Who the message is for' },
                message: { type: 'string', description: 'The message content' },
                callback_number: { type: 'string', description: 'Number to call back' },
                urgency: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
              },
              required: ['message'],
            },
          },
          {
            type: 'function',
            name: 'create_ticket',
            description: 'Create a support ticket or task for follow-up',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Short title for the ticket' },
                description: { type: 'string', description: 'Detailed description of the issue' },
                priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                category: { type: 'string', enum: ['support', 'billing', 'sales', 'general'] },
              },
              required: ['title', 'description'],
            },
          },
          {
            type: 'function',
            name: 'lookup_info',
            description: 'Look up business information like hours, pricing, or availability',
            parameters: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'What information to look up' },
              },
              required: ['query'],
            },
          },
        ],
      },
    }));
  });

  openaiWs.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case 'response.audio.delta':
          // Stream AI audio back to Twilio
          if (session.twilioWs.readyState === WS.OPEN && msg.delta) {
            session.twilioWs.send(JSON.stringify({
              event: 'media',
              streamSid: session.streamSid,
              media: {
                payload: msg.delta, // base64 mulaw audio from OpenAI
              },
            }));
          }
          break;

        case 'response.audio_transcript.done':
          console.log(`[Voice Bridge] AI said: ${msg.transcript?.substring(0, 80)}...`);
          break;

        case 'input_audio_buffer.speech_started':
          console.log('[Voice Bridge] User started speaking');
          // Clear any queued AI audio (barge-in / interruption)
          if (session.twilioWs.readyState === WS.OPEN) {
            session.twilioWs.send(JSON.stringify({
              event: 'clear',
              streamSid: session.streamSid,
            }));
          }
          break;

        case 'conversation.item.input_audio_transcription.completed':
          console.log(`[Voice Bridge] User said: ${msg.transcript?.substring(0, 80)}...`);
          break;

        case 'response.function_call_arguments.done':
          // Handle tool calls from the AI
          handleToolCall(session, msg.name, msg.arguments);
          break;

        case 'error':
          console.error('[Voice Bridge] OpenAI error:', msg.error);
          break;
      }
    } catch (error) {
      console.error('[Voice Bridge] Error processing OpenAI message:', error);
    }
  });

  openaiWs.on('close', (code, reason) => {
    console.log(`[Voice Bridge] OpenAI WebSocket closed: ${code} ${reason}`);
  });

  openaiWs.on('error', (error) => {
    console.error('[Voice Bridge] OpenAI WebSocket error:', error);
  });
}

/**
 * Handle tool/function calls from the AI during conversation
 */
async function handleToolCall(
  session: MediaStreamSession,
  functionName: string,
  argsJson: string
): Promise<void> {
  let args: any;
  try {
    args = JSON.parse(argsJson);
  } catch {
    args = {};
  }

  console.log(`[Voice Bridge] Tool call: ${functionName}`, args);

  let result: string;

  switch (functionName) {
    case 'transfer_call':
      result = `Call transfer initiated to ${args.department}. Reason: ${args.reason || 'caller request'}`;
      // TODO: Actually initiate Twilio call transfer via REST API
      break;

    case 'take_message':
      result = `Message recorded for ${args.for_person || 'the team'}: "${args.message}". Callback: ${args.callback_number || 'not provided'}. Urgency: ${args.urgency || 'normal'}.`;
      // TODO: Persist message to database
      break;

    case 'create_ticket':
      result = `Ticket created: "${args.title}" (${args.priority || 'medium'} priority, ${args.category || 'general'} category). Description: ${args.description}`;
      // TODO: Create ticket via API
      break;

    case 'lookup_info':
      result = `Looking up: ${args.query}. Our business hours are Monday-Friday 9am-6pm EST. For specific pricing or availability, a team member will follow up.`;
      // TODO: Query actual knowledge base
      break;

    default:
      result = `Function ${functionName} completed.`;
  }

  // Send tool result back to OpenAI so it can respond to the caller
  if (session.openaiWs?.readyState === WS.OPEN) {
    session.openaiWs.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: functionName,
        output: result,
      },
    }));

    // Trigger AI to respond with the result
    session.openaiWs.send(JSON.stringify({
      type: 'response.create',
    }));
  }
}

function cleanupSession(session: MediaStreamSession | null): void {
  if (!session) return;

  const duration = Math.round((Date.now() - session.startTime) / 1000);
  console.log(`[Voice Bridge] Cleaning up session ${session.streamSid}, duration: ${duration}s`);

  if (session.openaiWs) {
    session.openaiWs.close();
    session.openaiWs = null;
  }

  activeSessions.delete(session.streamSid);
}

/** Get active voice session count */
export function getActiveVoiceSessions(): number {
  return activeSessions.size;
}

/** Get session details (for dashboard) */
export function getVoiceSessionDetails(): Array<{
  streamSid: string;
  callSid: string;
  persona: string;
  durationSec: number;
}> {
  return Array.from(activeSessions.values()).map(s => ({
    streamSid: s.streamSid,
    callSid: s.callSid,
    persona: s.persona,
    durationSec: Math.round((Date.now() - s.startTime) / 1000),
  }));
}
