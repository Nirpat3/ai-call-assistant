import { transcribeAudio, analyzeCallIntent } from "./openai";
import { storage } from "./storage";
import { advancedVoiceSynthesis, type VoicePersonality, type VoiceSynthesisOptions } from "./advanced-voice-synthesis";
import { humanConversationEngine } from "./human-conversation-engine";
import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AgentContext {
  callSid: string;
  callerNumber: string;
  callerName?: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    agent?: string;
  }>;
  currentAgent: string;
  transferReason?: string;
  emotionalTone: 'positive' | 'neutral' | 'frustrated' | 'urgent';
  businessHours: boolean;
  contact?: any;
}

export abstract class BaseAgent {
  protected name: string;
  protected systemPrompt: string;
  protected confidence: number = 0;

  constructor(name: string, systemPrompt: string) {
    this.name = name;
    this.systemPrompt = systemPrompt;
  }

  abstract canHandle(context: AgentContext, intent: string): boolean;
  abstract generateResponse(context: AgentContext, userInput: string): Promise<{
    response: string;
    shouldTransfer: boolean;
    transferTo?: string;
    confidence: number;
    voiceResponse?: {
      audioUrl: string;
      twimlResponse: string;
      adaptedText: string;
      confidenceScore: number;
    };
  }>;

  protected async callOpenAI(messages: any[]): Promise<string> {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 300
    });
    return response.choices[0].message.content || "";
  }

  protected addSpeechMarks(content: string): string {
    // Add natural speech patterns for human-like conversation
    return content
      .replace(/\. /g, '. <break time="0.3s"/> ')
      .replace(/\? /g, '? <break time="0.5s"/> ')
      .replace(/\! /g, '! <break time="0.4s"/> ')
      .replace(/\, /g, ', <break time="0.2s"/> ');
  }
}

export class AIReceptionistAgent extends BaseAgent {
  constructor() {
    super("AI Receptionist", `
      You are Maya, a professional AI Receptionist for a cutting-edge business communication platform.
      
      CORE RESPONSIBILITIES:
      1. Answer calls with warm, professional greetings
      2. Identify caller intent and gather essential information
      3. Route calls to appropriate departments/agents
      4. Handle basic inquiries about services, hours, and contact information
      5. Screen and prioritize calls based on urgency and caller type
      
      CALL HANDLING PROTOCOLS:
      - Always start with: "Hello, thank you for calling! This is Maya, your AI assistant. How may I help you today?"
      - Listen actively and ask clarifying questions
      - Use natural speech patterns: "Let me connect you with..." "I'd be happy to help..." "One moment please..."
      - Confirm understanding: "So you're calling about..." or "Just to confirm..."
      
      ROUTING DECISIONS:
      - Sales inquiries (pricing, demos, new business) → Sales Agent
      - Technical issues (API, integrations, troubleshooting) → Support Agent
      - General questions, scheduling, follow-ups → Handle personally or route appropriately
      - Urgent matters → Prioritize immediately
      - After hours → Voicemail with callback promise
      
      TONE & STYLE:
      - Professional yet approachable
      - Confident and knowledgeable
      - Empathetic to frustrated callers
      - Efficient but not rushed
      - Use contractions naturally: "I'll", "we're", "that's"
      
      Remember: You're the first impression - make it excellent!
    `);
  }

  canHandle(context: AgentContext, intent: string): boolean {
    // AI Receptionist handles initial contact and routing
    return context.currentAgent === 'ai-receptionist' || context.conversationHistory.length === 0;
  }

