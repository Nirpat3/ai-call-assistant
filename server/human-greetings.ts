import { storage } from './storage';

export interface GreetingContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  isBusinessHours: boolean;
  callerName?: string;
  isReturningCaller: boolean;
  lastCallDate?: Date;
  callerEmotion?: 'positive' | 'neutral' | 'frustrated' | 'urgent';
  isHoliday?: boolean;
  weatherContext?: string;
}

export interface DynamicGreeting {
  greeting: string;
  followUp: string;
  tone: 'professional' | 'friendly' | 'warm' | 'urgent';
}

export class HumanGreetingSystem {
  private greetingVariations = {
    morning: [
      "Good morning! Thanks for calling.",
      "Hello there! Hope you're having a great morning.",
      "Morning! I'm here to help you today.",
      "Good morning and welcome!",
      "Hello! What a beautiful morning to connect."
    ],
    afternoon: [
      "Good afternoon! Thanks for reaching out.",
      "Hello! Hope your day is going well so far.",
      "Afternoon! I'm ready to assist you.",
      "Good afternoon and welcome!",
      "Hi there! How can I brighten your afternoon?"
    ],
    evening: [
      "Good evening! Thanks for calling.",
      "Hello! Hope you've had a wonderful day.",
      "Evening! I'm here to help you.",
      "Good evening and welcome!",
      "Hi there! How can I assist you this evening?"
    ],
    night: [
      "Hello! Thanks for calling, even at this late hour.",
      "Hi there! I know it's late, but I'm here to help.",
      "Thanks for reaching out. How can I assist you tonight?",
      "Hello! Whatever you need, I'm ready to help.",
      "Hi! I appreciate you calling. What can I do for you?"
    ]
  };

  private personalizedGreetings = {
    returning: [
      "Welcome back! It's great to hear from you again.",
      "Hello again! How can I help you today?",
      "Nice to have you call back! What brings you in today?",
      "Welcome back! I hope everything has been going well.",
      "Hello! Good to hear from you again."
    ],
    vip: [
      "Hello! It's wonderful to hear from you.",
      "Welcome! I'm delighted you called today.",
      "Hello there! I'm here to provide you with excellent service.",
      "Good to hear from you! How may I assist you today?",
      "Welcome! I'm ready to take care of everything you need."
    ]
  };

  private emotionalResponses = {
    frustrated: [
      "I understand this might be frustrating. I'm here to help make things easier.",
      "I can hear the concern in your voice. Let me see how I can assist you.",
      "I want to make sure we resolve whatever's bothering you today.",
      "I'm sorry you're having difficulties. Let's work through this together."
    ],
    urgent: [
      "I can sense this is important to you. Let me help you right away.",
      "I understand you need quick assistance. I'm ready to help immediately.",
      "This sounds urgent. Let me get you the help you need right now.",
      "I'm here to help you with whatever urgent matter you have."
    ]
  };

  private businessHoursResponses = {
    afterHours: [
      "While our main office is closed, I'm here to help you 24/7.",
      "Even though it's after business hours, I'm available to assist you.",
      "Our team isn't in the office right now, but I'm here to help.",
      "Though it's outside normal hours, I'm ready to assist you."
    ],
    holiday: [
      "Happy holidays! While our office is closed today, I'm here to help.",
      "Hope you're enjoying the holiday! I'm available to assist you.",
      "Though it's a holiday, I'm here and ready to help you."
    ]
  };

  private conversationStarters = [
    "What brings you in today?",
    "How can I help you?",
    "What can I do for you?",
    "How may I assist you?",
    "What would you like to discuss?",
    "How can I make your day better?",
    "What's on your mind today?",
    "How can I be of service?"
  ];

