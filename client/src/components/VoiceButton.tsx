import { useState, useRef, useCallback } from 'react';

interface VoiceButtonProps {
  persona?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

type VoiceState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

/**
 * Voice conversation button — connects to OpenAI Realtime API via WebRTC
 * for browser-based full-duplex voice AI conversations.
 */
export function VoiceButton({ persona = 'assistant', size = 'md', className = '' }: VoiceButtonProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiText, setAiText] = useState('');
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startVoice = useCallback(async () => {
    try {
      setState('connecting');

      // 1. Get ephemeral session token from our server
      const res = await fetch('/api/voice/browser-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create voice session');
      }

      const session = await res.json();
      const ephemeralKey = session.client_secret?.value;

      if (!ephemeralKey) {
        throw new Error('No ephemeral key received');
      }

      // 2. Set up WebRTC peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Create audio element for AI voice output
      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;

      pc.ontrack = (event) => {
        audio.srcObject = event.streams[0];
      };

      // 3. Capture microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // 4. Create data channel for events (transcripts, tool calls, etc.)
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'conversation.item.input_audio_transcription.completed') {
            setTranscript(msg.transcript || '');
          }
          if (msg.type === 'response.audio_transcript.done') {
            setAiText(msg.transcript || '');
          }
          if (msg.type === 'input_audio_buffer.speech_started') {
            setState('listening');
          }
          if (msg.type === 'response.audio.delta') {
            setState('speaking');
          }
          if (msg.type === 'input_audio_buffer.speech_stopped') {
            setState('speaking'); // AI about to respond
          }
        } catch { /* ignore non-JSON */ }
      };

      dc.onopen = () => {
        setState('listening');
      };

      // 5. Create offer and connect to OpenAI Realtime via WebRTC
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!sdpRes.ok) {
        throw new Error('Failed to establish WebRTC connection');
      }

      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: await sdpRes.text(),
      };
      await pc.setRemoteDescription(answer);

    } catch (error: any) {
      console.error('[VoiceButton] Error:', error);
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }, [persona]);

  const stopVoice = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    setState('idle');
    setTranscript('');
    setAiText('');
  }, []);

  const toggleVoice = () => {
    if (state === 'idle' || state === 'error') {
      startVoice();
    } else {
      stopVoice();
    }
  };

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  const stateColors = {
    idle: 'bg-blue-500 hover:bg-blue-600',
    connecting: 'bg-yellow-500 animate-pulse',
    listening: 'bg-green-500 animate-pulse',
    speaking: 'bg-purple-500',
    error: 'bg-red-500',
  };

  const stateIcons = {
    idle: '🎙️',
    connecting: '⏳',
    listening: '👂',
    speaking: '🗣️',
    error: '❌',
  };

  const stateLabels = {
    idle: 'Start Voice',
    connecting: 'Connecting...',
    listening: 'Listening...',
    speaking: 'AI Speaking...',
    error: 'Error — retry',
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <button
        onClick={toggleVoice}
        className={`
          ${sizeClasses[size]}
          ${stateColors[state]}
          rounded-full flex items-center justify-center
          text-white shadow-lg transition-all duration-200
          focus:outline-none focus:ring-4 focus:ring-blue-300
          ${state !== 'idle' && state !== 'error' ? 'ring-4 ring-opacity-50 ring-white' : ''}
        `}
        title={stateLabels[state]}
      >
        <span className={size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl'}>
          {stateIcons[state]}
        </span>
      </button>

      <span className="text-xs text-gray-500">{stateLabels[state]}</span>

      {/* Live transcript */}
      {(transcript || aiText) && state !== 'idle' && (
        <div className="max-w-xs text-center space-y-1">
          {transcript && (
            <p className="text-xs text-gray-600">
              <span className="font-medium">You:</span> {transcript}
            </p>
          )}
          {aiText && (
            <p className="text-xs text-blue-600">
              <span className="font-medium">AI:</span> {aiText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