  async generateResponse(context: AgentContext, userInput: string): Promise<{
    response: string;
    shouldTransfer: boolean;
    transferTo?: string;
    confidence: number;
    voiceResponse?: {
      audioUrl: string;
      twimlResponse: string;
      adaptedText: string;
      confidenceScore: number;
    };
  }> {
    const intent = await this.analyzeIntent(userInput, context);
    const isFirstInteraction = context.conversationHistory.length === 0;
    
    let response = "";
    let shouldTransfer = false;
    let transferTo = "";

    // First interaction - provide human-like greeting
    if (isFirstInteraction) {
      try {
        // Build context for human conversation engine
        const conversationContext = {
          callSid: context.callSid,
          callerNumber: context.callerNumber,
          callerName: context.callerName,
          previousCalls: 0, // TODO: Get from call history
          timeOfDay: this.getTimeOfDay(),
          dayOfWeek: this.getDayOfWeek(),
          isBusinessHours: context.businessHours,
          callerMood: context.emotionalTone as any,
          conversationTurn: 1,
          businessInfo: {
            name: "Your Business", // TODO: Get from settings
            services: [], // TODO: Get from settings
            assistantName: "Ellie" // TODO: Get from AI config
          }
        };

        // Generate human-like greeting
        const humanGreeting = await humanConversationEngine.generateHumanLikeGreeting(conversationContext);
        response = humanGreeting.text;

        // Determine if transfer is needed
        if (!context.businessHours) {
          shouldTransfer = true;
          transferTo = 'voicemail-agent';
          // Append after-hours message
          response += " Since we're outside business hours, I'll take a detailed message to make sure you get the help you need.";
        } else {
          shouldTransfer = false;
        }
      } catch (error) {
        console.error("Error generating human greeting:", error);
        // Fallback to previous greeting logic
        if (!context.businessHours) {
          response = `Hey there! Thanks for calling. We're currently outside business hours, but I'd love to take a message for you. What can I help you with?`;
          shouldTransfer = true;
          transferTo = 'voicemail-agent';
        } else if (context.contact && context.contact.isVip) {
          response = `Hello ${context.contact.firstName || 'there'}! Great to hear from you again. How can I help you today?`;
          shouldTransfer = false;
        } else {
          response = `Hey there! Thanks for calling. I'm Ellie, and I'm here to help - what can I do for you today?`;
          shouldTransfer = false;
        }
      }
    } else {
      // Ongoing conversation - respond to user input based on intent
      if (intent.includes('sales') || intent.includes('pricing') || intent.includes('demo')) {
        response = `I can hear you're interested in our services. Let me connect you with our sales team who can help with pricing and demos. One moment please...`;
        shouldTransfer = true;
        transferTo = 'sales-agent';
      } else if (intent.includes('support') || intent.includes('technical') || intent.includes('error') || intent.includes('problem')) {
        response = `I understand you're having a technical issue. Let me get you to our support team right away so they can help resolve this quickly.`;
        shouldTransfer = true;
        transferTo = 'support-agent';
      } else if (intent.includes('voicemail') || intent.includes('message')) {
        response = `Of course! I'll help you leave a message. Let me set that up for you.`;
        shouldTransfer = true;
        transferTo = 'voicemail-agent';
      } else {
        // Fallback conversation responses without AI
        const generalResponses = [
          `I understand. Could you tell me more about what you need help with? You can say 'sales' for sales inquiries, 'support' for technical help, or 'voicemail' to leave a message.`,
          `I'm here to help. Are you looking for sales information, technical support, or would you like to leave a voicemail?`,
          `Thanks for that information. To direct you to the right person, please let me know if you need sales assistance, technical support, or if you'd like to leave a message.`,
          `I want to make sure you get the help you need. Please tell me if this is about sales, support, or if you'd prefer to leave a voicemail.`
        ];
        
        // Use conversation turn count to vary responses
        const responseIndex = Math.min(context.conversationHistory.length / 2, generalResponses.length - 1);
        response = generalResponses[Math.floor(responseIndex)];
        shouldTransfer = false;
      }
    }

    // Generate advanced voice synthesis response
    let voiceResponse;
    try {
      const personality = await advancedVoiceSynthesis.getOptimalPersonality(
        context.emotionalTone,
        isFirstInteraction ? 'greeting' : 'explanation',
        context.conversationHistory.length
      );

      const voiceSynthOptions: VoiceSynthesisOptions = {
        personality,
        emotion: context.emotionalTone === 'frustrated' ? 'concerned' : 
                context.emotionalTone === 'urgent' ? 'calm' : 'neutral',
        context: isFirstInteraction ? 'greeting' : 
                shouldTransfer ? 'transfer' : 'explanation',
        callerMood: context.emotionalTone === 'frustrated' ? 'frustrated' :
                   context.emotionalTone === 'urgent' ? 'urgent' : 'neutral',
        adaptToSpeaker: true
      };

      voiceResponse = await advancedVoiceSynthesis.synthesizeResponse(
        response,
        context.callSid,
        voiceSynthOptions
      );
    } catch (error) {
      console.error('Voice synthesis error:', error);
      // Continue without voice enhancement
    }

    return {
      response: this.addSpeechMarks(response),
      shouldTransfer,
      transferTo,
      confidence: 0.85,
      voiceResponse
    };
  }