  async generateDynamicGreeting(context: GreetingContext): Promise<DynamicGreeting> {
    const config = await storage.getAiConfig();
    
    // If advanced conversation is disabled, use simple greeting
    if (!config?.useAdvancedConversation) {
      return {
        greeting: config?.greeting || "Hello! Thanks for calling. How can I help you today?",
        followUp: "Please let me know what you need assistance with.",
        tone: 'professional'
      };
    }

    // Build dynamic greeting based on context
    let greeting = this.selectBaseGreeting(context);
    let tone: 'professional' | 'friendly' | 'warm' | 'urgent' = 'friendly';

    // Personalize for returning callers
    if (context.isReturningCaller && context.callerName) {
      greeting = this.personalizeForReturningCaller(greeting, context.callerName);
      tone = 'warm';
    }

    // Adjust for emotional context
    if (context.callerEmotion === 'frustrated') {
      greeting = this.addEmpatheticResponse(greeting, 'frustrated');
      tone = 'professional';
    } else if (context.callerEmotion === 'urgent') {
      greeting = this.addEmpatheticResponse(greeting, 'urgent');
      tone = 'urgent';
    }

    // Add business hours context
    if (!context.isBusinessHours) {
      greeting = this.addBusinessHoursContext(greeting, context.isHoliday);
    }

    // Add natural conversation starter
    const followUp = this.selectConversationStarter();

    return {
      greeting,
      followUp,
      tone
    };
  }

  private selectBaseGreeting(context: GreetingContext): string {
    const variations = this.greetingVariations[context.timeOfDay];
    return variations[Math.floor(Math.random() * variations.length)];
  }

  private personalizeForReturningCaller(greeting: string, callerName: string): string {
    const personalizedOptions = this.personalizedGreetings.returning;
    const personal = personalizedOptions[Math.floor(Math.random() * personalizedOptions.length)];
    return `Hello ${callerName}! ${personal.replace('Hello again!', '').replace('Welcome back!', '').trim()}`;
  }

  private addEmpatheticResponse(greeting: string, emotion: 'frustrated' | 'urgent'): string {
    const responses = this.emotionalResponses[emotion];
    const response = responses[Math.floor(Math.random() * responses.length)];
    return `${greeting} ${response}`;
  }

  private addBusinessHoursContext(greeting: string, isHoliday?: boolean): string {
    const contextResponses = isHoliday ? 
      this.businessHoursResponses.holiday : 
      this.businessHoursResponses.afterHours;
    
    const context = contextResponses[Math.floor(Math.random() * contextResponses.length)];
    return `${greeting} ${context}`;
  }

  private selectConversationStarter(): string {
    return this.conversationStarters[Math.floor(Math.random() * this.conversationStarters.length)];
  }

  async analyzeCallerContext(callerNumber: string, callHistory: any[]): Promise<GreetingContext> {
    const now = new Date();
    const hour = now.getHours();
    
    // Determine time of day
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 6 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    // Check business hours (6 AM - 11 PM EST)
    const isBusinessHours = hour >= 6 && hour <= 23;

    // Check if returning caller
    const isReturningCaller = callHistory.length > 0;
    const lastCallDate = callHistory.length > 0 ? new Date(callHistory[0].createdAt) : undefined;

    // Get caller information
    const contact = await storage.getContactByPhone(callerNumber);
    const callerName = contact?.firstName || undefined;

    // Check for holidays (basic implementation)
    const isHoliday = this.isHoliday(now);

    return {
      timeOfDay,
      isBusinessHours,
      callerName,
      isReturningCaller,
      lastCallDate,
      callerEmotion: 'neutral', // Will be determined by voice analysis
      isHoliday
    };
  }

  private isHoliday(date: Date): boolean {
    // Basic holiday detection - can be expanded
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // New Year's Day
    if (month === 1 && day === 1) return true;
    // Christmas
    if (month === 12 && day === 25) return true;
    // July 4th
    if (month === 7 && day === 4) return true;
    
    return false;
  }

  addNaturalSpeechPatterns(text: string): string {
    // Add natural pauses and speech patterns for more human-like delivery
    return text
      .replace(/\. /g, '. <break time="0.4s"/> ')
      .replace(/\? /g, '? <break time="0.5s"/> ')
      .replace(/\! /g, '! <break time="0.3s"/> ')
      .replace(/\, /g, ', <break time="0.2s"/> ')
      .replace(/today/g, 'today <break time="0.2s"/>')
      .replace(/help you/g, 'help <break time="0.1s"/> you')
      .replace(/thank you/gi, 'thank <break time="0.1s"/> you');
  }
}

export const humanGreetingSystem = new HumanGreetingSystem();