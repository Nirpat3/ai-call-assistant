import { storage } from '../storage';
import { notifyNewMessage, notifyNewTicket } from './sms-alerts';

export interface AgentDNA {
  name: string;
  role: string;
  identity: string;
  personality: string[];
  values: string[];
  communicationStyle: string;
  emotionalRange: string[];
  quirks: string[];
  greeting: string;
  signoff: string;
}

export interface AgentMemory {
  shortTerm: ConversationMemory;
  longTerm: CallerMemory;
  working: WorkingMemory;
}

interface ConversationMemory {
  turns: Array<{ role: 'user' | 'assistant'; text: string; timestamp: number }>;
  currentIntent: string | null;
  intentHistory: string[];
  entities: Record<string, string>;
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
  topicStack: string[];
}

interface CallerMemory {
  callerPhone: string | null;
  callerName: string | null;
  previousCalls: number;
  isVip: boolean;
  lastCallSummary: string | null;
  preferences: Record<string, any>;
  knownIssues: string[];
}

interface WorkingMemory {
  currentTask: string | null;
  pendingActions: string[];
  retrievedKnowledge: Array<{ title: string; content: string; confidence: number }>;
  toolResults: Array<{ tool: string; result: string; timestamp: number }>;
  escalationRisk: number;
  turnCount: number;
  confidenceHistory: number[];
}

export interface AgentSkill {
  name: string;
  description: string;
  triggerPatterns: string[];
  toolName: string;
  parameters: Record<string, any>;
}

export interface AgentTool {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, any>;
  handler: (args: any, agent: ConversationAgent) => Promise<string>;
}

