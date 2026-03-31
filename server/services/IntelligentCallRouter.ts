import OpenAI from "openai";
import { storage } from '../storage';
import { advancedNotificationEngine } from './AdvancedNotificationEngine';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface CallContext {
  callSid: string;
  callerNumber: string;
  callerName?: string;
  callHistory: any[];
  isVip: boolean;
  isReturningCaller: boolean;
  businessHours: boolean;
  organizationId: string;
  metadata: Record<string, any>;
}

export interface IntentAnalysis {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  sentiment: 'positive' | 'neutral' | 'frustrated' | 'urgent';
  priority: 'low' | 'medium' | 'high' | 'critical';
  keywords: string[];
  context: string;
}

export interface RoutingDecision {
  action: 'route' | 'transfer' | 'voicemail' | 'callback' | 'escalate';
  destination: string;
  reason: string;
  confidence: number;
  estimatedWaitTime?: number;
  alternativeOptions?: string[];
}

export interface AgentCapability {
  agentId: string;
  name: string;
  specializations: string[];
  availability: 'available' | 'busy' | 'offline';
  currentLoad: number;
  maxLoad: number;
  averageHandleTime: number;
  satisfactionScore: number;
  languages: string[];
}

export class IntelligentCallRouter {
  private agentCapabilities: Map<string, AgentCapability> = new Map();
  private routingRules: Map<string, any> = new Map();
  private conversationContexts: Map<string, any> = new Map();

  constructor() {
    this.initializeAgentCapabilities();
    this.initializeRoutingRules();
  }

  private initializeAgentCapabilities() {
    const defaultAgents: AgentCapability[] = [
      {
        agentId: 'ai-receptionist',
        name: 'Maya - AI Receptionist',
        specializations: ['greeting', 'screening', 'basic_info', 'routing'],
        availability: 'available',
        currentLoad: 0,
        maxLoad: 100,
        averageHandleTime: 120,
        satisfactionScore: 4.8,
        languages: ['en', 'es', 'fr']
      },
      {
        agentId: 'sales-specialist',
        name: 'Alex - Sales Specialist',
        specializations: ['sales', 'demos', 'pricing', 'lead_qualification'],
        availability: 'available',
        currentLoad: 3,
        maxLoad: 8,
        averageHandleTime: 450,
        satisfactionScore: 4.7,
        languages: ['en']
      },
      {
        agentId: 'technical-support',
        name: 'Jordan - Technical Support',
        specializations: ['troubleshooting', 'api_support', 'integrations', 'technical_issues'],
        availability: 'available',
        currentLoad: 2,
        maxLoad: 6,
        averageHandleTime: 600,
        satisfactionScore: 4.9,
        languages: ['en', 'es']
      },
      {
        agentId: 'customer-success',
        name: 'Sam - Customer Success',
        specializations: ['onboarding', 'training', 'account_management', 'renewals'],
        availability: 'available',
        currentLoad: 1,
        maxLoad: 5,
        averageHandleTime: 720,
        satisfactionScore: 4.8,
        languages: ['en', 'fr']
      }
    ];

    defaultAgents.forEach(agent => this.agentCapabilities.set(agent.agentId, agent));
  }

  private initializeRoutingRules() {
    // Dynamic routing rules based on AI analysis
    const defaultRules = {
      'vip_immediate': {
        conditions: { isVip: true, priority: ['high', 'critical'] },
        action: 'escalate',
        destination: 'human-manager',
        maxWaitTime: 30
      },
      'sales_inquiry': {
        conditions: { intent: ['sales', 'pricing', 'demo'], businessHours: true },
        action: 'route',
        destination: 'sales-specialist',
        maxWaitTime: 120
      },
      'technical_support': {
        conditions: { intent: ['technical', 'troubleshooting', 'api'], businessHours: true },
        action: 'route',
        destination: 'technical-support',
        maxWaitTime: 180
      },
      'after_hours': {
        conditions: { businessHours: false },
        action: 'voicemail',
        destination: 'voicemail-system',
        callback: true
      }
    };

    Object.entries(defaultRules).forEach(([key, rule]) => {
      this.routingRules.set(key, rule);
    });
  }