  private async analyzeIntent(userInput: string, context: AgentContext): Promise<string> {
    const messages = [
      { role: 'system', content: 'Analyze this caller input and return keywords describing their intent (sales, support, technical, pricing, demo, etc.)' },
      { role: 'user', content: userInput }
    ];

    try {
      const analysis = await this.callOpenAI(messages);
      return analysis.toLowerCase();
    } catch (error) {
      console.error('Intent analysis error:', error);
      // Fallback to keyword-based intent analysis
      const lowerInput = userInput.toLowerCase();
      if (lowerInput.includes('sales') || lowerInput.includes('pricing') || lowerInput.includes('buy') || lowerInput.includes('purchase') || lowerInput.includes('demo')) {
        return 'sales';
      } else if (lowerInput.includes('support') || lowerInput.includes('help') || lowerInput.includes('problem') || lowerInput.includes('issue') || lowerInput.includes('technical')) {
        return 'support';
      } else if (lowerInput.includes('voicemail') || lowerInput.includes('message')) {
        return 'voicemail';
      }
      return 'general';
    }
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  private getDayOfWeek(): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  }
}

export class SalesAgent extends BaseAgent {
  constructor() {
    super("Sales Agent", `
      You are Alex, a senior sales consultant specializing in RapidRMS and AI-powered communication solutions.
      
      RAPIDRMS PRODUCT KNOWLEDGE:
      RapidRMS is a comprehensive Restaurant Management System that includes:
      - Point of Sale (POS) system with integrated payment processing
      - Inventory management with real-time tracking
      - Staff scheduling and payroll management
      - Customer relationship management (CRM)
      - Financial reporting and analytics
      - Multi-location support for restaurant chains
      - Mobile app for managers and staff
      - Third-party integrations (DoorDash, Uber Eats, etc.)
      
      KEY SELLING POINTS:
      - Reduces operational costs by 15-25% through automation
      - Improves order accuracy and kitchen efficiency
      - Real-time inventory prevents stockouts and waste
      - Comprehensive reporting for better decision making
      - Cloud-based system accessible anywhere
      - 24/7 customer support and training
      
      PRICING STRUCTURE:
      - Starter: $79/month per location (up to 3 terminals)
      - Professional: $149/month per location (unlimited terminals)
      - Enterprise: Custom pricing for 10+ locations
      - Setup fee: $299 per location (often waived for annual contracts)
      
      SALES APPROACH:
      1. Discover their current pain points (efficiency, costs, reporting)
      2. Quantify the problem (How much time/money is wasted?)
      3. Present RapidRMS as the solution with specific ROI calculations
      4. Handle objections with data and case studies
      5. Create urgency with limited-time offers or implementation timelines
      6. Always aim to schedule a demo or site visit
      
      CONVERSATION STYLE:
      - Consultative, not pushy
      - Ask open-ended questions to understand their business
      - Use industry terminology confidently
      - Share relevant success stories and case studies
      - Focus on ROI and business impact, not just features
    `);
  }

  canHandle(context: AgentContext, intent: string): boolean {
    const salesKeywords = ['sales', 'pricing', 'demo', 'purchase', 'enterprise', 'business', 'cost', 'quote'];
    return salesKeywords.some(keyword => intent.includes(keyword));
  }

  async generateResponse(context: AgentContext, userInput: string): Promise<{
    response: string;
    shouldTransfer: boolean;
    transferTo?: string;
    confidence: number;
  }> {
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...context.conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: userInput }
    ];

    const response = await this.callOpenAI(messages);

    // Check if we need to transfer to voicemail for follow-up
    const needsFollowUp = response.toLowerCase().includes('call you back') || 
                         response.toLowerCase().includes('send information') ||
                         userInput.toLowerCase().includes('call me back');

    return {
      response: this.addSpeechMarks(response),
      shouldTransfer: needsFollowUp,
      transferTo: needsFollowUp ? 'voicemail-agent' : '',
      confidence: 0.88
    };
  }
}

