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
import { storage } from '../storage';
import { ConversationAgent, createAgent, getAgentDNA } from './agent-anatomy';
import { notifyMissedCall, notifyCallSummary } from './sms-alerts';

const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime';
const OPENAI_MODEL = 'gpt-4o-realtime-preview-2024-12-17';

export const PERSONA_VOICE_MAP: Record<string, { openaiVoice: string; personaplexVoice: string; gender: string }> = {
  receptionist: { openaiVoice: 'shimmer', personaplexVoice: 'NATF2', gender: 'female' },
  sales:        { openaiVoice: 'echo',    personaplexVoice: 'NATM0', gender: 'male' },
  support:      { openaiVoice: 'coral',   personaplexVoice: 'NATF1', gender: 'female' },
  shre:         { openaiVoice: 'ash',     personaplexVoice: 'VARM0', gender: 'male' },
  ellie:        { openaiVoice: 'sage',    personaplexVoice: 'VARF0', gender: 'female' },
  assistant:    { openaiVoice: 'ballad',  personaplexVoice: 'NATF0', gender: 'female' },
};

export const AGENT_PERSONAS: Record<string, string> = {};

for (const [persona] of Object.entries(PERSONA_VOICE_MAP)) {
  const dna = getAgentDNA(persona);
  AGENT_PERSONAS[persona] = `You are ${dna.name}. ${dna.identity}\nPersonality: ${dna.personality.join(', ')}\nValues: ${dna.values.join('. ')}\nStyle: ${dna.communicationStyle}`;
}

interface MediaStreamSession {
  streamSid: string;
  callSid: string;
  openaiWs: WS | null;
  twilioWs: WS;
  persona: string;
  startTime: number;
  agent: ConversationAgent;
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

          case 'start': {
            const agent = createAgent(persona, msg.start.callSid);
            session = {
              streamSid: msg.start.streamSid,
              callSid: msg.start.callSid,
              openaiWs: null,
              twilioWs,
              persona,
              startTime: Date.now(),
              agent,
            };
            activeSessions.set(msg.start.streamSid, session);

            console.log(`[Voice Bridge] Stream started: ${msg.start.streamSid}, agent: ${agent.dna.name} (${agent.dna.role})`);

            const callerPhone = msg.start.customParameters?.From || null;
            if (callerPhone) {
              await agent.loadCallerContext(callerPhone);
              console.log(`[Voice Bridge] Loaded caller context: ${agent.memory.longTerm.callerName || 'unknown'}, VIP: ${agent.memory.longTerm.isVip}, prev calls: ${agent.memory.longTerm.previousCalls}`);
            }

            await connectToOpenAI(session);
            break;
          }

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

    const agent = session.agent;
    const systemPrompt = agent.buildSystemPrompt();
    const tools = agent.getToolDefinitions();

    openaiWs.send(JSON.stringify({
      type: 'session.update',
      session: {
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        input_audio_format: 'g711_ulaw',
        output_audio_format: 'g711_ulaw',
        voice: PERSONA_VOICE_MAP[session.persona]?.openaiVoice || 'shimmer',
        instructions: systemPrompt,
        modalities: ['text', 'audio'],
        temperature: 0.8,
        tools,
      },
    }));

    console.log(`[Voice Bridge] Agent ${agent.dna.name} initialized with ${tools.length} tools, ${agent.skills.length} skills`);
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
          if (msg.transcript) {
            session.agent.addTurn('assistant', msg.transcript);
            console.log(`[Voice Bridge] ${session.agent.dna.name} said: ${msg.transcript.substring(0, 80)}...`);
          }
          break;

        case 'input_audio_buffer.speech_started':
          console.log('[Voice Bridge] User started speaking');
          if (session.twilioWs.readyState === WS.OPEN) {
            session.twilioWs.send(JSON.stringify({
              event: 'clear',
              streamSid: session.streamSid,
            }));
          }
          break;

        case 'conversation.item.input_audio_transcription.completed':
          if (msg.transcript) {
            session.agent.addTurn('user', msg.transcript);
            console.log(`[Voice Bridge] Caller said: ${msg.transcript.substring(0, 80)}...`);

            if (session.agent.memory.working.escalationRisk > 60) {
              console.log(`[Voice Bridge] ⚠ Escalation risk: ${session.agent.memory.working.escalationRisk}%`);
            }
          }
          break;

        case 'response.function_call_arguments.done':
          handleToolCall(session, msg.name, msg.call_id, msg.arguments);
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

async function handleToolCall(
  session: MediaStreamSession,
  functionName: string,
  callId: string,
  argsJson: string
): Promise<void> {
  const result = await session.agent.handleToolCall(functionName, argsJson);

  if (session.openaiWs?.readyState === WS.OPEN) {
    session.openaiWs.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId || functionName,
        output: result,
      },
    }));

    session.openaiWs.send(JSON.stringify({
      type: 'response.create',
    }));
  }
}

async function cleanupSession(session: MediaStreamSession | null): Promise<void> {
  if (!session) return;

  const agent = session.agent;
  const duration = Math.round((Date.now() - session.startTime) / 1000);
  const turnCount = agent.memory.working.turnCount;

  console.log(`[Voice Bridge] Cleaning up session ${session.streamSid} — ${agent.dna.name} (${agent.dna.role}), ${turnCount} turns, ${duration}s`);

  await agent.saveConversationState();

  const callerPhone = agent.memory.longTerm.callerPhone || 'unknown';
  const toolsUsed = [...new Set(agent.memory.working.toolResults.map(t => t.tool))];

  if (turnCount === 0 || duration < 5) {
    notifyMissedCall(callerPhone, agent.memory.longTerm.callerName || undefined).catch(() => {});
  } else {
    notifyCallSummary(
      agent.dna.name,
      callerPhone,
      turnCount,
      duration,
      agent.memory.shortTerm.sentiment,
      toolsUsed
    ).catch(() => {});
  }

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
  agentName: string;
  durationSec: number;
  turnCount: number;
  sentiment: string;
  escalationRisk: number;
  toolsUsed: string[];
}> {
  return Array.from(activeSessions.values()).map(s => ({
    streamSid: s.streamSid,
    callSid: s.callSid,
    persona: s.persona,
    agentName: s.agent.dna.name,
    durationSec: Math.round((Date.now() - s.startTime) / 1000),
    turnCount: s.agent.memory.working.turnCount,
    sentiment: s.agent.memory.shortTerm.sentiment,
    escalationRisk: s.agent.memory.working.escalationRisk,
    toolsUsed: [...new Set(s.agent.memory.working.toolResults.map(t => t.tool))],
  }));
}
