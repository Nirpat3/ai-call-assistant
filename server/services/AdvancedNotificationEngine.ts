import { EventEmitter } from 'events';
import { storage } from '../storage';
import { notificationService } from './NotificationService';
import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface NotificationContext {
  callId?: number;
  callerNumber: string;
  callerName?: string;
  organizationId: string;
  businessHours: boolean;
  callerSentiment: 'positive' | 'neutral' | 'frustrated' | 'urgent';
  callType: 'inbound' | 'outbound' | 'missed' | 'voicemail';
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface SmartNotificationRule {
  id: string;
  name: string;
  conditions: {
    callerType?: 'vip' | 'returning' | 'new' | 'blocked';
    timeRange?: { start: string; end: string };
    sentiment?: ('positive' | 'neutral' | 'frustrated' | 'urgent')[];
    keywords?: string[];
    priority?: ('low' | 'medium' | 'high' | 'critical')[];
  };
  actions: {
    channels: ('sms' | 'email' | 'push' | 'webhook' | 'slack')[];
    recipients: string[];
    template: string;
    delay?: number; // seconds
    escalation?: {
      afterMinutes: number;
      channels: ('sms' | 'email' | 'push' | 'webhook' | 'slack')[];
      recipients: string[];
    };
  };
  active: boolean;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'call' | 'voicemail' | 'system' | 'alert';
  template: string;
  variables: string[];
  aiEnhanced: boolean;
}

export class AdvancedNotificationEngine extends EventEmitter {
  private rules: Map<string, SmartNotificationRule> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private processingQueue: Map<string, NodeJS.Timeout> = new Map();
  private escalationQueue: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.initializeDefaultRules();
    this.initializeDefaultTemplates();
  }

  private initializeDefaultRules() {
    const defaultRules: SmartNotificationRule[] = [
      {
        id: 'vip-immediate',
        name: 'VIP Caller Immediate Alert',
        conditions: {
          callerType: 'vip',
          priority: ['high', 'critical']
        },
        actions: {
          channels: ['sms', 'push', 'slack'],
          recipients: ['admin@company.com', '+1234567890'],
          template: 'vip-call-alert',
          escalation: {
            afterMinutes: 2,
            channels: ['sms', 'email'],
            recipients: ['manager@company.com']
          }
        },
        active: true
      },
      {
        id: 'frustrated-caller',
        name: 'Frustrated Caller Alert',
        conditions: {
          sentiment: ['frustrated', 'urgent'],
          priority: ['medium', 'high', 'critical']
        },
        actions: {
          channels: ['push', 'slack'],
          recipients: ['support@company.com'],
          template: 'frustrated-caller-alert',
          delay: 30
        },
        active: true
      },
      {
        id: 'after-hours-voicemail',
        name: 'After Hours Voicemail',
        conditions: {
          callerType: 'new'
        },
        actions: {
          channels: ['email', 'push'],
          recipients: ['admin@company.com'],
          template: 'after-hours-voicemail',
          delay: 60
        },
        active: true
      }
    ];

    defaultRules.forEach(rule => this.rules.set(rule.id, rule));
  }

  private initializeDefaultTemplates() {
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: 'vip-call-alert',
        name: 'VIP Caller Alert',
        type: 'call',
        template: '🔥 VIP CALL ALERT: {{callerName}} ({{callerNumber}}) is calling. Priority: {{priority}}. Answer immediately!',
        variables: ['callerName', 'callerNumber', 'priority'],
        aiEnhanced: true
      },
      {
        id: 'frustrated-caller-alert',
        name: 'Frustrated Caller Alert',
        type: 'call',
        template: '⚠️ FRUSTRATED CALLER: {{callerName}} seems {{sentiment}}. Call summary: {{aiSummary}}. Please prioritize response.',
        variables: ['callerName', 'sentiment', 'aiSummary'],
        aiEnhanced: true
      },
      {
        id: 'after-hours-voicemail',
        name: 'After Hours Voicemail',
        type: 'voicemail',
        template: '📞 New voicemail from {{callerName}} ({{callerNumber}}) received at {{time}}. AI Summary: {{summary}}',
        variables: ['callerName', 'callerNumber', 'time', 'summary'],
        aiEnhanced: true
      },
      {
        id: 'smart-routing-update',
        name: 'Smart Routing Update',
        type: 'system',
        template: '🤖 AI Agent Update: Call from {{callerNumber}} routed to {{agentType}} with {{confidence}}% confidence. Reason: {{reason}}',
        variables: ['callerNumber', 'agentType', 'confidence', 'reason'],
        aiEnhanced: false
      }
    ];

    defaultTemplates.forEach(template => this.templates.set(template.id, template));
  }

  async processNotification(context: NotificationContext): Promise<void> {
    // Analyze context with AI to determine priority and sentiment
    const enrichedContext = await this.enrichContextWithAI(context);
    
    // Find matching rules
    const matchingRules = this.findMatchingRules(enrichedContext);
    
    // Process each matching rule
    for (const rule of matchingRules) {
      await this.executeNotificationRule(rule, enrichedContext);
    }
  }

  private async enrichContextWithAI(context: NotificationContext): Promise<NotificationContext & { aiInsights: any }> {
    try {
      // Get call history for context
      const callHistory = await storage.getCallsByPhone(context.callerNumber);
      
      // Analyze caller pattern and sentiment
      const analysis = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant analyzing caller context for smart notifications. 
            Analyze the caller's history and current context to determine:
            1. Caller priority (low/medium/high/critical)
            2. Caller sentiment (positive/neutral/frustrated/urgent)
            3. Recommended notification urgency
            4. Brief summary of caller pattern
            
            Respond with JSON: {
              "priority": "...",
              "sentiment": "...",
              "urgency": "...",
              "pattern": "...",
              "recommendedAction": "..."
            }`
          },
          {
            role: "user",
            content: `Analyze caller context:
            Phone: ${context.callerNumber}
            Name: ${context.callerName || 'Unknown'}
            Call Type: ${context.callType}
            Business Hours: ${context.businessHours}
            Previous Calls: ${callHistory.length}
            Recent Call Summary: ${callHistory.slice(0, 3).map(c => 
              `${c.createdAt}: ${c.status} (${c.duration}s)`
            ).join(', ')}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const aiInsights = JSON.parse(analysis.choices[0].message.content || '{}');
      
      return {
        ...context,
        priority: aiInsights.priority || context.priority,
        callerSentiment: aiInsights.sentiment || context.callerSentiment,
        aiInsights
      };
    } catch (error) {
      console.error('Error enriching context with AI:', error);
      return { ...context, aiInsights: {} };
    }
  }

  private findMatchingRules(context: NotificationContext): SmartNotificationRule[] {
    return Array.from(this.rules.values()).filter(rule => {
      if (!rule.active) return false;

      const { conditions } = rule;
      
      // Check priority match
      if (conditions.priority && !conditions.priority.includes(context.priority)) {
        return false;
      }
      
      // Check sentiment match
      if (conditions.sentiment && !conditions.sentiment.includes(context.callerSentiment)) {
        return false;
      }
      
      // Check time range (if specified)
      if (conditions.timeRange) {
        const now = new Date();
        const currentTime = now.getHours() * 100 + now.getMinutes();
        const start = parseInt(conditions.timeRange.start.replace(':', ''));
        const end = parseInt(conditions.timeRange.end.replace(':', ''));
        
        if (currentTime < start || currentTime > end) {
          return false;
        }
      }
      
      return true;
    });
  }

  private async executeNotificationRule(rule: SmartNotificationRule, context: NotificationContext): Promise<void> {
    const template = this.templates.get(rule.actions.template);
    if (!template) {
      console.error(`Template ${rule.actions.template} not found`);
      return;
    }

    // Generate notification content
    let content = await this.generateNotificationContent(template, context);
    
    // Apply delay if specified
    if (rule.actions.delay) {
      setTimeout(() => {
        this.sendNotifications(rule.actions, content, context);
      }, rule.actions.delay * 1000);
    } else {
      await this.sendNotifications(rule.actions, content, context);
    }

    // Set up escalation if configured
    if (rule.actions.escalation) {
      const escalationKey = `${context.callId}-${rule.id}`;
      const escalationTimeout = setTimeout(async () => {
        await this.handleEscalation(rule.actions.escalation!, context, content);
        this.escalationQueue.delete(escalationKey);
      }, rule.actions.escalation.afterMinutes * 60 * 1000);
      
      this.escalationQueue.set(escalationKey, escalationTimeout);
    }
  }

  private async generateNotificationContent(template: NotificationTemplate, context: NotificationContext): Promise<string> {
    let content = template.template;
    
    // Replace basic variables
    const variables = {
      callerName: context.callerName || 'Unknown Caller',
      callerNumber: context.callerNumber,
      priority: context.priority,
      sentiment: context.callerSentiment,
      time: new Date().toLocaleString(),
      callType: context.callType
    };

    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }

    // Enhance with AI if specified
    if (template.aiEnhanced) {
      content = await this.enhanceContentWithAI(content, context);
    }

    return content;
  }

  private async enhanceContentWithAI(content: string, context: NotificationContext): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are enhancing notification messages to be more informative and actionable. 
            Make the message clear, professional, and include relevant context. 
            Keep it concise but informative. Add relevant emojis for visual clarity.`
          },
          {
            role: "user",
            content: `Enhance this notification: "${content}"
            
            Additional context:
            - Business Hours: ${context.businessHours}
            - Call Type: ${context.callType}
            - Priority: ${context.priority}
            - Sentiment: ${context.callerSentiment}`
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      return response.choices[0].message.content || content;
    } catch (error) {
      console.error('Error enhancing content with AI:', error);
      return content;
    }
  }

  private async sendNotifications(actions: SmartNotificationRule['actions'], content: string, context: NotificationContext): Promise<void> {
    const promises = actions.channels.map(async (channel) => {
      for (const recipient of actions.recipients) {
        try {
          switch (channel) {
            case 'sms':
            case 'email':
            case 'webhook':
              await notificationService.createNotification({
                type: channel === 'webhook' ? 'sms' : channel,
                recipient,
                message: content,
                callId: context.callId,
                organizationId: context.organizationId,
                priority: context.priority,
                metadata: context.metadata
              });
              break;
            case 'push':
              await this.sendPushNotification(recipient, content, context);
              break;
            case 'slack':
              await this.sendSlackNotification(recipient, content, context);
              break;
          }
        } catch (error) {
          console.error(`Failed to send ${channel} notification to ${recipient}:`, error);
        }
      }
    });

    await Promise.allSettled(promises);
  }

  private async sendPushNotification(recipient: string, content: string, context: NotificationContext): Promise<void> {
    // Broadcast to WebSocket clients
    notificationService.broadcast({
      type: 'push-notification',
      data: {
        title: `Call Alert - ${context.priority.toUpperCase()}`,
        message: content,
        priority: context.priority,
        callId: context.callId,
        timestamp: new Date().toISOString()
      }
    });
  }

  private async sendSlackNotification(webhook: string, content: string, context: NotificationContext): Promise<void> {
    // Implementation for Slack webhook notifications
    console.log(`Slack notification would be sent to ${webhook}: ${content}`);
  }

  private async handleEscalation(escalation: NonNullable<SmartNotificationRule['actions']['escalation']>, context: NotificationContext, originalContent: string): Promise<void> {
    const escalatedContent = `🚨 ESCALATED: ${originalContent}\n\nOriginal alert was not acknowledged within ${escalation.afterMinutes} minutes.`;
    
    const escalationActions = {
      channels: escalation.channels,
      recipients: escalation.recipients,
      template: 'escalation'
    };

    await this.sendNotifications(escalationActions, escalatedContent, context);
  }

  // Public API methods
  async addRule(rule: SmartNotificationRule): Promise<void> {
    this.rules.set(rule.id, rule);
    await storage.upsertNotificationRule(rule);
  }

  async updateRule(ruleId: string, updates: Partial<SmartNotificationRule>): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (rule) {
      const updatedRule = { ...rule, ...updates };
      this.rules.set(ruleId, updatedRule);
      await storage.upsertNotificationRule(updatedRule);
    }
  }

  async deleteRule(ruleId: string): Promise<void> {
    this.rules.delete(ruleId);
    await storage.deleteNotificationRule(ruleId);
  }

  getRules(): SmartNotificationRule[] {
    return Array.from(this.rules.values());
  }

  getTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  async acknowledgeNotification(notificationId: string): Promise<void> {
    // Cancel any pending escalations for this notification
    for (const [key, timeout] of this.escalationQueue.entries()) {
      if (key.includes(notificationId)) {
        clearTimeout(timeout);
        this.escalationQueue.delete(key);
      }
    }
  }
}

export const advancedNotificationEngine = new AdvancedNotificationEngine();