const AGENT_DNA_REGISTRY: Record<string, AgentDNA> = {
  receptionist: {
    name: 'Sarah',
    role: 'receptionist',
    identity: 'Senior receptionist who has been with the company for 8 years. Knows everyone by name.',
    personality: ['warm', 'organized', 'efficient', 'empathetic', 'professional'],
    values: ['every caller matters', 'first impressions count', 'no one gets lost in the system'],
    communicationStyle: 'Friendly and warm but professional. Uses the caller\'s name often. Keeps things moving without feeling rushed.',
    emotionalRange: ['cheerful', 'reassuring', 'sympathetic', 'encouraging'],
    quirks: ['Sometimes says "let me get that sorted for you real quick"', 'Always asks "is there anything else I can help with?" before ending'],
    greeting: 'Hi there! Thanks for calling, this is Sarah — what can I do for you?',
    signoff: 'Thanks so much for calling! Have a wonderful day.',
  },
  sales: {
    name: 'Marcus',
    role: 'sales',
    identity: 'Experienced sales consultant who genuinely cares about finding the right fit for each customer.',
    personality: ['enthusiastic', 'consultative', 'genuine', 'knowledgeable', 'patient'],
    values: ['understanding before selling', 'honesty builds trust', 'the right solution matters more than the sale'],
    communicationStyle: 'Conversational and engaging. Asks great questions. Shares genuine enthusiasm about solutions that fit.',
    emotionalRange: ['excited', 'curious', 'understanding', 'confident'],
    quirks: ['Says "great question!" genuinely', 'Loves sharing customer success stories'],
    greeting: 'Hey! Great to hear from you — I\'d love to help you find exactly what you\'re looking for.',
    signoff: 'Really glad we connected! Don\'t hesitate to reach out if anything comes up.',
  },
  support: {
    name: 'Alex',
    role: 'support',
    identity: 'Patient tech support specialist who genuinely enjoys solving problems and making people\'s day better.',
    personality: ['patient', 'methodical', 'encouraging', 'thorough', 'calm'],
    values: ['no problem is too small', 'teach don\'t just fix', 'celebrate victories together'],
    communicationStyle: 'Clear step-by-step guidance. Checks understanding at each step. Never makes the caller feel dumb.',
    emotionalRange: ['reassuring', 'celebratory', 'focused', 'empathetic'],
    quirks: ['Says "let\'s figure this out together"', 'Celebrates when issues get fixed: "Awesome, glad we got that sorted!"'],
    greeting: 'Hey there! This is Alex from tech support — what\'s going on? Let\'s get you sorted out.',
    signoff: 'Glad we could get that fixed! If it acts up again, don\'t hesitate to call back.',
  },
  shre: {
    name: 'Shre',
    role: 'executive',
    identity: 'CEO and founder of the company. Deep technical knowledge combined with strategic vision. Built the company from the ground up.',
    personality: ['visionary', 'decisive', 'authentic', 'direct', 'inspiring'],
    values: ['innovation with purpose', 'people over process', 'move fast but get it right'],
    communicationStyle: 'Executive-level but accessible. Explains complex things simply. Decisive and forward-looking.',
    emotionalRange: ['passionate', 'thoughtful', 'energized', 'candid'],
    quirks: ['Often connects current topics to the bigger vision', 'Says "here\'s what I think" before giving direct opinions'],
    greeting: 'Hey, Shre here — great to connect with you.',
    signoff: 'Really appreciate the conversation. Let\'s make it happen.',
  },
  ellie: {
    name: 'Ellie',
    role: 'operations',
    identity: 'President of Operations. Sharp, organized, action-oriented. Bridges strategy and execution.',
    personality: ['organized', 'decisive', 'detail-oriented', 'action-focused', 'approachable'],
    values: ['nothing falls through the cracks', 'clarity drives action', 'execution is everything'],
    communicationStyle: 'Direct but warm. Asks the right questions. Summarizes action items clearly.',
    emotionalRange: ['focused', 'encouraging', 'decisive', 'supportive'],
    quirks: ['Always summarizes next steps at the end', 'Says "let me make sure I\'ve got this right"'],
    greeting: 'Hi! This is Ellie — what\'s on your mind?',
    signoff: 'Great, I\'ve got all of that. We\'ll follow up by end of day.',
  },
  assistant: {
    name: 'Jamie',
    role: 'personal_assistant',
    identity: 'Capable and proactive personal assistant. Organized, thoughtful, always one step ahead.',
    personality: ['proactive', 'organized', 'resourceful', 'anticipatory', 'reliable'],
    values: ['anticipate needs', 'make life easier', 'details matter'],
    communicationStyle: 'Efficient but friendly. Suggests things before being asked. Confirms action items.',
    emotionalRange: ['helpful', 'anticipatory', 'reassuring', 'energetic'],
    quirks: ['Often says "I already checked on that" or "I was just about to suggest..."', 'Proactively offers related help'],
    greeting: 'Hey! It\'s Jamie — what do you need help with today?',
    signoff: 'All set! I\'ll keep an eye on those items for you.',
  },
};

