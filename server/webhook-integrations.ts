import { db } from "./db";
import { supportTickets, ticketActivities } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface WebhookConfig {
  id: string;
  organizationId: string;
  name: string;
  type: 'zendesk' | 'servicenow' | 'jira' | 'custom' | 'slack' | 'teams';
  url: string;
  headers: Record<string, string>;
  authType: 'none' | 'bearer' | 'basic' | 'api_key' | 'oauth';
  authConfig: Record<string, string>;
  events: WebhookEvent[];
  isActive: boolean;
  retryCount: number;
  timeout: number;
  transformTemplate?: string; // JSON template for data transformation
}

export type WebhookEvent = 
  | 'ticket.created'
  | 'ticket.updated' 
  | 'ticket.resolved'
  | 'ticket.escalated'
  | 'ticket.assigned'
  | 'ticket.commented';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  organizationId: string;
  ticket: {
    id: number;
    ticketId: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    assignedTo?: string;
    createdAt: Date;
    updatedAt: Date;
    aiConfidenceScore?: number;
    suggestedSolutions?: any[];
    resolutionTime?: number;
  };
  activity?: {
    type: string;
    performedBy: string;
    notes?: string;
    timestamp: Date;
  };
  metadata: {
    source: 'ai_assistant';
    callSid?: string;
    integrationVersion: string;
  };
}

export class WebhookIntegrationService {
  private webhookConfigs: Map<string, WebhookConfig[]> = new Map();

  constructor() {
    this.initializeDefaultIntegrations();
  }

