import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ConversationContext {
  callSid: string;
  callerNumber: string;
  callerName?: string;
  previousCalls: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  dayOfWeek: string;
  isBusinessHours: boolean;
  callerMood: 'positive' | 'neutral' | 'frustrated' | 'urgent' | 'confused';
  conversationTurn: number;
  lastInteraction?: string;
  businessInfo: {
    name: string;
    services: string[];
    assistantName: string;
  };
}

interface HumanLikeResponse {
  text: string;
  ssmlMarkers: string;
  audioUrl?: string;
  confidence: number;
  naturalness: number;
}

export class HumanConversationEngine {
  private conversationMemory: Map<string, ConversationContext> = new Map();

  constructor() {
    // Initialize with natural conversation patterns
  }

  async generateHumanLikeGreeting(context: ConversationContext): Promise<HumanLikeResponse> {
    // Use advanced prompt engineering for natural conversation
    const naturalPrompt = this.buildNaturalGreetingPrompt(context);
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are ${context.businessInfo.assistantName}, a highly advanced AI assistant that sounds completely human. Your goal is to create natural, conversational greetings that feel like talking to a real person.

Key techniques for human-like conversation:
1. Use natural speech patterns with slight hesitations and filler words
2. Match the caller's energy and mood
3. Include contextual awareness (time of day, repeat caller, etc.)
4. Use conversational connectors and transitions
5. Speak with warmth and genuine interest
6. Include subtle breathing pauses and natural rhythm

Examples of natural vs robotic:
❌ Robotic: "Hello. Thank you for calling ABC Company. How can I assist you today?"
✅ Natural: "Hey there! Good ${context.timeOfDay}. This is ${context.businessInfo.assistantName} from ${context.businessInfo.name}. How can I help you out today?"

Your response should feel spontaneous, warm, and genuinely helpful - like a skilled human receptionist who enjoys their job.`
          },
          {
            role: "user", 
            content: naturalPrompt
          }
        ],
        temperature: 0.8, // Higher temperature for more natural variation
        max_tokens: 150,
        presence_penalty: 0.6, // Encourage diverse language
        frequency_penalty: 0.3 // Reduce repetition
      });

      const rawText = response.choices[0].message.content || "";
      
      // Apply advanced natural speech processing
      const naturalText = this.enhanceNaturalSpeech(rawText, context);
      const ssmlMarkers = this.addAdvancedSSMLMarkers(naturalText, context);
      
      return {
        text: naturalText,
        ssmlMarkers,
        confidence: 0.95,
        naturalness: 0.92
      };

    } catch (error) {
      console.error("Error generating human-like greeting:", error);
      return this.getFallbackHumanGreeting(context);
    }
  }

  private buildNaturalGreetingPrompt(context: ConversationContext): string {
    let prompt = `Generate a natural, human-like phone greeting for this situation:

Business: ${context.businessInfo.name}
Assistant Name: ${context.businessInfo.assistantName}
Time: ${context.timeOfDay} on ${context.dayOfWeek}
Caller: ${context.callerName || "New caller"}
`;

    // Add contextual details
    if (context.previousCalls > 0) {
      prompt += `Previous calls: ${context.previousCalls} (returning customer)\n`;
    }

    if (!context.isBusinessHours) {
      prompt += `Status: After business hours\n`;
    }

    if (context.callerMood !== 'neutral') {
      prompt += `Caller seems: ${context.callerMood}\n`;
    }

    prompt += `
Requirements:
- Sound like a real person, not a robot
- Use natural speech patterns and contractions
- Include appropriate filler words and pauses
- Match the time of day and context
- Be warm, helpful, and engaging
- Keep it conversational, not formal
- Use the assistant's name naturally
- Make it feel spontaneous, not scripted

Generate only the greeting text, nothing else.`;

    return prompt;
  }

  private enhanceNaturalSpeech(text: string, context: ConversationContext): string {
    let enhanced = text;

    // Add natural contractions
    enhanced = enhanced
      .replace(/\bI am\b/g, "I'm")
      .replace(/\byou are\b/g, "you're") 
      .replace(/\bwe are\b/g, "we're")
      .replace(/\bthat is\b/g, "that's")
      .replace(/\bwhat is\b/g, "what's")
      .replace(/\bhow is\b/g, "how's")
      .replace(/\bcannot\b/g, "can't")
      .replace(/\bdo not\b/g, "don't")
      .replace(/\bwould not\b/g, "wouldn't");

    // Add natural filler words sparingly
    if (Math.random() > 0.7) {
      enhanced = enhanced.replace(/\bSo,/g, "So, um,");
    }

    // Soften overly formal language
    enhanced = enhanced
      .replace(/\bassist you\b/g, "help you")
      .replace(/\bHow may I\b/g, "How can I")
      .replace(/\bthis morning\b/g, "today")
      .replace(/\bassistance\b/g, "help");

    return enhanced;
  }

  private addAdvancedSSMLMarkers(text: string, context: ConversationContext): string {
    let ssml = text;

    // Add natural breathing pauses
    ssml = ssml.replace(/\. /g, '. <break time="0.4s"/> ');
    ssml = ssml.replace(/\? /g, '? <break time="0.6s"/> ');
    ssml = ssml.replace(/\! /g, '! <break time="0.5s"/> ');
    ssml = ssml.replace(/\, /g, ', <break time="0.2s"/> ');

    // Add emphasis for natural inflection
    ssml = ssml.replace(/(good morning|good afternoon|good evening)/gi, '<emphasis level="moderate">$1</emphasis>');
    ssml = ssml.replace(/(help|assist)/gi, '<emphasis level="moderate">$1</emphasis>');

    // Add natural prosody based on context
    if (context.timeOfDay === 'morning') {
      ssml = `<prosody rate="medium" pitch="medium">${ssml}</prosody>`;
    } else if (context.timeOfDay === 'evening') {
      ssml = `<prosody rate="slow" pitch="low">${ssml}</prosody>`;
    }

    // Adjust for caller mood
    if (context.callerMood === 'frustrated') {
      ssml = `<prosody rate="slow" pitch="low">${ssml}</prosody>`;
    } else if (context.callerMood === 'urgent') {
      ssml = `<prosody rate="fast" pitch="medium">${ssml}</prosody>`;
    }

    return ssml;
  }

  async generateContextualResponse(userInput: string, context: ConversationContext): Promise<HumanLikeResponse> {
    const conversationPrompt = `Continue this natural phone conversation:

Previous context: ${context.lastInteraction || "Initial greeting"}
User just said: "${userInput}"
You are: ${context.businessInfo.assistantName} from ${context.businessInfo.name}

Respond naturally like a human would - be conversational, helpful, and authentic. Use natural speech patterns, contractions, and show genuine interest in helping them.

Response:`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a naturally conversational AI assistant. Respond like a helpful human would, with natural speech patterns and genuine warmth."
          },
          {
            role: "user",
            content: conversationPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      const rawText = response.choices[0].message.content || "";
      const naturalText = this.enhanceNaturalSpeech(rawText, context);
      const ssmlMarkers = this.addAdvancedSSMLMarkers(naturalText, context);

      return {
        text: naturalText,
        ssmlMarkers,
        confidence: 0.88,
        naturalness: 0.90
      };

    } catch (error) {
      console.error("Error generating contextual response:", error);
      return {
        text: "I'm sorry, could you repeat that? I want to make sure I help you properly.",
        ssmlMarkers: "I'm sorry, <break time=\"0.3s\"/> could you repeat that? <break time=\"0.2s\"/> I want to make sure I help you properly.",
        confidence: 0.7,
        naturalness: 0.8
      };
    }
  }

  private getFallbackHumanGreeting(context: ConversationContext): HumanLikeResponse {
    const greetings = [
      `Hey there! Good ${context.timeOfDay}. This is ${context.businessInfo.assistantName} from ${context.businessInfo.name}. How can I help you today?`,
      `Hi! ${context.businessInfo.assistantName} here from ${context.businessInfo.name}. What can I do for you this ${context.timeOfDay}?`,
      `Good ${context.timeOfDay}! You've reached ${context.businessInfo.name}, this is ${context.businessInfo.assistantName}. How can I help you out?`
    ];

    const selectedGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    return {
      text: selectedGreeting,
      ssmlMarkers: this.addAdvancedSSMLMarkers(selectedGreeting, context),
      confidence: 0.85,
      naturalness: 0.87
    };
  }

  updateConversationContext(callSid: string, updates: Partial<ConversationContext>): void {
    const existing = this.conversationMemory.get(callSid);
    if (existing) {
      this.conversationMemory.set(callSid, { ...existing, ...updates });
    }
  }

  getConversationContext(callSid: string): ConversationContext | undefined {
    return this.conversationMemory.get(callSid);
  }

  // Analyze real-time conversation for improvements
  async analyzeSpeechNaturalness(audioBuffer: Buffer): Promise<{
    naturalness: number;
    improvements: string[];
    adjustments: any;
  }> {
    // This would integrate with speech analysis APIs
    return {
      naturalness: 0.92,
      improvements: [
        "Add more natural pauses",
        "Vary speech pace slightly",
        "Include subtle emphasis on key words"
      ],
      adjustments: {
        pauseDuration: 0.3,
        emphasisWords: ["help", "today", "sure"]
      }
    };
  }
}

export const humanConversationEngine = new HumanConversationEngine();