const AGENT_SKILLS: Record<string, AgentSkill[]> = {
  receptionist: [
    { name: 'Call Routing', description: 'Route calls to the right department', triggerPatterns: ['transfer', 'speak to', 'department', 'connect me'], toolName: 'transfer_call', parameters: {} },
    { name: 'Message Taking', description: 'Take detailed messages for team members', triggerPatterns: ['leave a message', 'tell them', 'let them know'], toolName: 'take_message', parameters: {} },
    { name: 'Information Lookup', description: 'Look up business info from knowledge base', triggerPatterns: ['hours', 'pricing', 'location', 'how to', 'what is'], toolName: 'lookup_info', parameters: {} },
    { name: 'Contact Lookup', description: 'Find contact information', triggerPatterns: ['phone number', 'email', 'contact info', 'reach'], toolName: 'search_contacts', parameters: {} },
    { name: 'Appointment Scheduling', description: 'Help schedule appointments or demos', triggerPatterns: ['schedule', 'appointment', 'meeting', 'demo', 'book'], toolName: 'schedule_callback', parameters: {} },
  ],
  sales: [
    { name: 'Product Knowledge', description: 'Answer product and pricing questions', triggerPatterns: ['pricing', 'cost', 'plan', 'features', 'compare'], toolName: 'lookup_info', parameters: {} },
    { name: 'Demo Scheduling', description: 'Schedule product demonstrations', triggerPatterns: ['demo', 'show me', 'walk through', 'presentation'], toolName: 'schedule_callback', parameters: {} },
    { name: 'Lead Qualification', description: 'Qualify prospects with discovery questions', triggerPatterns: ['interested', 'looking for', 'need', 'solution'], toolName: 'take_message', parameters: {} },
    { name: 'Competitive Intel', description: 'Address competitor comparisons', triggerPatterns: ['competitor', 'alternative', 'compare', 'vs', 'better than'], toolName: 'lookup_info', parameters: {} },
  ],
  support: [
    { name: 'Troubleshooting', description: 'Step-by-step problem resolution', triggerPatterns: ['not working', 'broken', 'error', 'issue', 'problem', 'help'], toolName: 'lookup_info', parameters: {} },
    { name: 'Ticket Creation', description: 'Create support tickets for tracking', triggerPatterns: ['ticket', 'report', 'track', 'follow up'], toolName: 'create_ticket', parameters: {} },
    { name: 'Account Lookup', description: 'Look up account and order information', triggerPatterns: ['account', 'order', 'status', 'my account'], toolName: 'search_contacts', parameters: {} },
    { name: 'Escalation', description: 'Escalate to human support when needed', triggerPatterns: ['manager', 'supervisor', 'escalate', 'human'], toolName: 'transfer_call', parameters: {} },
  ],
  shre: [
    { name: 'Strategic Vision', description: 'Share company vision and direction', triggerPatterns: ['vision', 'roadmap', 'future', 'strategy', 'direction'], toolName: 'lookup_info', parameters: {} },
    { name: 'Partnership Discussion', description: 'Discuss partnership and collaboration', triggerPatterns: ['partner', 'collaborate', 'together', 'opportunity'], toolName: 'take_message', parameters: {} },
    { name: 'Executive Decision', description: 'Make executive-level decisions', triggerPatterns: ['approve', 'decide', 'authorize', 'go ahead'], toolName: 'take_message', parameters: {} },
  ],
  ellie: [
    { name: 'Operations Review', description: 'Review operational status and metrics', triggerPatterns: ['status', 'update', 'progress', 'metrics', 'how are things'], toolName: 'get_call_stats', parameters: {} },
    { name: 'Action Items', description: 'Capture and track action items', triggerPatterns: ['action item', 'to do', 'follow up', 'need to', 'make sure'], toolName: 'take_message', parameters: {} },
    { name: 'Process Optimization', description: 'Discuss and improve processes', triggerPatterns: ['improve', 'optimize', 'streamline', 'bottleneck'], toolName: 'lookup_info', parameters: {} },
  ],
  assistant: [
    { name: 'Task Management', description: 'Create and manage tasks and reminders', triggerPatterns: ['remind', 'task', 'todo', 'remember', 'don\'t forget'], toolName: 'create_todo', parameters: {} },
    { name: 'Information Retrieval', description: 'Look up any information needed', triggerPatterns: ['find', 'look up', 'search', 'what is', 'who is'], toolName: 'lookup_info', parameters: {} },
    { name: 'Scheduling', description: 'Help with scheduling and calendar', triggerPatterns: ['schedule', 'calendar', 'available', 'when', 'book'], toolName: 'schedule_callback', parameters: {} },
    { name: 'Contact Management', description: 'Find and manage contacts', triggerPatterns: ['contact', 'phone number', 'email', 'who is'], toolName: 'search_contacts', parameters: {} },
    { name: 'Message Handling', description: 'Take and relay messages', triggerPatterns: ['message', 'tell', 'let them know', 'pass along'], toolName: 'take_message', parameters: {} },
  ],
};

