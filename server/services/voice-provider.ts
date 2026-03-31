import { AIVoiceConfig } from "@shared/schema";

export interface VoiceProviderOptions {
  text: string;
  voiceId?: string;
  speed?: number;
  pitch?: number;
  emotion?: string;
}

export interface VoiceProviderResponse {
  audioUrl?: string;
  audioBuffer?: Buffer;
  duration?: number;
  provider: string;
  latency: number;
}

export interface VoiceProvider {
  name: string;
  synthesize(text: string, options?: Partial<VoiceProviderOptions>): Promise<VoiceProviderResponse>;
  isAvailable(): Promise<boolean>;
}

class TwilioVoiceProvider implements VoiceProvider {
  name = "twilio";

  async synthesize(text: string, options?: Partial<VoiceProviderOptions>): Promise<VoiceProviderResponse> {
    const startTime = Date.now();
    return {
      provider: this.name,
      latency: Date.now() - startTime,
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

class OpenAIRealtimeProvider implements VoiceProvider {
  name = "openai_realtime";

  async synthesize(text: string, options?: Partial<VoiceProviderOptions>): Promise<VoiceProviderResponse> {
    const startTime = Date.now();
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: options?.voiceId || "alloy",
          speed: options?.speed || 1.0,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI TTS failed: ${response.statusText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      return {
        audioBuffer,
        provider: this.name,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      console.error("OpenAI Realtime synthesis error:", error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.OPENAI_API_KEY;
  }
}

class ElevenLabsProvider implements VoiceProvider {
  name = "elevenlabs";

  async synthesize(text: string, options?: Partial<VoiceProviderOptions>): Promise<VoiceProviderResponse> {
    const startTime = Date.now();
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    const voiceId = options?.voiceId || "21m00Tcm4TlvDq8ikWAM"; // Default Rachel voice

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      return {
        audioBuffer,
        provider: this.name,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      console.error("ElevenLabs synthesis error:", error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.ELEVENLABS_API_KEY;
  }
}

class CartesiaProvider implements VoiceProvider {
  name = "cartesia";

  async synthesize(text: string, options?: Partial<VoiceProviderOptions>): Promise<VoiceProviderResponse> {
    const startTime = Date.now();
    const apiKey = process.env.CARTESIA_API_KEY;
    
    if (!apiKey) {
      throw new Error("Cartesia API key not configured");
    }

    try {
      const response = await fetch("https://api.cartesia.ai/tts/bytes", {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
          "Cartesia-Version": "2024-06-10",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: text,
          model_id: "sonic-english",
          voice: {
            mode: "id",
            id: options?.voiceId || "a0e99841-438c-4a64-b679-ae501e7d6091",
          },
          output_format: {
            container: "mp3",
            encoding: "mp3",
            sample_rate: 44100,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Cartesia TTS failed: ${response.statusText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      
      return {
        audioBuffer,
        provider: this.name,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      console.error("Cartesia synthesis error:", error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.CARTESIA_API_KEY;
  }
}

export const PERSONAPLEX_VOICES = {
  NATF0: { id: "NATF0", name: "Natural Female 1", gender: "female", style: "natural" },
  NATF1: { id: "NATF1", name: "Natural Female 2", gender: "female", style: "natural" },
  NATF2: { id: "NATF2", name: "Natural Female 3", gender: "female", style: "natural" },
  NATF3: { id: "NATF3", name: "Natural Female 4", gender: "female", style: "natural" },
  NATM0: { id: "NATM0", name: "Natural Male 1", gender: "male", style: "natural" },
  NATM1: { id: "NATM1", name: "Natural Male 2", gender: "male", style: "natural" },
  NATM2: { id: "NATM2", name: "Natural Male 3", gender: "male", style: "natural" },
  NATM3: { id: "NATM3", name: "Natural Male 4", gender: "male", style: "natural" },
  VARF0: { id: "VARF0", name: "Variety Female 1", gender: "female", style: "variety" },
  VARF1: { id: "VARF1", name: "Variety Female 2", gender: "female", style: "variety" },
  VARF2: { id: "VARF2", name: "Variety Female 3", gender: "female", style: "variety" },
  VARF3: { id: "VARF3", name: "Variety Female 4", gender: "female", style: "variety" },
  VARF4: { id: "VARF4", name: "Variety Female 5", gender: "female", style: "variety" },
  VARM0: { id: "VARM0", name: "Variety Male 1", gender: "male", style: "variety" },
  VARM1: { id: "VARM1", name: "Variety Male 2", gender: "male", style: "variety" },
  VARM2: { id: "VARM2", name: "Variety Male 3", gender: "male", style: "variety" },
  VARM3: { id: "VARM3", name: "Variety Male 4", gender: "male", style: "variety" },
  VARM4: { id: "VARM4", name: "Variety Male 5", gender: "male", style: "variety" },
} as const;

export interface PersonaPlexSessionConfig {
  voice: string;
  persona: string;
  fullDuplex?: boolean;
}

class NvidiaPersonaPlexProvider implements VoiceProvider {
  name = "nvidia_personaplex";
  private baseUrl = "https://api.personaplex.io/v1";

  async synthesize(text: string, options?: Partial<VoiceProviderOptions>): Promise<VoiceProviderResponse> {
    const startTime = Date.now();
    const apiKey = process.env.NVIDIA_PERSONAPLEX_API_KEY;

    if (!apiKey) {
      throw new Error("NVIDIA PersonaPlex API key not configured");
    }

    const voiceId = options?.voiceId || "NATF2";

    try {
      const response = await fetch(`${this.baseUrl}/tts`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voice: voiceId,
          model: "personaplex-7b-v1",
          output_format: "mp3",
          sample_rate: 24000,
          speed: options?.speed || 1.0,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(`PersonaPlex TTS failed: ${response.status} ${response.statusText} ${errorBody}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());

      return {
        audioBuffer,
        provider: this.name,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      console.error("NVIDIA PersonaPlex synthesis error:", error);
      throw error;
    }
  }

  async createConversationSession(config: PersonaPlexSessionConfig): Promise<{
    sessionId: string;
    websocketUrl: string;
  }> {
    const apiKey = process.env.NVIDIA_PERSONAPLEX_API_KEY;

    if (!apiKey) {
      throw new Error("NVIDIA PersonaPlex API key not configured");
    }

    const response = await fetch(`${this.baseUrl}/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        voice: config.voice || "NATF2",
        persona: config.persona,
        model: "personaplex-7b-v1",
        full_duplex: config.fullDuplex ?? true,
        language: "en",
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`PersonaPlex session creation failed: ${response.status} ${response.statusText} ${errorBody}`);
    }

    const data = await response.json();
    if (!data.sessionId || !data.websocketUrl) {
      throw new Error("PersonaPlex session response missing required fields (sessionId, websocketUrl)");
    }

    return data;
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.NVIDIA_PERSONAPLEX_API_KEY;
  }
}

export class VoiceProviderManager {
  private providers: Map<string, VoiceProvider> = new Map();
  private personaPlexProvider: NvidiaPersonaPlexProvider;
  private defaultProvider: string = "twilio";

  constructor() {
    this.providers.set("twilio", new TwilioVoiceProvider());
    this.providers.set("openai_realtime", new OpenAIRealtimeProvider());
    this.providers.set("elevenlabs", new ElevenLabsProvider());
    this.providers.set("cartesia", new CartesiaProvider());
    this.personaPlexProvider = new NvidiaPersonaPlexProvider();
    this.providers.set("nvidia_personaplex", this.personaPlexProvider);
  }

  async createPersonaPlexSession(config: PersonaPlexSessionConfig) {
    return this.personaPlexProvider.createConversationSession(config);
  }

  async synthesize(
    text: string, 
    config?: AIVoiceConfig | null,
    options?: Partial<VoiceProviderOptions>
  ): Promise<VoiceProviderResponse> {
    const providerName = config?.provider || this.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      console.warn(`Voice provider ${providerName} not found, using fallback`);
      return this.synthesizeWithFallback(text, config, options);
    }

    try {
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        console.warn(`Voice provider ${providerName} not available, using fallback`);
        return this.synthesizeWithFallback(text, config, options);
      }

      const mergedOptions = {
        ...options,
        voiceId: config?.voiceId || options?.voiceId,
      };

      return await provider.synthesize(text, mergedOptions);
    } catch (error) {
      console.error(`Error with provider ${providerName}:`, error);
      return this.synthesizeWithFallback(text, config, options);
    }
  }

  private async synthesizeWithFallback(
    text: string,
    config?: AIVoiceConfig | null,
    options?: Partial<VoiceProviderOptions>
  ): Promise<VoiceProviderResponse> {
    const fallbackProviderName = config?.fallbackProvider || "twilio";
    const fallbackProvider = this.providers.get(fallbackProviderName);

    if (!fallbackProvider) {
      throw new Error(`Fallback provider ${fallbackProviderName} not found`);
    }

    const fallbackOptions = {
      ...options,
      voiceId: config?.fallbackVoiceId || options?.voiceId,
    };

    return await fallbackProvider.synthesize(text, fallbackOptions);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async getProviderStatus(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {};
    
    for (const [name, provider] of this.providers) {
      status[name] = await provider.isAvailable();
    }
    
    return status;
  }
}

export const voiceProviderManager = new VoiceProviderManager();
