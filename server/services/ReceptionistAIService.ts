import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
import { storage } from "../storage";

export interface ConversationContext {
  callSid: string;
  callerNumber: string;
  callerName?: string;
  conversationHistory: ConversationTurn[];
  intent?: string;
  confidence?: number;
  messageCollected?: boolean;
  isRelevantCall?: boolean;
  departmentRouting?: 'sales' | 'support' | 'billing' | 'general';
  currentStep: 'greeting' | 'intent_detection' | 'routing' | 'message_collection' | 'closing';
}

export interface ConversationTurn {
  timestamp: Date;
  speaker: 'caller' | 'ai';
  text: string;
  intent?: string;
  confidence?: number;
}

export interface AIResponse {
  text: string;
  action: 'continue' | 'transfer' | 'collect_message' | 'end_call';
  transferTo?: string;
  nextStep?: string;
  shouldEnd?: boolean;
}

// Per-number persona config — maps the "To" phone number to an identity
// Unknown numbers default to RapidRMS company persona
const PERSONA_BY_NUMBER: Record<string, { companyName: string; aiName: string; isPersonal: boolean; ownerName?: string }> = {
  '+17274362999': { companyName: '', aiName: 'Annie', isPersonal: true, ownerName: 'Nirav' }, // Personal line
  '+18887274302': { companyName: 'RapidRMS', aiName: 'Annie', isPersonal: false },            // Company line (also handled by RC AI)
};

export class ReceptionistAIService {
  private activeConversations: Map<string, ConversationContext> = new Map();
  private companyName = "RapidRMS";
  private aiName = "Sarah";

  // Intent recognition patterns
  private intentPatterns = {
    sales: [
      'buy', 'purchase', 'pricing', 'cost', 'quote', 'demo', 'trial',
      'interested in', 'want to know about', 'tell me about', 'product',
      'service', 'solution', 'price', 'how much'
    ],
    support: [
      'help', 'problem', 'issue', 'broken', 'not working', 'error',
      'trouble', 'support', 'assistance', 'fix', 'bug', 'down'
    ],
    billing: [
      'billing', 'invoice', 'payment', 'charge', 'account', 'subscription',
      'refund', 'cancel', 'upgrade', 'downgrade'
    ],
    irrelevant: [
      'solar', 'insurance', 'loan', 'marketing', 'seo', 'website',
      'vendor', 'selling', 'offer', 'promotion', 'spam'
    ]
  };

  async handleIncomingCall(callSid: string, callerNumber: string, callerName?: string, toNumber?: string): Promise<AIResponse> {
    // Select persona based on which number was dialed
    if (toNumber && PERSONA_BY_NUMBER[toNumber]) {
      const p = PERSONA_BY_NUMBER[toNumber];
      this.companyName = p.companyName;
      this.aiName = p.aiName;
      (this as any)._isPersonal = p.isPersonal;
      (this as any)._ownerName = p.ownerName;
    }

    const context: ConversationContext = {
      callSid,
      callerNumber,
      callerName,
      conversationHistory: [],
      currentStep: 'greeting'
    };

    this.activeConversations.set(callSid, context);

    // Generate personalized greeting
    const greeting = await this.generateGreeting(context);
    
    context.conversationHistory.push({
      timestamp: new Date(),
      speaker: 'ai',
      text: greeting
    });

    return {
      text: greeting,
      action: 'continue',
      nextStep: 'intent_detection'
    };
  }

  async processCallerInput(callSid: string, callerInput: string): Promise<AIResponse> {
    const context = this.activeConversations.get(callSid);
    if (!context) {
      throw new Error('Conversation context not found');
    }

    // Add caller input to history
    context.conversationHistory.push({
      timestamp: new Date(),
      speaker: 'caller',
      text: callerInput
    });

    // Analyze intent and generate response
    const intentAnalysis = await this.analyzeIntent(callerInput, context);
    context.intent = intentAnalysis.intent;
    context.confidence = intentAnalysis.confidence;
    context.isRelevantCall = intentAnalysis.isRelevant;

    // Generate AI response based on current step and intent
    const response = await this.generateContextualResponse(context, callerInput);

    // Add AI response to history
    context.conversationHistory.push({
      timestamp: new Date(),
      speaker: 'ai',
      text: response.text,
      intent: context.intent,
      confidence: context.confidence
    });

    // Update conversation step
    if (response.nextStep) {
      context.currentStep = response.nextStep as any;
    }

    return response;
  }

