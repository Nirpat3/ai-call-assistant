import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface VoicePersonality {
  id: string;
  name: string;
  tone: 'professional' | 'friendly' | 'empathetic' | 'authoritative' | 'casual';
  pace: 'slow' | 'normal' | 'fast';
  emphasis: 'subtle' | 'moderate' | 'strong';
  accent: 'neutral' | 'regional' | 'international';
  voiceModel: string;
}

export interface VoiceSynthesisOptions {
  personality: VoicePersonality;
  emotion: 'neutral' | 'happy' | 'concerned' | 'excited' | 'calm' | 'urgent';
  context: 'greeting' | 'explanation' | 'question' | 'farewell' | 'transfer' | 'problem_solving';
  callerMood: 'positive' | 'neutral' | 'frustrated' | 'urgent' | 'confused';
  adaptToSpeaker: boolean;
}

export class AdvancedVoiceSynthesis {
  private personalityProfiles: Map<string, VoicePersonality> = new Map();
  private conversationHistory: Map<string, any[]> = new Map();

  constructor() {
    this.initializePersonalities();
  }

  private initializePersonalities() {
    const personalities: VoicePersonality[] = [
      {
        id: 'professional_assistant',
        name: 'Professional Assistant',
        tone: 'professional',
        pace: 'normal',
        emphasis: 'moderate',
        accent: 'neutral',
        voiceModel: 'alloy'
      },
      {
        id: 'friendly_receptionist',
        name: 'Friendly Receptionist',
        tone: 'friendly',
        pace: 'normal',
        emphasis: 'subtle',
        accent: 'neutral',
        voiceModel: 'nova'
      },
      {
        id: 'empathetic_support',
        name: 'Empathetic Support',
        tone: 'empathetic',
        pace: 'slow',
        emphasis: 'subtle',
        accent: 'neutral',
        voiceModel: 'shimmer'
      },
      {
        id: 'authoritative_manager',
        name: 'Authoritative Manager',
        tone: 'authoritative',
        pace: 'normal',
        emphasis: 'strong',
        accent: 'neutral',
        voiceModel: 'onyx'
      }
    ];

    personalities.forEach(p => this.personalityProfiles.set(p.id, p));
  }

  async synthesizeResponse(
    text: string,
    callSid: string,
    options: VoiceSynthesisOptions
  ): Promise<{
    audioUrl: string;
    twimlResponse: string;
    adaptedText: string;
    confidenceScore: number;
  }> {
    // Adapt text based on caller mood and context
    const adaptedText = await this.adaptTextForContext(text, options);
    
    // Add natural speech markers
    const speechText = this.addSpeechMarkers(adaptedText, options);
    
    // Generate TTS audio
    const audioUrl = await this.generateTTSAudio(speechText, options.personality);
    
    // Create TwiML response
    const twimlResponse = this.generateTwiMLResponse(audioUrl, options);
    
    // Calculate confidence score
    const confidenceScore = this.calculateConfidence(adaptedText, options);

    // Store conversation context
    this.updateConversationHistory(callSid, {
      originalText: text,
      adaptedText,
      options,
      timestamp: new Date()
    });

    return {
      audioUrl,
      twimlResponse,
      adaptedText: speechText,
      confidenceScore
    };
  }