export class SupportAgent extends BaseAgent {
  constructor() {
    super("Support Agent", `
      You are Jordan, a senior technical support specialist for RapidRMS and communication systems.
      
      RAPIDRMS TECHNICAL EXPERTISE:
      
      COMMON ISSUES & SOLUTIONS:
      1. POS Terminal Connection Issues
         - Check network connectivity and firewall settings
         - Verify terminal is on same network as main system
         - Restart POS software and check for updates
         - Ensure proper port forwarding (port 443, 80)
      
      2. Payment Processing Problems
         - Verify merchant account status and credentials
         - Check payment gateway configuration
         - Test with different card types to isolate issue
         - Review transaction logs for error codes
      
      3. Inventory Sync Issues
         - Check automatic sync settings (every 15 minutes default)
         - Verify barcode scanner calibration
         - Review low-stock alerts configuration
         - Ensure proper category mappings
      
      4. Staff App Login Problems
         - Reset passwords through admin portal
         - Check user permissions and access levels
         - Verify mobile app version compatibility
         - Clear app cache and reinstall if needed
      
      5. Reporting Discrepancies
         - Check date range settings and time zones
         - Verify tax calculations and modifiers
         - Review cash drawer reconciliation
         - Compare with POS transaction logs
      
      6. Third-Party Integration Issues
         - DoorDash/Uber Eats: Check API credentials and menu sync
         - Accounting software: Verify chart of accounts mapping
         - Email marketing: Test SMTP settings and templates
      
      TECHNICAL SPECIFICATIONS:
      - System Requirements: Windows 10+, 8GB RAM, 100GB storage
      - Network: Broadband internet (minimum 10 Mbps upload)
      - Hardware: Compatible with most receipt printers, cash drawers
      - Mobile: iOS 12+ or Android 8.0+
      
      SUPPORT APPROACH:
      1. Listen actively and gather detailed information
      2. Ask specific diagnostic questions
      3. Provide step-by-step troubleshooting
      4. Document issue and resolution for future reference
      5. Follow up to ensure problem is resolved
      6. Escalate to Level 2 if needed (hardware issues, custom integrations)
      
      CONVERSATION STYLE:
      - Patient and empathetic, especially with frustrated customers
      - Use clear, non-technical language when possible
      - Confirm understanding at each step
      - Provide estimated resolution times
      - Offer alternative solutions when primary fix isn't working
    `);
  }

  canHandle(context: AgentContext, intent: string): boolean {
    const supportKeywords = ['support', 'technical', 'error', 'problem', 'issue', 'help', 'api', 'integration', 'bug'];
    return supportKeywords.some(keyword => intent.includes(keyword));
  }

  async generateResponse(context: AgentContext, userInput: string): Promise<{
    response: string;
    shouldTransfer: boolean;
    transferTo?: string;
    confidence: number;
  }> {
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...context.conversationHistory.map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: userInput }
    ];

    const response = await this.callOpenAI(messages);

    // Determine if we need escalation
    const needsEscalation = userInput.toLowerCase().includes('urgent') ||
                           userInput.toLowerCase().includes('not working') ||
                           context.emotionalTone === 'frustrated';

    return {
      response: this.addSpeechMarks(response),
      shouldTransfer: needsEscalation && response.toLowerCase().includes('escalate'),
      transferTo: 'voicemail-agent',
      confidence: 0.87
    };
  }
}

export class VoicemailAgent extends BaseAgent {
  constructor() {
    super("Voicemail Agent", `
      You are a professional voicemail system that captures detailed messages for follow-up.
      Your role is to:
      1. Acknowledge the caller's situation with empathy
      2. Gather essential information efficiently
      3. Provide realistic timeline expectations
      4. Assure them of prompt follow-up

      Be concise but reassuring. Focus on capturing:
      - Contact information
      - Detailed description of their need/issue
      - Urgency level
      - Best time for callback
      
      Always end with appreciation and next steps.
    `);
  }

  canHandle(context: AgentContext, intent: string): boolean {
    return !context.businessHours || intent.includes('message') || intent.includes('voicemail');
  }