  async processIncomingCall(callContext: CallContext, userInput?: string): Promise<RoutingDecision> {
    // Step 1: Analyze caller intent and context
    const intentAnalysis = await this.analyzeCallIntent(callContext, userInput);
    
    // Step 2: Enrich context with historical data
    const enrichedContext = await this.enrichCallContext(callContext, intentAnalysis);
    
    // Step 3: Generate routing decision
    const routingDecision = await this.generateRoutingDecision(enrichedContext, intentAnalysis);
    
    // Step 4: Send intelligent notifications
    await this.sendIntelligentNotifications(enrichedContext, intentAnalysis, routingDecision);
    
    // Step 5: Log decision for learning
    await this.logRoutingDecision(enrichedContext, intentAnalysis, routingDecision);
    
    return routingDecision;
  }

  private async analyzeCallIntent(callContext: CallContext, userInput?: string): Promise<IntentAnalysis> {
    try {
      // Prepare context for AI analysis
      const contextPrompt = this.buildContextPrompt(callContext, userInput);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an advanced call analysis AI that determines caller intent, sentiment, and priority.
            
            Your job is to analyze incoming calls and provide structured insights for intelligent routing.
            
            INTENT CATEGORIES:
            - sales: Pricing, demos, new business, product info
            - support: Technical issues, troubleshooting, API help
            - billing: Payment issues, invoicing, account questions
            - general: Basic info, hours, directions, scheduling
            - complaint: Service issues, dissatisfaction, escalation needed
            - callback: Missed call followup, scheduled calls
            - emergency: Urgent business matters, system outages
            
            SENTIMENT ANALYSIS:
            - positive: Happy, satisfied, interested
            - neutral: Informational, routine business
            - frustrated: Annoyed, experiencing problems
            - urgent: Time-sensitive, needs immediate attention
            
            PRIORITY LEVELS:
            - critical: VIP customers, emergencies, major issues
            - high: Important business, returning frustrated customers
            - medium: Standard business inquiries
            - low: General information, non-urgent requests
            
            Respond with JSON containing: intent, confidence, entities, sentiment, priority, keywords, context`
          },
          {
            role: "user",
            content: contextPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 500
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        intent: analysis.intent || 'general',
        confidence: analysis.confidence || 0.5,
        entities: analysis.entities || {},
        sentiment: analysis.sentiment || 'neutral',
        priority: analysis.priority || 'medium',
        keywords: analysis.keywords || [],
        context: analysis.context || ''
      };
    } catch (error) {
      console.error('Error analyzing call intent:', error);
      return {
        intent: 'general',
        confidence: 0.3,
        entities: {},
        sentiment: 'neutral',
        priority: 'medium',
        keywords: [],
        context: 'Error in analysis'
      };
    }
  }

  private buildContextPrompt(callContext: CallContext, userInput?: string): string {
    return `
    CALLER ANALYSIS REQUEST:
    
    Caller Information:
    - Phone: ${callContext.callerNumber}
    - Name: ${callContext.callerName || 'Unknown'}
    - VIP Status: ${callContext.isVip ? 'Yes' : 'No'}
    - Returning Caller: ${callContext.isReturningCaller ? 'Yes' : 'No'}
    - Business Hours: ${callContext.businessHours ? 'Yes' : 'No'}
    
    Call History (last 5 calls):
    ${callContext.callHistory.slice(0, 5).map(call => 
      `- ${call.createdAt}: ${call.status} (${call.duration}s) - ${call.callType}`
    ).join('\n')}
    
    Current Input: "${userInput || 'No speech input yet'}"
    
    Additional Context:
    ${JSON.stringify(callContext.metadata, null, 2)}
    
    Please analyze this caller's intent, sentiment, and determine the appropriate priority level.
    `;
  }

  private async enrichCallContext(callContext: CallContext, intentAnalysis: IntentAnalysis): Promise<CallContext & { analysis: IntentAnalysis }> {
    // Add more contextual information
    const contact = await storage.getContactByPhone(callContext.callerNumber);
    const recentInteractions = await storage.getRecentInteractionsByPhone(callContext.callerNumber, 30); // Last 30 days
    
    return {
      ...callContext,
      callerName: contact?.firstName || callContext.callerName,
      isVip: contact?.isVip || callContext.isVip,
      metadata: {
        ...callContext.metadata,
        totalCalls: callContext.callHistory.length,
        lastCallDate: callContext.callHistory[0]?.createdAt,
        recentInteractions: recentInteractions.length,
        preferredLanguage: contact?.language || 'en'
      },
      analysis: intentAnalysis
    };
  }

  private async generateRoutingDecision(context: CallContext & { analysis: IntentAnalysis }, analysis: IntentAnalysis): Promise<RoutingDecision> {
    // Find the best routing rule match
    const matchingRules = this.findMatchingRules(context, analysis);
    
    if (matchingRules.length === 0) {
      return this.getDefaultRouting(context, analysis);
    }

    // Use AI to select the best option if multiple rules match
    const bestRule = await this.selectBestRoutingRule(matchingRules, context, analysis);
    
    // Check agent availability
    const availableAgents = this.getAvailableAgents(bestRule.destination, analysis.intent);
    
    if (availableAgents.length === 0 && bestRule.action === 'route') {
      return {
        action: 'callback',
        destination: 'callback-system',
        reason: 'All agents busy - offering callback',
        confidence: 0.9,
        estimatedWaitTime: 300,
        alternativeOptions: ['voicemail', 'schedule-callback']
      };
    }

    return {
      action: bestRule.action,
      destination: bestRule.destination,
      reason: bestRule.reason || `Routed based on ${analysis.intent} intent`,
      confidence: analysis.confidence,
      estimatedWaitTime: this.calculateEstimatedWaitTime(bestRule.destination),
      alternativeOptions: this.generateAlternativeOptions(context, analysis)
    };
  }

  private findMatchingRules(context: CallContext, analysis: IntentAnalysis): any[] {
    const matchingRules = [];
    
    for (const [ruleId, rule] of this.routingRules.entries()) {
      if (this.ruleMatches(rule.conditions, context, analysis)) {
        matchingRules.push({ ...rule, id: ruleId });
      }
    }
    
    return matchingRules;
  }

  private ruleMatches(conditions: any, context: CallContext, analysis: IntentAnalysis): boolean {
    // Check VIP status
    if (conditions.isVip !== undefined && conditions.isVip !== context.isVip) {
      return false;
    }
    
    // Check business hours
    if (conditions.businessHours !== undefined && conditions.businessHours !== context.businessHours) {
      return false;
    }
    
    // Check intent
    if (conditions.intent && !conditions.intent.includes(analysis.intent)) {
      return false;
    }
    
    // Check priority
    if (conditions.priority && !conditions.priority.includes(analysis.priority)) {
      return false;
    }
    
    return true;
  }

  private async selectBestRoutingRule(rules: any[], context: CallContext, analysis: IntentAnalysis): Promise<any> {
    if (rules.length === 1) return rules[0];
    
    // Use AI to select the best rule based on context
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a call routing expert. Select the best routing rule based on the caller context and analysis."
          },
          {
            role: "user",
            content: `Context: ${JSON.stringify(context)}
            Analysis: ${JSON.stringify(analysis)}
            Rules: ${JSON.stringify(rules)}
            
            Return the ID of the best rule to use.`
          }
        ],
        max_tokens: 50
      });
      
      const selectedRuleId = response.choices[0].message.content?.trim();
      return rules.find(rule => rule.id === selectedRuleId) || rules[0];
    } catch (error) {
      console.error('Error selecting best routing rule:', error);
      return rules[0];
    }
  }

  private getAvailableAgents(destination: string, intent: string): AgentCapability[] {
    return Array.from(this.agentCapabilities.values()).filter(agent => {
      return agent.availability === 'available' && 
             agent.currentLoad < agent.maxLoad &&
             (agent.agentId === destination || agent.specializations.includes(intent));
    });
  }

  private calculateEstimatedWaitTime(destination: string): number {
    const agent = this.agentCapabilities.get(destination);
    if (!agent) return 0;
    
    const queueDepth = agent.currentLoad;
    const avgHandleTime = agent.averageHandleTime;
    
    return Math.max(0, queueDepth * avgHandleTime / 60); // Convert to seconds
  }

  private generateAlternativeOptions(context: CallContext, analysis: IntentAnalysis): string[] {
    const options = ['voicemail'];
    
    if (context.businessHours) {
      options.push('callback', 'schedule-meeting');
    }
    
    if (analysis.priority === 'low') {
      options.push('self-service', 'faq');
    }
    
    return options;
  }

  private getDefaultRouting(context: CallContext, analysis: IntentAnalysis): RoutingDecision {
    if (!context.businessHours) {
      return {
        action: 'voicemail',
        destination: 'voicemail-system',
        reason: 'After hours - directing to voicemail',
        confidence: 1.0
      };
    }
    
    return {
      action: 'route',
      destination: 'ai-receptionist',
      reason: 'Default routing to AI receptionist',
      confidence: 0.8,
      estimatedWaitTime: 0
    };
  }

  private async sendIntelligentNotifications(context: CallContext & { analysis: IntentAnalysis }, analysis: IntentAnalysis, decision: RoutingDecision): Promise<void> {
    await advancedNotificationEngine.processNotification({
      callId: context.metadata.callId,
      callerNumber: context.callerNumber,
      callerName: context.callerName,
      organizationId: context.organizationId,
      businessHours: context.businessHours,
      callerSentiment: analysis.sentiment,
      callType: 'inbound',
      priority: analysis.priority,
      metadata: {
        intent: analysis.intent,
        confidence: analysis.confidence,
        routingDecision: decision,
        keywords: analysis.keywords
      }
    });
  }

  private async logRoutingDecision(context: CallContext, analysis: IntentAnalysis, decision: RoutingDecision): Promise<void> {
    try {
      await storage.logRoutingDecision({
        callSid: context.callSid,
        callerNumber: context.callerNumber,
        intent: analysis.intent,
        confidence: analysis.confidence,
        sentiment: analysis.sentiment,
        priority: analysis.priority,
        routingAction: decision.action,
        destination: decision.destination,
        reason: decision.reason,
        timestamp: new Date(),
        metadata: {
          keywords: analysis.keywords,
          entities: analysis.entities,
          estimatedWaitTime: decision.estimatedWaitTime
        }
      });
    } catch (error) {
      console.error('Error logging routing decision:', error);
    }
  }

  // Public API methods
  async updateAgentAvailability(agentId: string, availability: 'available' | 'busy' | 'offline'): Promise<void> {
    const agent = this.agentCapabilities.get(agentId);
    if (agent) {
      agent.availability = availability;
      this.agentCapabilities.set(agentId, agent);
    }
  }

  async updateAgentLoad(agentId: string, currentLoad: number): Promise<void> {
    const agent = this.agentCapabilities.get(agentId);
    if (agent) {
      agent.currentLoad = Math.max(0, Math.min(currentLoad, agent.maxLoad));
      this.agentCapabilities.set(agentId, agent);
    }
  }

  getRoutingAnalytics(): any {
    return {
      agentCapabilities: Array.from(this.agentCapabilities.values()),
      routingRules: Array.from(this.routingRules.entries()),
      activeContexts: this.conversationContexts.size
    };
  }
}

export const intelligentCallRouter = new IntelligentCallRouter();