  private async generateGreeting(context: ConversationContext): Promise<string> {
    const personalGreeting = context.callerName ? ` ${context.callerName}` : '';
    const isPersonal = (this as any)._isPersonal;
    const ownerName = (this as any)._ownerName || 'Nirav';
    const tc = this.getTimeContext();

    let greetingVariations: string[];

    if (isPersonal) {
      // Time-aware personal greetings (Annie as Nirav's AI)
      if (tc.period === 'night') {
        greetingVariations = [
          `Hi${personalGreeting}, this is ${this.aiName}, ${ownerName}'s AI assistant. It's late and ${ownerName} is off the clock, but if it's urgent I can pass it along — or I'll have him call you back first thing.`,
          `Hello${personalGreeting}, ${this.aiName} here. ${ownerName} has wrapped up for the day. What's going on — I'll get a message to him right away.`,
        ];
      } else if (tc.period === 'weekend') {
        greetingVariations = [
          `Hi${personalGreeting}, this is ${this.aiName}, ${ownerName}'s AI assistant. ${ownerName}'s off for the weekend but I'm here to help — what do you need?`,
          `Hello${personalGreeting}, ${this.aiName} here. It's the weekend so ${ownerName}'s taking time off, but I can take a message or help if you'd like.`,
        ];
      } else if (tc.period === 'morning') {
        greetingVariations = [
          `Good morning${personalGreeting}! You've reached ${ownerName}. I'm ${this.aiName}, his AI assistant — he's not at his phone yet, what can I help you with?`,
          `Hi${personalGreeting}, this is ${this.aiName}, ${ownerName}'s AI assistant. ${ownerName}'s getting his morning started — how can I help?`,
        ];
      } else if (tc.period === 'evening') {
        greetingVariations = [
          `Hi${personalGreeting}, ${this.aiName} here — ${ownerName}'s AI assistant. ${ownerName}'s wrapping up for the day, but I can help or take a message.`,
          `Good evening${personalGreeting}! This is ${this.aiName}, ${ownerName}'s AI assistant. What's up — how can I help?`,
        ];
      } else {
        // business hours
        greetingVariations = [
          `Hi${personalGreeting}, you've reached ${ownerName}. I'm ${this.aiName}, his AI assistant — he's on another call, but how can I help?`,
          `Hello${personalGreeting}, this is ${this.aiName}, ${ownerName}'s AI assistant. ${ownerName} is tied up right now — what do you need?`,
        ];
      }
    } else {
      // Business / company persona
      const timePrefix = tc.period === 'morning' ? 'Good morning'
        : tc.period === 'evening' ? 'Good evening'
        : tc.period === 'night' ? 'Hi there'
        : tc.period === 'weekend' ? 'Hi'
        : 'Hi';
      greetingVariations = [
        `${timePrefix}${personalGreeting}! Thanks for calling ${this.companyName}. This is ${this.aiName}, how can I help?`,
        `${timePrefix}${personalGreeting}! You've reached ${this.companyName}. I'm ${this.aiName}, what can I do for you today?`,
      ];
    }

    // Use one of the curated persona-aware variations directly.
    // (Previously called OpenAI to "naturalize" the greeting — but with
    // empty companyName for personal lines, the LLM hallucinated
    // "[Company]" placeholders. The variations are already human-written
    // and on-brand, so no LLM refinement is needed for the opener.)
    return greetingVariations[Math.floor(Math.random() * greetingVariations.length)];
  }

  private async analyzeIntent(input: string, context: ConversationContext): Promise<{
    intent: string;
    confidence: number;
    isRelevant: boolean;
  }> {
    const inputLower = input.toLowerCase();
    
    // Check for company relevance
    const isAboutCompany = inputLower.includes(this.companyName.toLowerCase()) ||
      inputLower.includes('rapid') ||
      inputLower.includes('rms');

    // Pattern-based intent detection
    let patternIntent = 'general';
    let maxMatches = 0;

    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      const matches = patterns.filter(pattern => inputLower.includes(pattern)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        patternIntent = intent;
      }
    }

