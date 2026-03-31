import { transcribeAudio, summarizeCall, analyzeCallIntent, generateCallResponse } from '../openai';
import { storage } from '../storage';
import { AiConfig } from '@shared/schema';

export class AIService {
  async getAIConfig(organizationId: string): Promise<AiConfig | undefined> {
    return await storage.getAiConfig();
  }

  async updateAIConfig(organizationId: string, config: Partial<AiConfig>): Promise<AiConfig> {
    return await storage.upsertAiConfig(config);
  }

  async processCallTranscription(audioUrl: string, organizationId: string): Promise<string> {
    try {
      const transcription = await transcribeAudio(audioUrl);
      return transcription;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  async generateCallSummary(transcription: string, callerInfo: string, organizationId: string): Promise<string> {
    try {
      const summary = await summarizeCall(transcription, callerInfo);
      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate call summary');
    }
  }

  async analyzeIntent(transcription: string, organizationId: string): Promise<{
    intent: string;
    confidence: number;
    keywords: string[];
  }> {
    try {
      const intent = await analyzeCallIntent(transcription);
      return intent;
    } catch (error) {
      console.error('Error analyzing intent:', error);
      throw new Error('Failed to analyze call intent');
    }
  }

  async generateResponse(intent: string, organizationId: string): Promise<string> {
    try {
      const config = await this.getAIConfig(organizationId);
      const businessHours = config?.businessHours || {
        monday: { open: '09:00', close: '17:00', enabled: true },
        tuesday: { open: '09:00', close: '17:00', enabled: true },
        wednesday: { open: '09:00', close: '17:00', enabled: true },
        thursday: { open: '09:00', close: '17:00', enabled: true },
        friday: { open: '09:00', close: '17:00', enabled: true },
        saturday: { open: '10:00', close: '14:00', enabled: false },
        sunday: { open: '10:00', close: '14:00', enabled: false }
      };
      
      const response = await generateCallResponse(intent, businessHours);
      return response;
    } catch (error) {
      console.error('Error generating response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async processCompleteCall(audioUrl: string, callerInfo: string, organizationId: string): Promise<{
    transcription: string;
    summary: string;
    intent: any;
    response: string;
  }> {
    const transcription = await this.processCallTranscription(audioUrl, organizationId);
    const summary = await this.generateCallSummary(transcription, callerInfo, organizationId);
    const intent = await this.analyzeIntent(transcription, organizationId);
    const response = await this.generateResponse(intent.intent, organizationId);

    return {
      transcription,
      summary,
      intent,
      response
    };
  }
}

export const aiService = new AIService();