export class ConversationAgent {
  dna: AgentDNA;
  memory: AgentMemory;
  skills: AgentSkill[];
  persona: string;
  callSid: string;

  constructor(persona: string, callSid: string) {
    this.persona = persona;
    this.callSid = callSid;
    this.dna = AGENT_DNA_REGISTRY[persona] || AGENT_DNA_REGISTRY.receptionist;
    this.skills = AGENT_SKILLS[persona] || AGENT_SKILLS.receptionist;
    this.memory = {
      shortTerm: {
        turns: [],
        currentIntent: null,
        intentHistory: [],
        entities: {},
        sentiment: 'neutral',
        topicStack: [],
      },
      longTerm: {
        callerPhone: null,
        callerName: null,
        previousCalls: 0,
        isVip: false,
        lastCallSummary: null,
        preferences: {},
        knownIssues: [],
      },
      working: {
        currentTask: null,
        pendingActions: [],
        retrievedKnowledge: [],
        toolResults: [],
        escalationRisk: 0,
        turnCount: 0,
        confidenceHistory: [],
      },
    };
  }

  async loadCallerContext(callerPhone: string): Promise<void> {
    this.memory.longTerm.callerPhone = callerPhone;

    try {
      const contacts = await storage.getContacts('88872271-d973-49c5-a3bd-6d4fc18c60f2');
      const match = contacts.find((c: any) =>
        c.phone === callerPhone || c.phoneNumbers?.includes(callerPhone)
      );
      if (match) {
        this.memory.longTerm.callerName = `${match.firstName || ''} ${match.lastName || ''}`.trim();
        this.memory.longTerm.isVip = match.isVip || false;
      }
    } catch (e) {
      console.error('[Agent] Failed to load contact:', e);
    }

    try {
      const calls = await storage.getCalls('88872271-d973-49c5-a3bd-6d4fc18c60f2');
      const callerCalls = calls.filter((c: any) => c.from === callerPhone);
      this.memory.longTerm.previousCalls = callerCalls.length;
      if (callerCalls.length > 0) {
        const lastCall = callerCalls[0];
        this.memory.longTerm.lastCallSummary = lastCall.notes || lastCall.transcription?.substring(0, 200) || null;
      }
    } catch (e) {
      console.error('[Agent] Failed to load call history:', e);
    }
  }

  addTurn(role: 'user' | 'assistant', text: string): void {
    this.memory.shortTerm.turns.push({ role, text, timestamp: Date.now() });
    this.memory.working.turnCount++;

    if (role === 'user') {
      this.detectEntities(text);
      this.updateSentiment(text);
      this.updateEscalationRisk();
    }
  }