  private async adaptTextForContext(
    text: string,
    options: VoiceSynthesisOptions
  ): Promise<string> {
    const adaptationPrompt = `
    Adapt the following text for voice synthesis with these parameters:
    - Caller mood: ${options.callerMood}
    - Context: ${options.context}
    - Desired emotion: ${options.emotion}
    - Personality tone: ${options.personality.tone}
    
    Make the text more conversational and natural for speech while maintaining the meaning.
    Add appropriate empathy markers if the caller seems frustrated.
    Use active voice and shorter sentences for clarity.
    
    Original text: "${text}"
    
    Provide only the adapted text, no explanations.
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: adaptationPrompt }],
        temperature: 0.7,
        max_tokens: 200
      });

      return response.choices[0].message.content || text;
    } catch (error) {
      console.error("Error adapting text:", error);
      return text;
    }
  }

  private addSpeechMarkers(text: string, options: VoiceSynthesisOptions): string {
    let markedText = text;

    // Add pauses based on personality pace
    const pauseDuration = options.personality.pace === 'slow' ? '0.5s' : 
                         options.personality.pace === 'fast' ? '0.2s' : '0.3s';

    // Add natural speech patterns
    markedText = markedText
      .replace(/\. /g, `. <break time="${pauseDuration}"/> `)
      .replace(/\? /g, `? <break time="0.5s"/> `)
      .replace(/\! /g, `! <break time="0.4s"/> `)
      .replace(/\, /g, `, <break time="0.2s"/> `);

    // Add emphasis based on context and emotion
    if (options.emotion === 'excited') {
      markedText = markedText.replace(/\b(great|excellent|wonderful|amazing)\b/gi, 
        '<emphasis level="strong">$1</emphasis>');
    }

    if (options.emotion === 'concerned' || options.callerMood === 'frustrated') {
      markedText = markedText.replace(/\b(understand|help|sorry|apologize)\b/gi, 
        '<emphasis level="moderate">$1</emphasis>');
    }

    // Add prosody for different contexts
    switch (options.context) {
      case 'greeting':
        markedText = `<prosody rate="${options.personality.pace}" pitch="+5%">${markedText}</prosody>`;
        break;
      case 'question':
        markedText = markedText.replace(/\?/g, '<prosody pitch="+10%">?</prosody>');
        break;
      case 'urgent':
        markedText = `<prosody rate="fast" pitch="+8%">${markedText}</prosody>`;
        break;
    }

    return markedText;
  }

  private async generateTTSAudio(text: string, personality: VoicePersonality): Promise<string> {
    try {
      const mp3 = await openai.audio.speech.create({
        model: "tts-1-hd",
        voice: personality.voiceModel as any,
        input: text,
        speed: personality.pace === 'slow' ? 0.85 : personality.pace === 'fast' ? 1.15 : 1.0
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      
      // In a real implementation, you would upload this to a CDN or storage service
      // For now, we'll return a placeholder URL
      const audioUrl = `https://your-cdn.com/audio/${Date.now()}.mp3`;
      
      return audioUrl;
    } catch (error) {
      console.error("Error generating TTS audio:", error);
      throw new Error("Failed to generate audio");
    }
  }

  private generateTwiMLResponse(audioUrl: string, options: VoiceSynthesisOptions): string {
    const gatherOptions = options.context === 'question' ? 
      `<Gather input="speech" action="/webhook/process-speech" method="POST" speechTimeout="3">` : '';
    
    const gatherClose = options.context === 'question' ? `</Gather>` : '';

    return `
      <Response>
        ${gatherOptions}
        <Play>${audioUrl}</Play>
        ${gatherClose}
        <Pause length="1"/>
      </Response>
    `.trim();
  }

  private calculateConfidence(text: string, options: VoiceSynthesisOptions): number {
    let confidence = 0.8; // Base confidence

    // Adjust based on text complexity
    if (text.length > 200) confidence -= 0.1;
    if (text.split(' ').length > 50) confidence -= 0.1;

    // Adjust based on emotion matching
    if (options.emotion === 'neutral') confidence += 0.1;
    if (options.callerMood === options.emotion) confidence += 0.1;

    // Adjust based on context appropriateness
    if (options.context === 'greeting' && text.toLowerCase().includes('hello')) confidence += 0.1;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private updateConversationHistory(callSid: string, entry: any) {
    if (!this.conversationHistory.has(callSid)) {
      this.conversationHistory.set(callSid, []);
    }
    
    const history = this.conversationHistory.get(callSid)!;
    history.push(entry);
    
    // Keep only last 10 entries
    if (history.length > 10) {
      history.shift();
    }
  }

  getPersonalities(): VoicePersonality[] {
    return Array.from(this.personalityProfiles.values());
  }

  getPersonality(id: string): VoicePersonality | undefined {
    return this.personalityProfiles.get(id);
  }

  async analyzeCallerMood(audioBuffer: Buffer): Promise<{
    mood: 'positive' | 'neutral' | 'frustrated' | 'urgent' | 'confused';
    confidence: number;
    indicators: string[];
  }> {
    // This would integrate with speech analysis APIs
    // For now, return a mock analysis
    return {
      mood: 'neutral',
      confidence: 0.8,
      indicators: ['stable_tone', 'normal_pace']
    };
  }

  async getOptimalPersonality(
    callerMood: string,
    callContext: string,
    pastInteractions: number
  ): Promise<VoicePersonality> {
    // AI-driven personality selection logic
    if (callerMood === 'frustrated') {
      return this.getPersonality('empathetic_support')!;
    }
    
    if (callContext === 'technical_support') {
      return this.getPersonality('professional_assistant')!;
    }
    
    if (pastInteractions === 0) {
      return this.getPersonality('friendly_receptionist')!;
    }

    return this.getPersonality('professional_assistant')!;
  }
}

export const advancedVoiceSynthesis = new AdvancedVoiceSynthesis();