  private initializeDefaultIntegrations() {
    // Initialize with common third-party integrations
    const defaultConfigs: WebhookConfig[] = [
      {
        id: 'zendesk-default',
        organizationId: 'default-org-id',
        name: 'Zendesk Support',
        type: 'zendesk',
        url: 'https://your-domain.zendesk.com/api/v2/tickets',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        authType: 'basic',
        authConfig: {
          username: 'your-email@company.com/token',
          password: 'your-api-token'
        },
        events: ['ticket.created', 'ticket.updated', 'ticket.resolved'],
        isActive: false, // Disabled by default until configured
        retryCount: 3,
        timeout: 30000,
        transformTemplate: JSON.stringify({
          ticket: {
            subject: '{{ticket.title}}',
            comment: {
              body: '{{ticket.description}}'
            },
            priority: '{{ticket.priority}}',
            type: 'question',
            custom_fields: [
              { id: 'ai_confidence', value: '{{ticket.aiConfidenceScore}}' },
              { id: 'customer_phone', value: '{{ticket.customerPhone}}' },
              { id: 'call_sid', value: '{{metadata.callSid}}' }
            ]
          }
        })
      },
      {
        id: 'servicenow-default',
        organizationId: 'default-org-id',
        name: 'ServiceNow Incident',
        type: 'servicenow',
        url: 'https://your-instance.service-now.com/api/now/table/incident',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        authType: 'basic',
        authConfig: {
          username: 'your-username',
          password: 'your-password'
        },
        events: ['ticket.created', 'ticket.escalated'],
        isActive: false,
        retryCount: 3,
        timeout: 30000,
        transformTemplate: JSON.stringify({
          short_description: '{{ticket.title}}',
          description: '{{ticket.description}}',
          priority: '{{ticket.priority}}',
          caller_id: '{{ticket.customerName}}',
          u_phone_number: '{{ticket.customerPhone}}',
          u_ai_confidence: '{{ticket.aiConfidenceScore}}',
          u_call_reference: '{{metadata.callSid}}'
        })
      },
      {
        id: 'slack-default',
        organizationId: 'default-org-id',
        name: 'Slack Notifications',
        type: 'slack',
        url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
        headers: {
          'Content-Type': 'application/json'
        },
        authType: 'none',
        authConfig: {},
        events: ['ticket.created', 'ticket.escalated'],
        isActive: false,
        retryCount: 2,
        timeout: 15000,
        transformTemplate: JSON.stringify({
          text: '🎫 New Support Ticket: {{ticket.title}}',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*Ticket:* {{ticket.ticketId}}\n*Priority:* {{ticket.priority}}\n*Customer:* {{ticket.customerName}} ({{ticket.customerPhone}})\n*Description:* {{ticket.description}}'
              }
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: 'AI Confidence: {{ticket.aiConfidenceScore}}% | Call ID: {{metadata.callSid}}'
                }
              ]
            }
          ]
        })
      }
    ];

    this.webhookConfigs.set('default-org-id', defaultConfigs);
  }

  /**
   * Register a new webhook configuration
   */
  async registerWebhook(config: Omit<WebhookConfig, 'id'>): Promise<WebhookConfig> {
    const webhookConfig: WebhookConfig = {
      ...config,
      id: `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    const orgConfigs = this.webhookConfigs.get(config.organizationId) || [];
    orgConfigs.push(webhookConfig);
    this.webhookConfigs.set(config.organizationId, orgConfigs);

    console.log(`✅ Registered webhook: ${webhookConfig.name} for ${webhookConfig.organizationId}`);
    return webhookConfig;
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(webhookId: string, updates: Partial<WebhookConfig>): Promise<boolean> {
    for (const [orgId, configs] of this.webhookConfigs.entries()) {
      const configIndex = configs.findIndex(c => c.id === webhookId);
      if (configIndex !== -1) {
        configs[configIndex] = { ...configs[configIndex], ...updates };
        this.webhookConfigs.set(orgId, configs);
        console.log(`✅ Updated webhook: ${webhookId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Send webhook notification for ticket events
   */
  async sendTicketWebhook(
    organizationId: string,
    event: WebhookEvent,
    ticketId: number,
    activityData?: any
  ): Promise<void> {
    const configs = this.webhookConfigs.get(organizationId) || [];
    const activeConfigs = configs.filter(c => c.isActive && c.events.includes(event));

    if (activeConfigs.length === 0) {
      console.log(`No active webhooks for event ${event} in organization ${organizationId}`);
      return;
    }

    // Fetch ticket data
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId));

    if (!ticket) {
      console.error(`Ticket ${ticketId} not found for webhook`);
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      organizationId,
      ticket: {
        id: ticket.id,
        ticketId: ticket.ticketId,
        title: ticket.title,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        customerName: ticket.customerName || undefined,
        customerPhone: ticket.customerPhone || undefined,
        customerEmail: ticket.customerEmail || undefined,
        assignedTo: ticket.assignedTo || undefined,
        createdAt: ticket.createdAt || new Date(),
        updatedAt: ticket.updatedAt || new Date(),
        aiConfidenceScore: ticket.aiConfidenceScore || undefined,
        suggestedSolutions: ticket.suggestedSolutions || undefined,
        resolutionTime: ticket.resolutionTime || undefined
      },
      activity: activityData,
      metadata: {
        source: 'ai_assistant',
        callSid: ticket.callSid || undefined,
        integrationVersion: '1.0.0'
      }
    };

    // Send to all active webhooks
    const webhookPromises = activeConfigs.map(config => 
      this.sendWebhookRequest(config, payload)
    );

    await Promise.allSettled(webhookPromises);
  }

  /**
   * Send HTTP request to webhook endpoint
   */
  private async sendWebhookRequest(config: WebhookConfig, payload: WebhookPayload): Promise<void> {
    const maxRetries = config.retryCount;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const transformedPayload = this.transformPayload(payload, config.transformTemplate);
        const headers = this.buildHeaders(config);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const response = await fetch(config.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(transformedPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log(`✅ Webhook sent successfully: ${config.name} (${config.type})`);
        
        // Log successful webhook delivery
        await this.logWebhookActivity(config.id, payload.event, 'success', {
          statusCode: response.status,
          attempt: attempt + 1
        });

        return;

      } catch (error) {
        attempt++;
        console.error(`❌ Webhook attempt ${attempt} failed for ${config.name}:`, error);

        if (attempt > maxRetries) {
          await this.logWebhookActivity(config.id, payload.event, 'failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            attempts: attempt
          });
          throw error;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Transform payload using template
   */
  private transformPayload(payload: WebhookPayload, template?: string): any {
    if (!template) {
      return payload;
    }

    try {
      let transformedTemplate = template;
      
      // Simple template replacement
      const replacements = this.flattenObject(payload);
      
      for (const [key, value] of Object.entries(replacements)) {
        const placeholder = `{{${key}}}`;
        transformedTemplate = transformedTemplate.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          String(value || '')
        );
      }

      return JSON.parse(transformedTemplate);
    } catch (error) {
      console.error('Template transformation error:', error);
      return payload;
    }
  }

  /**
   * Flatten nested object for template replacement
   */
  private flattenObject(obj: any, prefix = ''): Record<string, any> {
    const flattened: Record<string, any> = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, this.flattenObject(obj[key], newKey));
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }

    return flattened;
  }

  /**
   * Build authentication headers
   */
  private buildHeaders(config: WebhookConfig): Record<string, string> {
    const headers = { ...config.headers };

    switch (config.authType) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${config.authConfig.token}`;
        break;
      case 'basic':
        const credentials = btoa(`${config.authConfig.username}:${config.authConfig.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'api_key':
        headers[config.authConfig.headerName || 'X-API-Key'] = config.authConfig.apiKey;
        break;
    }

    return headers;
  }

  /**
   * Log webhook activity for monitoring
   */
  private async logWebhookActivity(
    webhookId: string,
    event: WebhookEvent,
    status: 'success' | 'failed',
    details: any
  ): Promise<void> {
    // This would typically log to a webhook_logs table
    console.log(`Webhook Activity Log:`, {
      webhookId,
      event,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get webhook configurations for organization
   */
  getWebhookConfigs(organizationId: string): WebhookConfig[] {
    return this.webhookConfigs.get(organizationId) || [];
  }

  /**
   * Test webhook configuration
   */
  async testWebhook(webhookId: string): Promise<{ success: boolean; message: string }> {
    for (const [orgId, configs] of this.webhookConfigs.entries()) {
      const config = configs.find(c => c.id === webhookId);
      if (config) {
        try {
          const testPayload: WebhookPayload = {
            event: 'ticket.created',
            timestamp: new Date().toISOString(),
            organizationId: orgId,
            ticket: {
              id: 0,
              ticketId: 'TEST-WEBHOOK-001',
              title: 'Test Webhook Integration',
              description: 'This is a test ticket to verify webhook integration',
              category: 'test',
              priority: 'low',
              status: 'open',
              customerName: 'Test Customer',
              customerPhone: '+1234567890',
              createdAt: new Date(),
              updatedAt: new Date(),
              aiConfidenceScore: 100
            },
            metadata: {
              source: 'ai_assistant',
              integrationVersion: '1.0.0'
            }
          };

          await this.sendWebhookRequest(config, testPayload);
          return { success: true, message: 'Webhook test successful' };
        } catch (error) {
          return { 
            success: false, 
            message: `Webhook test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
          };
        }
      }
    }
    return { success: false, message: 'Webhook configuration not found' };
  }

  /**
   * Pull status updates from third-party systems
   */
  async pullStatusUpdates(organizationId: string): Promise<void> {
    const configs = this.webhookConfigs.get(organizationId) || [];
    const pullConfigs = configs.filter(c => c.isActive && c.type !== 'slack' && c.type !== 'teams');

    for (const config of pullConfigs) {
      try {
        await this.pullFromThirdParty(config);
      } catch (error) {
        console.error(`Failed to pull updates from ${config.name}:`, error);
      }
    }
  }

  /**
   * Pull updates from specific third-party system
   */
  private async pullFromThirdParty(config: WebhookConfig): Promise<void> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    let pullUrl = '';
    
    switch (config.type) {
      case 'zendesk':
        pullUrl = `${config.url.replace('/tickets', '')}/search.json?query=type:ticket updated>${since.toISOString().split('T')[0]}`;
        break;
      case 'servicenow':
        pullUrl = `${config.url}?sysparm_query=sys_updated_on>${since.toISOString()}`;
        break;
      case 'jira':
        pullUrl = `${config.url.replace('/issue', '')}/search?jql=updated>="${since.toISOString().split('T')[0]}"`;
        break;
      default:
        console.log(`Pull not supported for ${config.type}`);
        return;
    }

    const headers = this.buildHeaders(config);
    headers['Accept'] = 'application/json';

    try {
      const response = await fetch(pullUrl, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      await this.processThirdPartyUpdates(config, data);
      
      console.log(`✅ Pulled updates from ${config.name}`);
    } catch (error) {
      console.error(`❌ Failed to pull from ${config.name}:`, error);
    }
  }

  /**
   * Process updates from third-party systems
   */
  private async processThirdPartyUpdates(config: WebhookConfig, data: any): Promise<void> {
    let tickets: any[] = [];

    switch (config.type) {
      case 'zendesk':
        tickets = data.results || [];
        break;
      case 'servicenow':
        tickets = data.result || [];
        break;
      case 'jira':
        tickets = data.issues || [];
        break;
    }

    for (const thirdPartyTicket of tickets) {
      try {
        await this.syncTicketUpdate(config, thirdPartyTicket);
      } catch (error) {
        console.error(`Failed to sync ticket update:`, error);
      }
    }
  }

  /**
   * Sync individual ticket update from third-party system
   */
  private async syncTicketUpdate(config: WebhookConfig, thirdPartyTicket: any): Promise<void> {
    // Extract ticket identifier that maps to our system
    let externalId = '';
    let status = '';
    let resolution = '';
    let lastUpdated = '';

    switch (config.type) {
      case 'zendesk':
        externalId = thirdPartyTicket.id?.toString();
        status = this.mapZendeskStatus(thirdPartyTicket.status);
        resolution = thirdPartyTicket.resolution?.name || '';
        lastUpdated = thirdPartyTicket.updated_at;
        break;
      case 'servicenow':
        externalId = thirdPartyTicket.number;
        status = this.mapServiceNowStatus(thirdPartyTicket.state);
        resolution = thirdPartyTicket.close_notes || '';
        lastUpdated = thirdPartyTicket.sys_updated_on;
        break;
      case 'jira':
        externalId = thirdPartyTicket.key;
        status = this.mapJiraStatus(thirdPartyTicket.fields?.status?.name);
        resolution = thirdPartyTicket.fields?.resolution?.description || '';
        lastUpdated = thirdPartyTicket.fields?.updated;
        break;
    }

    if (!externalId) return;

    // Find matching ticket in our system
    const [localTicket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.externalId, externalId));

    if (localTicket) {
      // Update local ticket with third-party status
      await db
        .update(supportTickets)
        .set({
          status,
          resolution: resolution || localTicket.resolution,
          updatedAt: new Date(lastUpdated),
          syncedAt: new Date()
        })
        .where(eq(supportTickets.id, localTicket.id));

      // Log sync activity
      await db.insert(ticketActivities).values({
        ticketId: localTicket.id,
        type: 'status_sync',
        performedBy: `${config.type}_sync`,
        notes: `Status synced from ${config.name}: ${status}`,
        metadata: { externalId, thirdPartySystem: config.type }
      });

      console.log(`✅ Synced ticket ${localTicket.ticketId} with ${config.name}`);
    }
  }

  /**
   * Map status from different third-party systems to our standard format
   */
  private mapZendeskStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'new': 'open',
      'open': 'open',
      'pending': 'in_progress',
      'hold': 'on_hold',
      'solved': 'resolved',
      'closed': 'closed'
    };
    return statusMap[status?.toLowerCase()] || 'open';
  }

  private mapServiceNowStatus(state: string): string {
    const stateMap: Record<string, string> = {
      '1': 'open',        // New
      '2': 'in_progress', // In Progress
      '3': 'on_hold',     // On Hold
      '6': 'resolved',    // Resolved
      '7': 'closed',      // Closed
      '8': 'closed'       // Canceled
    };
    return stateMap[state] || 'open';
  }

  private mapJiraStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'to do': 'open',
      'open': 'open',
      'in progress': 'in_progress',
      'on hold': 'on_hold',
      'done': 'resolved',
      'closed': 'closed',
      'resolved': 'resolved'
    };
    return statusMap[status?.toLowerCase()] || 'open';
  }

  /**
   * Schedule periodic status pulls
   */
  startStatusPullScheduler(): void {
    // Pull status updates every 15 minutes
    setInterval(async () => {
      console.log('🔄 Starting scheduled status pull...');
      
      for (const [orgId] of this.webhookConfigs.entries()) {
        try {
          await this.pullStatusUpdates(orgId);
        } catch (error) {
          console.error(`Status pull failed for ${orgId}:`, error);
        }
      }
    }, 15 * 60 * 1000); // 15 minutes

    console.log('✅ Status pull scheduler started (15-minute intervals)');
  }

  /**
   * Manual sync for specific ticket
   */
  async syncSpecificTicket(ticketId: number): Promise<{ success: boolean; message: string }> {
    try {
      const [ticket] = await db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.id, ticketId));

      if (!ticket || !ticket.externalId) {
        return { success: false, message: 'Ticket not found or no external ID' };
      }

      const configs = this.webhookConfigs.get(ticket.organizationId) || [];
      const activeConfigs = configs.filter(c => c.isActive && c.type !== 'slack' && c.type !== 'teams');

      for (const config of activeConfigs) {
        try {
          await this.pullSpecificTicketUpdate(config, ticket.externalId);
        } catch (error) {
          console.error(`Failed to sync from ${config.name}:`, error);
        }
      }

      return { success: true, message: 'Ticket sync completed' };
    } catch (error) {
      return { 
        success: false, 
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Pull specific ticket update from third-party system
   */
  private async pullSpecificTicketUpdate(config: WebhookConfig, externalId: string): Promise<void> {
    let pullUrl = '';
    
    switch (config.type) {
      case 'zendesk':
        pullUrl = `${config.url}/${externalId}.json`;
        break;
      case 'servicenow':
        pullUrl = `${config.url}?sysparm_query=number=${externalId}`;
        break;
      case 'jira':
        pullUrl = `${config.url}/${externalId}`;
        break;
      default:
        return;
    }

    const headers = this.buildHeaders(config);
    headers['Accept'] = 'application/json';

    const response = await fetch(pullUrl, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    let ticket;
    switch (config.type) {
      case 'zendesk':
        ticket = data.ticket;
        break;
      case 'servicenow':
        ticket = data.result?.[0];
        break;
      case 'jira':
        ticket = data;
        break;
    }

    if (ticket) {
      await this.syncTicketUpdate(config, ticket);
    }
  }
}

export const webhookIntegrationService = new WebhookIntegrationService();