    // Use AI for more sophisticated intent analysis
    try {
      const prompt = `Analyze this caller's message for intent and relevance:

      Caller said: "${input}"
      Company: ${this.companyName}
      
      Determine:
      1. Intent: sales, support, billing, general_info, or irrelevant
      2. Is this about ${this.companyName}? (true/false)
      3. Confidence level (0-1)
      
      Response format: {"intent": "sales", "isRelevant": true, "confidence": 0.9}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.3
      });

      const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      return {
        intent: analysis.intent || patternIntent,
        confidence: analysis.confidence || (maxMatches > 0 ? 0.7 : 0.3),
        isRelevant: analysis.isRelevant !== false && (isAboutCompany || maxMatches > 0)
      };
    } catch (error) {
      console.error('Error in AI intent analysis:', error);
      
      return {
        intent: patternIntent,
        confidence: maxMatches > 0 ? 0.7 : 0.3,
        isRelevant: isAboutCompany || (patternIntent !== 'irrelevant' && maxMatches > 0)
      };
    }
  }

  private async generateContextualResponse(context: ConversationContext, callerInput: string): Promise<AIResponse> {
    const conversationHistory = context.conversationHistory
      .slice(-4) // Last 4 turns for context
      .map(turn => `${turn.speaker}: ${turn.text}`)
      .join('\n');

    try {
      const prompt = `You are ${this.aiName}, a professional AI receptionist for ${this.companyName}. 

      Current situation:
      - Intent: ${context.intent}
      - Relevant to company: ${context.isRelevantCall}
      - Current step: ${context.currentStep}
      - Confidence: ${context.confidence}
      
      Recent conversation:
      ${conversationHistory}
      
      Caller just said: "${callerInput}"
      
      Instructions:
      1. If call is relevant and about ${this.companyName}:
         - For sales: Gather basic info and offer to connect to sales team
         - For support: Understand the issue and route to technical support
         - For billing: Connect to billing department
         - For general: Provide basic info or route appropriately
      
      2. If call is NOT relevant to ${this.companyName}:
         - Politely decline
         - Offer to take a message if they insist
         - Keep it brief and professional
      
      3. Sound natural and conversational:
         - Use casual phrases like "Sure", "Got it", "Let me help with that"
         - Add natural delays and acknowledgments
         - Be empathetic and helpful
      
      Respond in JSON format:
      {
        "text": "Your response here",
        "action": "continue|transfer|collect_message|end_call",
        "transferTo": "sales|support|billing|general",
        "nextStep": "intent_detection|routing|message_collection|closing"
      }`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.8
      });

      const response = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      return {
        text: response.text || "I understand. Let me help you with that.",
        action: response.action || 'continue',
        transferTo: response.transferTo,
        nextStep: response.nextStep
      };
    } catch (error) {
      console.error('Error generating contextual response:', error);
      return this.getFallbackResponse(context);
    }
  }

  private getFallbackResponse(context: ConversationContext): AIResponse {
    if (context.isRelevantCall === false) {
      return {
        text: "Thanks for reaching out. At the moment, we're only handling inquiries related to RapidRMS. Can I take a message for the team?",
        action: 'collect_message',
        nextStep: 'message_collection'
      };
    }

    switch (context.intent) {
      case 'sales':
        return {
          text: "I'd be happy to connect you with our sales team. Let me get you to the right person who can help with your inquiry.",
          action: 'transfer',
          transferTo: 'sales'
        };
      case 'support':
        return {
          text: "I understand you need technical support. Let me connect you with our support team right away.",
          action: 'transfer',
          transferTo: 'support'
        };
      case 'billing':
        return {
          text: "For billing questions, I'll connect you directly with our billing department.",
          action: 'transfer',
          transferTo: 'billing'
        };
      default:
        return {
          text: "I want to make sure I connect you with the right person. Could you tell me a bit more about what you need help with?",
          action: 'continue',
          nextStep: 'intent_detection'
        };
    }
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }

  // Structured time context for greeting selection
  public getTimeContext(): { period: 'morning' | 'business' | 'evening' | 'night' | 'weekend'; hour: number; isWeekend: boolean; isBusinessHours: boolean } {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0=Sun, 6=Sat
    const isWeekend = day === 0 || day === 6;
    const isBusinessHours = !isWeekend && hour >= 9 && hour < 17;
    let period: 'morning' | 'business' | 'evening' | 'night' | 'weekend';
    if (isWeekend) period = 'weekend';
    else if (hour < 9) period = 'morning';
    else if (hour < 17) period = 'business';
    else if (hour < 21) period = 'evening';
    else period = 'night';
    return { period, hour, isWeekend, isBusinessHours };
  }

  async endConversation(callSid: string): Promise<void> {
    const context = this.activeConversations.get(callSid);
    if (context) {
      // Save conversation to database
      try {
        await this.saveConversationLog(context);
      } catch (error) {
        console.error('Error saving conversation log:', error);
      }
      
      this.activeConversations.delete(callSid);
    }
  }

  private async saveConversationLog(context: ConversationContext): Promise<void> {
    const conversationSummary = {
      callSid: context.callSid,
      callerNumber: context.callerNumber,
      callerName: context.callerName,
      intent: context.intent,
      isRelevantCall: context.isRelevantCall,
      conversationTurns: context.conversationHistory.length,
      duration: Math.floor((Date.now() - context.conversationHistory[0]?.timestamp.getTime()) / 1000),
      finalAction: context.currentStep
    };

    // Save to calls table with AI conversation data
    await storage.createCall({
      callSid: context.callSid,
      from: context.callerNumber,
      to: "+1234567890", // Your business number
      status: "completed",
      direction: "inbound",
      duration: conversationSummary.duration,
      aiHandled: true,
      callerName: context.callerName,
      organizationId: "default"
    });
  }

  getConversationContext(callSid: string): ConversationContext | undefined {
    return this.activeConversations.get(callSid);
  }

  // Configuration methods for admin dashboard
  updateCompanySettings(companyName: string, aiName: string): void {
    this.companyName = companyName;
    this.aiName = aiName;
  }

  addCustomIntentPattern(intent: string, patterns: string[]): void {
    (this.intentPatterns as any)[intent] = patterns;
  }
}

export const receptionistAI = new ReceptionistAIService();