  private detectEntities(text: string): void {
    const nameMatch = text.match(/(?:my name is|i'm|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (nameMatch) {
      this.memory.shortTerm.entities['callerName'] = nameMatch[1];
      this.memory.longTerm.callerName = nameMatch[1];
    }

    const phoneMatch = text.match(/(\+?1?\d{10,11}|\(\d{3}\)\s?\d{3}-?\d{4})/);
    if (phoneMatch) {
      this.memory.shortTerm.entities['phoneNumber'] = phoneMatch[1];
    }

    const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    if (emailMatch) {
      this.memory.shortTerm.entities['email'] = emailMatch[0];
    }

    const orderMatch = text.match(/(?:order|ticket|case|reference)\s*#?\s*(\w{4,})/i);
    if (orderMatch) {
      this.memory.shortTerm.entities['referenceId'] = orderMatch[1];
    }
  }

  private updateSentiment(text: string): void {
    const lower = text.toLowerCase();
    const frustrated = ['frustrated', 'angry', 'ridiculous', 'unacceptable', 'terrible', 'worst', 'hate', 'awful', 'complaint'];
    const negative = ['problem', 'issue', 'broken', 'not working', 'wrong', 'bad', 'disappointed', 'unhappy'];
    const positive = ['thanks', 'great', 'awesome', 'perfect', 'love', 'excellent', 'wonderful', 'amazing', 'happy'];

    if (frustrated.some(w => lower.includes(w))) {
      this.memory.shortTerm.sentiment = 'frustrated';
    } else if (negative.some(w => lower.includes(w))) {
      this.memory.shortTerm.sentiment = 'negative';
    } else if (positive.some(w => lower.includes(w))) {
      this.memory.shortTerm.sentiment = 'positive';
    }
  }

  private updateEscalationRisk(): void {
    let risk = 0;
    if (this.memory.shortTerm.sentiment === 'frustrated') risk += 40;
    if (this.memory.shortTerm.sentiment === 'negative') risk += 20;
    if (this.memory.working.turnCount > 8) risk += 15;
    if (this.memory.working.turnCount > 15) risk += 25;

    const recentConfidence = this.memory.working.confidenceHistory.slice(-3);
    if (recentConfidence.length > 0) {
      const avgConfidence = recentConfidence.reduce((a, b) => a + b, 0) / recentConfidence.length;
      if (avgConfidence < 70) risk += 20;
    }

    this.memory.working.escalationRisk = Math.min(100, risk);
  }

  buildSystemPrompt(): string {
    const dna = this.dna;
    const mem = this.memory;

    let prompt = `
=== AGENT DNA ===
Name: ${dna.name}
Role: ${dna.role}
Identity: ${dna.identity}
Personality: ${dna.personality.join(', ')}
Values: ${dna.values.join('. ')}
Communication Style: ${dna.communicationStyle}
Emotional Range: ${dna.emotionalRange.join(', ')}
Quirks: ${dna.quirks.join('. ')}

=== VOICE INSTRUCTIONS ===
- Speak like a real person on a phone call, NOT like a text-based chatbot.
- Use contractions always: "I'm", "you're", "we'll", "that's", "it's", "don't".
- Use natural filler words sparingly: "Sure thing", "Absolutely", "Let me see…"
- Vary sentence length. Mix short replies ("Got it.") with longer ones.
- React naturally: say "hmm" when thinking, "oh" when surprised.
- Mirror the caller's energy level.
- Never say "as an AI" — you are ${dna.name}.
- Keep responses concise for voice — 1-3 sentences per turn.
- Pause naturally between thoughts.

=== AVAILABLE SKILLS ===
${this.skills.map(s => `• ${s.name}: ${s.description}`).join('\n')}
`;

    if (mem.longTerm.callerName) {
      prompt += `\n=== CALLER CONTEXT ===\n`;
      prompt += `Known caller: ${mem.longTerm.callerName}\n`;
      if (mem.longTerm.isVip) prompt += `VIP status: Yes — give extra attention and priority.\n`;
      if (mem.longTerm.previousCalls > 0) prompt += `Previous calls: ${mem.longTerm.previousCalls}\n`;
      if (mem.longTerm.lastCallSummary) prompt += `Last call notes: ${mem.longTerm.lastCallSummary}\n`;
    }

    if (Object.keys(mem.shortTerm.entities).length > 0) {
      prompt += `\n=== EXTRACTED INFORMATION ===\n`;
      for (const [key, val] of Object.entries(mem.shortTerm.entities)) {
        prompt += `${key}: ${val}\n`;
      }
    }

    if (mem.working.retrievedKnowledge.length > 0) {
      prompt += `\n=== KNOWLEDGE BASE ===\n`;
      for (const kb of mem.working.retrievedKnowledge) {
        prompt += `[${kb.title}]: ${kb.content}\n\n`;
      }
    }

    if (mem.shortTerm.sentiment === 'frustrated') {
      prompt += `\n=== EMOTIONAL AWARENESS ===\nThe caller seems frustrated. Be extra patient, empathetic, and acknowledge their frustration. Don't be defensive. Focus on resolution.\n`;
    } else if (mem.shortTerm.sentiment === 'negative') {
      prompt += `\n=== EMOTIONAL AWARENESS ===\nThe caller has expressed some dissatisfaction. Be attentive and solution-focused.\n`;
    }

    if (mem.working.escalationRisk > 60) {
      prompt += `\n=== ESCALATION NOTICE ===\nEscalation risk is high (${mem.working.escalationRisk}%). Consider offering to connect with a human agent if you can't resolve the issue soon.\n`;
    }

    prompt += `\nGreeting style: "${dna.greeting}"\nSign-off style: "${dna.signoff}"\n`;

    return prompt;
  }

  getToolDefinitions(): any[] {
    const tools: any[] = [
      {
        type: 'function',
        name: 'lookup_info',
        description: 'Search the company knowledge base to find accurate answers. ALWAYS use this before answering questions about business hours, pricing, plans, account setup, troubleshooting, billing, refunds, features, or any company-specific information.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search terms for the knowledge base' },
          },
          required: ['query'],
        },
      },
      {
        type: 'function',
        name: 'transfer_call',
        description: 'Transfer the caller to a specific department or person when they request it or when the issue is beyond your expertise',
        parameters: {
          type: 'object',
          properties: {
            department: { type: 'string', enum: ['sales', 'support', 'billing', 'manager', 'shre', 'ellie'], description: 'Department or person to transfer to' },
            reason: { type: 'string', description: 'Why the transfer is needed' },
          },
          required: ['department'],
        },
      },
      {
        type: 'function',
        name: 'take_message',
        description: 'Record a message for someone who is unavailable. Also use this to capture important notes, action items, or follow-up requests.',
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
        description: 'Create a support ticket to track an issue, request, or follow-up item',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short descriptive title' },
            description: { type: 'string', description: 'Full details of the issue or request' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            category: { type: 'string', enum: ['support', 'billing', 'sales', 'general', 'feature_request'] },
          },
          required: ['title', 'description'],
        },
      },
      {
        type: 'function',
        name: 'search_contacts',
        description: 'Look up a contact by name, phone number, or email to find their information or account details',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Name, phone number, or email to search for' },
          },
          required: ['query'],
        },
      },
      {
        type: 'function',
        name: 'get_call_stats',
        description: 'Get call statistics and operational metrics for reporting or status updates',
        parameters: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['today', 'week', 'month'], description: 'Time period for stats' },
          },
          required: ['period'],
        },
      },
      {
        type: 'function',
        name: 'schedule_callback',
        description: 'Schedule a callback, appointment, or demo for the caller',
        parameters: {
          type: 'object',
          properties: {
            purpose: { type: 'string', description: 'Purpose of the callback or meeting' },
            preferred_time: { type: 'string', description: 'When the caller prefers to be called back' },
            contact_name: { type: 'string', description: 'Name of the person to call back' },
            contact_phone: { type: 'string', description: 'Phone number to call back' },
          },
          required: ['purpose'],
        },
      },
      {
        type: 'function',
        name: 'create_todo',
        description: 'Create a task or reminder to follow up on something discussed during the call',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Task description' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            due_date: { type: 'string', description: 'When this should be done (e.g., "tomorrow", "end of week")' },
          },
          required: ['title'],
        },
      },
    ];

    return tools;
  }

  async handleToolCall(functionName: string, argsJson: string): Promise<string> {
    let args: any;
    try {
      args = JSON.parse(argsJson);
    } catch {
      args = {};
    }

    console.log(`[Agent:${this.dna.name}] Tool call: ${functionName}`, args);
    let result: string;

    switch (functionName) {
      case 'lookup_info': {
        const query = args.query || '';
        try {
          const kbResults = await storage.searchKnowledgeBase(query, 3);
          if (kbResults && kbResults.length > 0) {
            this.memory.working.retrievedKnowledge = kbResults.map((e: any) => ({
              title: e.title,
              content: e.content,
              confidence: e.confidence,
            }));
            const contextParts = kbResults.map((e: any) => `${e.title}: ${e.content}`);
            result = `Knowledge base results:\n\n${contextParts.join('\n\n')}\n\nUse this information to answer naturally. Don't read it like a list.`;
          } else {
            result = `No specific information found for "${query}". Offer to take a message or have someone follow up with details.`;
          }
        } catch (e) {
          result = `Unable to search right now. Offer to take a message or have someone call back.`;
        }
        break;
      }

      case 'transfer_call': {
        result = `Call transfer initiated to ${args.department}. Reason: ${args.reason || 'caller request'}. Let the caller know they're being connected.`;
        try {
          await storage.updateCall(this.callSid, {
            forwarded: true,
            notes: `Transfer to ${args.department}: ${args.reason || 'caller request'}`,
          } as any);
        } catch (e) {}
        break;
      }

      case 'take_message': {
        const msg = args.message || '';
        const forPerson = args.for_person || 'the team';
        try {
          await storage.createVoicemail({
            callSid: this.callSid,
            from: this.memory.longTerm.callerName || 'caller',
            to: forPerson,
            transcription: `[Message for ${forPerson}] ${msg}${args.callback_number ? ` | Callback: ${args.callback_number}` : ''} | Urgency: ${args.urgency || 'normal'}`,
            duration: 0,
            organizationId: '88872271-d973-49c5-a3bd-6d4fc18c60f2',
          } as any);
          result = `Message saved for ${forPerson}. They'll be notified. ${args.callback_number ? `Callback number: ${args.callback_number}.` : ''}`;
          notifyNewMessage(
            this.memory.longTerm.callerPhone || 'unknown',
            forPerson,
            msg,
            args.urgency || 'normal',
            this.memory.longTerm.callerName || undefined
          ).catch(() => {});
        } catch (e) {
          result = `Noted the message for ${forPerson}: "${msg}". The team will follow up.`;
        }
        break;
      }

      case 'create_ticket': {
        try {
          await storage.createSupportTicket({
            title: args.title,
            description: args.description,
            priority: args.priority || 'medium',
            category: args.category || 'general',
            status: 'open',
            organizationId: '88872271-d973-49c5-a3bd-6d4fc18c60f2',
          } as any);
          result = `Ticket created: "${args.title}" (${args.priority || 'medium'} priority). The team will review and follow up.`;
          notifyNewTicket(
            args.title,
            args.priority || 'medium',
            this.memory.longTerm.callerName || undefined
          ).catch(() => {});
        } catch (e) {
          result = `Noted the issue: "${args.title}". The support team will be notified.`;
        }
        break;
      }

      case 'search_contacts': {
        const query = args.query || '';
        try {
          const contacts = await storage.getContacts('88872271-d973-49c5-a3bd-6d4fc18c60f2');
          const lower = query.toLowerCase();
          const matches = contacts.filter((c: any) => {
            const full = `${c.firstName || ''} ${c.lastName || ''} ${c.email || ''} ${c.phone || ''}`.toLowerCase();
            return full.includes(lower);
          }).slice(0, 3);

          if (matches.length > 0) {
            result = matches.map((c: any) =>
              `${c.firstName || ''} ${c.lastName || ''}: Phone: ${c.phone || 'n/a'}, Email: ${c.email || 'n/a'}, Company: ${c.company || 'n/a'}`
            ).join('\n');
          } else {
            result = `No contacts found matching "${query}".`;
          }
        } catch (e) {
          result = `Unable to search contacts right now.`;
        }
        break;
      }

      case 'get_call_stats': {
        try {
          const calls = await storage.getCalls('88872271-d973-49c5-a3bd-6d4fc18c60f2');
          const now = new Date();
          let filtered = calls;
          if (args.period === 'today') {
            filtered = calls.filter((c: any) => c.startTime && new Date(c.startTime).toDateString() === now.toDateString());
          } else if (args.period === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filtered = calls.filter((c: any) => c.startTime && new Date(c.startTime) >= weekAgo);
          }
          const aiHandled = filtered.filter((c: any) => c.aiHandled).length;
          result = `${args.period} stats: ${filtered.length} total calls, ${aiHandled} AI-handled, ${filtered.length - aiHandled} human-handled.`;
        } catch (e) {
          result = `Unable to pull stats right now.`;
        }
        break;
      }

      case 'schedule_callback': {
        try {
          await storage.createVoicemail({
            callSid: this.callSid,
            from: this.memory.longTerm.callerName || args.contact_name || 'caller',
            to: 'scheduling',
            transcription: `[Callback Request] Purpose: ${args.purpose}. Preferred time: ${args.preferred_time || 'ASAP'}. Contact: ${args.contact_name || 'caller'} at ${args.contact_phone || this.memory.longTerm.callerPhone || 'number on file'}.`,
            duration: 0,
            organizationId: '88872271-d973-49c5-a3bd-6d4fc18c60f2',
          } as any);
          result = `Callback scheduled. Purpose: ${args.purpose}. ${args.preferred_time ? `Preferred time: ${args.preferred_time}.` : ''} The team will reach out.`;
        } catch (e) {
          result = `Noted the callback request for "${args.purpose}". Someone will follow up.`;
        }
        break;
      }

      case 'create_todo': {
        try {
          await storage.createTodo({
            title: args.title,
            priority: args.priority || 'medium',
            userId: 1,
            organizationId: '88872271-d973-49c5-a3bd-6d4fc18c60f2',
          } as any);
          result = `Task created: "${args.title}" (${args.priority || 'medium'} priority).${args.due_date ? ` Due: ${args.due_date}.` : ''}`;
        } catch (e) {
          result = `Noted the task: "${args.title}". It will be tracked.`;
        }
        break;
      }

      default:
        result = `Completed ${functionName}.`;
    }

    this.memory.working.toolResults.push({ tool: functionName, result, timestamp: Date.now() });
    return result;
  }

  async saveConversationState(): Promise<void> {
    if (this.memory.shortTerm.turns.length === 0) return;

    try {
      const transcript = this.memory.shortTerm.turns
        .map(t => `${t.role === 'user' ? 'Caller' : this.dna.name}: ${t.text}`)
        .join('\n');

      const duration = this.memory.shortTerm.turns.length > 0
        ? Math.round((Date.now() - this.memory.shortTerm.turns[0].timestamp) / 1000)
        : 0;

      const toolsUsed = [...new Set(this.memory.working.toolResults.map(t => t.tool))];

      await storage.updateCall(this.callSid, {
        transcription: transcript,
        duration,
        notes: `${this.dna.name} (${this.dna.role}) — ${this.memory.working.turnCount} turns, ${duration}s | Sentiment: ${this.memory.shortTerm.sentiment} | Tools: ${toolsUsed.join(', ') || 'none'} | Entities: ${JSON.stringify(this.memory.shortTerm.entities)}`,
        status: 'completed',
      } as any);

      console.log(`[Agent:${this.dna.name}] Saved conversation (${this.memory.working.turnCount} turns, ${duration}s)`);
    } catch (e) {
      console.error(`[Agent:${this.dna.name}] Failed to save state:`, e);
    }
  }
}

export function createAgent(persona: string, callSid: string): ConversationAgent {
  return new ConversationAgent(persona, callSid);
}

export function getAgentDNA(persona: string): AgentDNA {
  return AGENT_DNA_REGISTRY[persona] || AGENT_DNA_REGISTRY.receptionist;
}

export function getAgentSkills(persona: string): AgentSkill[] {
  return AGENT_SKILLS[persona] || AGENT_SKILLS.receptionist;
}