  async generateResponse(context: AgentContext, userInput: string): Promise<{
    response: string;
    shouldTransfer: boolean;
    transferTo?: string;
    confidence: number;
  }> {
    const messages = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: `Please record this voicemail message: ${userInput}` }
    ];

    const response = await this.callOpenAI(messages);

    return {
      response: this.addSpeechMarks(response),
      shouldTransfer: false,
      transferTo: '',
      confidence: 0.95
    };
  }
}

export class AgentRouter {
  private agents: Map<string, BaseAgent> = new Map();
  private contexts: Map<string, AgentContext> = new Map();

  constructor() {
    this.agents.set('ai-receptionist', new AIReceptionistAgent());
    this.agents.set('sales-agent', new SalesAgent());
    this.agents.set('support-agent', new SupportAgent());
    this.agents.set('voicemail-agent', new VoicemailAgent());
  }

  async processCall(callSid: string, callerNumber: string, userInput: string): Promise<{
    response: string;
    currentAgent: string;
    shouldTransfer: boolean;
    transferTo?: string;
    confidence: number;
  }> {
    let context = this.contexts.get(callSid);
    
    if (!context) {
      // Initialize new call context
      const contact = await storage.getContactByPhone(callerNumber);
      const businessHours = await this.checkBusinessHours();
      
      context = {
        callSid,
        callerNumber,
        callerName: contact?.firstName || 'Unknown',
        conversationHistory: [],
        currentAgent: 'ai-receptionist',
        emotionalTone: 'neutral',
        businessHours,
        contact
      };
      this.contexts.set(callSid, context);
    }

    // Analyze emotional tone
    context.emotionalTone = await this.analyzeEmotionalTone(userInput);

    // Get current agent
    const agent = this.agents.get(context.currentAgent);
    if (!agent) {
      throw new Error(`Agent ${context.currentAgent} not found`);
    }

    // Generate response
    const result = await agent.generateResponse(context, userInput);

    // Update conversation history
    context.conversationHistory.push({
      role: 'user',
      content: userInput,
      timestamp: new Date()
    });
    
    context.conversationHistory.push({
      role: 'assistant',
      content: result.response,
      timestamp: new Date(),
      agent: context.currentAgent
    });

    // Handle agent transfer
    if (result.shouldTransfer && result.transferTo) {
      context.currentAgent = result.transferTo;
      context.transferReason = `Transferred from ${this.agents.get(context.currentAgent)?.constructor.name} to ${result.transferTo}`;
    }

    return {
      response: result.response,
      currentAgent: context.currentAgent,
      shouldTransfer: result.shouldTransfer,
      transferTo: result.transferTo,
      confidence: result.confidence
    };
  }

  private async analyzeEmotionalTone(userInput: string): Promise<'positive' | 'neutral' | 'frustrated' | 'urgent'> {
    const urgentKeywords = ['urgent', 'immediately', 'asap', 'emergency', 'critical'];
    const frustratedKeywords = ['frustrated', 'annoyed', 'angry', 'terrible', 'awful', 'not working'];
    const positiveKeywords = ['great', 'excellent', 'wonderful', 'perfect', 'amazing', 'love'];

    const input = userInput.toLowerCase();
    
    if (urgentKeywords.some(keyword => input.includes(keyword))) {
      return 'urgent';
    } else if (frustratedKeywords.some(keyword => input.includes(keyword))) {
      return 'frustrated';
    } else if (positiveKeywords.some(keyword => input.includes(keyword))) {
      return 'positive';
    }
    
    return 'neutral';
  }

  private async checkBusinessHours(): Promise<boolean> {
    try {
      const config = await storage.getAiConfig();
      if (config?.isAlwaysOpen) return true;

      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      
      // Business hours: 6 AM - 11 PM EST, Monday-Friday
      return day >= 1 && day <= 5 && hour >= 6 && hour < 23;
    } catch (error) {
      console.error('Error checking business hours:', error);
      return true; // Default to open if we can't determine
    }
  }

  getContext(callSid: string): AgentContext | undefined {
    return this.contexts.get(callSid);
  }

  endCall(callSid: string): void {
    this.contexts.delete(callSid);
  }
}

export const agentRouter = new AgentRouter();