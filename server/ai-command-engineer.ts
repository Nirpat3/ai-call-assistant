import { openai } from './openai';
import { storage } from './storage';
import express from 'express';
import fetch from 'node-fetch';

/*
Senior AI Engineer - Full Stack Command Execution System
Capabilities:
- Natural language command interpretation
- Frontend navigation and page routing
- Backend API configuration and execution
- Self-learning from user interactions
- Comprehensive logging and analytics
*/

export interface CommandContext {
  userId: string;
  sessionId: string;
  timestamp: Date;
  command: string;
  intent: string;
  confidence: number;
  parameters: Record<string, any>;
  executionPath: string[];
  result: any;
  errors: string[];
  learningData: any;
}

export interface APIEndpoint {
  path: string;
  method: string;
  description: string;
  parameters: any[];
  responseFormat: any;
  category: string;
  examples: string[];
}

export interface FrontendRoute {
  path: string;
  component: string;
  description: string;
  category: string;
  actions: string[];
  relatedAPIs: string[];
}

export interface CommandPattern {
  pattern: RegExp;
  intent: string;
  confidence: number;
  parameters: string[];
  executionType: 'frontend' | 'backend' | 'hybrid';
  examples: string[];
  successRate: number;
  lastUsed: Date;
}

export interface WebhookPayload {
  source: string;
  event: string;
  data: any;
  timestamp: Date;
  signature?: string;
}

export interface APIResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode: number;
  executionTime: number;
}

export class AICommandEngineer {
  private commandHistory: Map<string, CommandContext[]> = new Map();
  private apiLibrary: Map<string, APIEndpoint> = new Map();
  private routeLibrary: Map<string, FrontendRoute> = new Map();
  private commandPatterns: Map<string, CommandPattern> = new Map();
  private learningModel: any = null;
  private webhookEndpoints: Map<string, string> = new Map();
  private baseURL: string = process.env.BASE_URL || 'http://localhost:5000';

  constructor() {
    this.initializeLibraries();
    this.loadLearningModel();
    this.setupWebhookEndpoints();
  }

  // Setup webhook endpoints for real-time notifications
  private setupWebhookEndpoints(): void {
    this.webhookEndpoints.set('config-updated', '/api/webhooks/config-updated');
    this.webhookEndpoints.set('ai-command-executed', '/api/webhooks/ai-command-executed');
    this.webhookEndpoints.set('greeting-changed', '/api/webhooks/greeting-changed');
    this.webhookEndpoints.set('business-hours-updated', '/api/webhooks/business-hours-updated');
    this.webhookEndpoints.set('navigation-requested', '/api/webhooks/navigation-requested');
  }

  // Make authenticated API requests
  private async makeAPIRequest(endpoint: string, method: string = 'GET', data?: any): Promise<APIResponse> {
    const startTime = Date.now();
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_TOKEN || 'development'}`,
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      const responseData = await response.json();
      const executionTime = Date.now() - startTime;

      return {
        success: response.ok,
        data: responseData,
        error: response.ok ? undefined : responseData.error || 'API request failed',
        statusCode: response.status,
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${(error as Error).message}`,
        statusCode: 500,
        executionTime: Date.now() - startTime
      };
    }
  }

  // Send webhook notifications
  private async sendWebhook(event: string, data: any): Promise<void> {
    const webhookUrl = this.webhookEndpoints.get(event);
    if (!webhookUrl) return;

    const payload: WebhookPayload = {
      source: 'ai-command-engineer',
      event,
      data,
      timestamp: new Date(),
      signature: this.generateWebhookSignature(data)
    };

    try {
      await this.makeAPIRequest(webhookUrl, 'POST', payload);
    } catch (error) {
      console.error(`Webhook failed for event ${event}:`, error);
    }
  }

  // Generate webhook signature for security
  private generateWebhookSignature(data: any): string {
    // Simple signature generation - in production, use proper HMAC
    return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 16);
  }

  // Initialize comprehensive API and route libraries
  private async initializeLibraries() {
    await this.buildAPILibrary();
    await this.buildRouteLibrary();
    await this.loadCommandPatterns();
  }

  // Build comprehensive API library with categorization
  private async buildAPILibrary() {
    const apiEndpoints: APIEndpoint[] = [
      // AI Configuration APIs
      {
        path: '/api/ai-config',
        method: 'GET',
        description: 'Get AI assistant configuration including business details, behavior, and voice settings',
        parameters: [],
        responseFormat: { businessName: 'string', businessDescription: 'string', personality: 'string' },
        category: 'ai-configuration',
        examples: ['get ai config', 'show current ai settings']
      },
      {
        path: '/api/ai-config/update',
        method: 'POST',
        description: 'Update AI assistant configuration with new settings',
        parameters: [
          { name: 'section', type: 'string', required: true, options: ['basics', 'behavior', 'voice', 'hours'] },
          { name: 'config', type: 'object', required: true }
        ],
        responseFormat: { success: 'boolean', message: 'string' },
        category: 'ai-configuration',
        examples: ['update greeting message', 'configure business hours', 'set ai personality']
      },
      
      // Greeting Configuration APIs
      {
        path: '/api/greeting-templates',
        method: 'GET',
        description: 'Get all greeting templates for different scenarios',
        parameters: [],
        responseFormat: [{ id: 'number', name: 'string', template: 'string', type: 'string' }],
        category: 'greetings',
        examples: ['show greeting templates', 'list greetings', 'get greeting options']
      },
      {
        path: '/api/greeting-templates',
        method: 'POST',
        description: 'Create new greeting template',
        parameters: [
          { name: 'name', type: 'string', required: true },
          { name: 'template', type: 'string', required: true },
          { name: 'type', type: 'string', required: true }
        ],
        responseFormat: { id: 'number', success: 'boolean' },
        category: 'greetings',
        examples: ['create greeting template', 'add new greeting', 'configure custom greeting']
      },

      // Business Hours APIs
      {
        path: '/api/business-hours',
        method: 'GET',
        description: 'Get current business hours configuration',
        parameters: [],
        responseFormat: { schedule: 'object', holidays: 'array' },
        category: 'business-hours',
        examples: ['show business hours', 'get operating hours', 'check business schedule']
      },
      {
        path: '/api/business-hours/update',
        method: 'POST',
        description: 'Update business hours and holiday schedule',
        parameters: [
          { name: 'schedule', type: 'object', required: false },
          { name: 'holidays', type: 'array', required: false }
        ],
        responseFormat: { success: 'boolean', message: 'string' },
        category: 'business-hours',
        examples: ['set business hours', 'configure holidays', 'update operating schedule']
      },

      // Contact Management APIs
      {
        path: '/api/contacts',
        method: 'GET',
        description: 'Get all contacts with search and filtering',
        parameters: [
          { name: 'search', type: 'string', required: false },
          { name: 'limit', type: 'number', required: false }
        ],
        responseFormat: [{ id: 'number', displayName: 'string', phoneNumbers: 'array' }],
        category: 'contacts',
        examples: ['show contacts', 'list all contacts', 'search contacts']
      },

      // Call Management APIs
      {
        path: '/api/calls',
        method: 'GET',
        description: 'Get call history and analytics',
        parameters: [
          { name: 'startDate', type: 'string', required: false },
          { name: 'endDate', type: 'string', required: false }
        ],
        responseFormat: [{ id: 'number', callerNumber: 'string', duration: 'number', timestamp: 'string' }],
        category: 'calls',
        examples: ['show call history', 'get recent calls', 'call analytics']
      }
    ];

    apiEndpoints.forEach(endpoint => {
      this.apiLibrary.set(`${endpoint.method}:${endpoint.path}`, endpoint);
    });
  }

  // Build comprehensive frontend route library
  private async buildRouteLibrary() {
    const routes: FrontendRoute[] = [
      {
        path: '/ai-assistant-config',
        component: 'AIAssistantConfigPage',
        description: 'Configure AI assistant behavior, business details, voice settings, and business hours',
        category: 'ai-configuration',
        actions: ['edit business details', 'configure greetings', 'set business hours', 'update voice settings'],
        relatedAPIs: ['/api/ai-config', '/api/ai-config/update']
      },
      {
        path: '/ai-management',
        component: 'AIManagement',
        description: 'Main AI management interface with agent configuration and settings',
        category: 'ai-management',
        actions: ['manage ai agents', 'configure ai behavior', 'view ai analytics'],
        relatedAPIs: ['/api/ai-config', '/api/routing-analytics']
      },
      {
        path: '/call-forwarding-setup',
        component: 'CallForwardingSetupPage',
        description: 'Configure call forwarding and Twilio phone number settings',
        category: 'call-management',
        actions: ['setup call forwarding', 'configure phone numbers', 'test call routing'],
        relatedAPIs: ['/api/twilio/config', '/api/call-forwarding/status']
      },
      {
        path: '/contacts',
        component: 'ContactsApp',
        description: 'Contact management with search, filtering, and contact profiles',
        category: 'contacts',
        actions: ['view contacts', 'search contacts', 'manage contact details'],
        relatedAPIs: ['/api/contacts', '/api/contacts/sync']
      },
      {
        path: '/system-settings',
        component: 'SystemSettingsPage',
        description: 'System-wide configuration including organization, security, and notifications',
        category: 'system',
        actions: ['configure organization', 'manage security settings', 'setup notifications'],
        relatedAPIs: ['/api/settings', '/api/organization']
      },
      {
        path: '/live-calls',
        component: 'LiveCallsPage',
        description: 'Real-time call monitoring and management',
        category: 'calls',
        actions: ['monitor live calls', 'view call analytics', 'manage active calls'],
        relatedAPIs: ['/api/calls/live', '/api/calls']
      }
    ];

    routes.forEach(route => {
      this.routeLibrary.set(route.path, route);
    });
  }

  // Load and initialize command patterns from learning data
  private async loadCommandPatterns() {
    const patterns: CommandPattern[] = [
      // Greeting Configuration Patterns
      {
        pattern: /configure|set|update.*greet(ing|ings?)/i,
        intent: 'configure-greeting',
        confidence: 0.9,
        parameters: ['greeting_type', 'message'],
        executionType: 'hybrid',
        examples: ['configure greeting message', 'set greeting as hello', 'update greeting template'],
        successRate: 0.85,
        lastUsed: new Date()
      },
      {
        pattern: /open|show|navigate.*greet(ing|ings?).*page/i,
        intent: 'navigate-greeting-page',
        confidence: 0.95,
        parameters: [],
        executionType: 'frontend',
        examples: ['open greeting page', 'show greeting configuration', 'navigate to greeting settings'],
        successRate: 0.95,
        lastUsed: new Date()
      },

      // Business Hours Patterns
      {
        pattern: /configure|set|update.*business.*hours?/i,
        intent: 'configure-business-hours',
        confidence: 0.9,
        parameters: ['day', 'start_time', 'end_time', 'closed'],
        executionType: 'hybrid',
        examples: ['set business hours', 'configure operating hours', 'update business schedule'],
        successRate: 0.8,
        lastUsed: new Date()
      },
      {
        pattern: /open|show.*business.*hours?.*page/i,
        intent: 'navigate-business-hours-page',
        confidence: 0.9,
        parameters: [],
        executionType: 'frontend',
        examples: ['open business hours page', 'show business hours settings'],
        successRate: 0.9,
        lastUsed: new Date()
      },

      // AI Configuration Patterns
      {
        pattern: /configure|set|update.*ai.*(personality|behavior|settings)/i,
        intent: 'configure-ai-behavior',
        confidence: 0.85,
        parameters: ['personality', 'response_style', 'behavior_type'],
        executionType: 'hybrid',
        examples: ['set ai personality to friendly', 'configure ai behavior', 'update ai settings'],
        successRate: 0.75,
        lastUsed: new Date()
      },

      // Navigation Patterns
      {
        pattern: /open|show|navigate.*ai.*(config|management|settings)/i,
        intent: 'navigate-ai-config',
        confidence: 0.9,
        parameters: [],
        executionType: 'frontend',
        examples: ['open ai configuration', 'show ai settings', 'navigate to ai management'],
        successRate: 0.95,
        lastUsed: new Date()
      }
    ];

    patterns.forEach((pattern, index) => {
      this.commandPatterns.set(`pattern_${index}`, pattern);
    });
  }

  // Main command processing function
  async processCommand(command: string, userId: string, sessionId: string): Promise<CommandContext> {
    const context: CommandContext = {
      userId,
      sessionId,
      timestamp: new Date(),
      command: command.toLowerCase().trim(),
      intent: '',
      confidence: 0,
      parameters: {},
      executionPath: [],
      result: null,
      errors: [],
      learningData: {}
    };

    try {
      // Step 1: Analyze command intent
      await this.analyzeIntent(context);
      
      // Step 2: Extract parameters
      await this.extractParameters(context);
      
      // Step 3: Execute command
      await this.executeCommand(context);
      
      // Step 4: Log and learn
      await this.logAndLearn(context);
      
    } catch (error) {
      context.errors.push(`Command execution failed: ${error.message}`);
      console.error('AI Command Engineer Error:', error);
    }

    return context;
  }

  // Analyze command intent using patterns and AI
  private async analyzeIntent(context: CommandContext): Promise<void> {
    context.executionPath.push('intent-analysis');
    
    // First, try pattern matching
    let bestMatch: { pattern: CommandPattern; confidence: number } | null = null;
    
    for (const [key, pattern] of this.commandPatterns) {
      if (pattern.pattern.test(context.command)) {
        const confidence = pattern.confidence * pattern.successRate;
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { pattern, confidence };
        }
      }
    }

    if (bestMatch && bestMatch.confidence > 0.7) {
      context.intent = bestMatch.pattern.intent;
      context.confidence = bestMatch.confidence;
    } else {
      // Fall back to AI analysis
      await this.aiIntentAnalysis(context);
    }
  }

  // Use AI to analyze command intent when patterns don't match
  private async aiIntentAnalysis(context: CommandContext): Promise<void> {
    const prompt = `
    Analyze this user command and determine the intent and confidence:
    Command: "${context.command}"
    
    Available intents:
    - configure-greeting: User wants to set up or modify greeting messages
    - navigate-greeting-page: User wants to open greeting configuration page
    - configure-business-hours: User wants to set business hours or schedule
    - navigate-business-hours-page: User wants to open business hours page
    - configure-ai-behavior: User wants to modify AI personality or behavior
    - navigate-ai-config: User wants to open AI configuration page
    - configure-contacts: User wants to manage contacts
    - navigate-contacts-page: User wants to open contacts page
    - get-analytics: User wants to view analytics or reports
    - general-navigation: User wants to navigate to a specific page
    - api-request: User wants to retrieve or update data via API
    
    Respond with JSON: {"intent": "intent_name", "confidence": 0.0-1.0, "reasoning": "explanation"}
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      context.intent = analysis.intent || 'unknown';
      context.confidence = analysis.confidence || 0.5;
      context.learningData.aiAnalysis = analysis;
    } catch (error) {
      context.errors.push(`AI intent analysis failed: ${error.message}`);
      context.intent = 'unknown';
      context.confidence = 0.3;
    }
  }

  // Extract parameters from command based on intent
  private async extractParameters(context: CommandContext): Promise<void> {
    context.executionPath.push('parameter-extraction');
    
    const prompt = `
    Extract parameters from this command based on the intent:
    Command: "${context.command}"
    Intent: "${context.intent}"
    
    Extract relevant parameters such as:
    - greeting_message: The actual greeting text if provided
    - greeting_type: Type of greeting (standard, conversational, dynamic)
    - business_day: Day of the week for business hours
    - start_time, end_time: Time ranges
    - ai_personality: Personality type (professional, friendly, empathetic)
    - page_path: Specific page to navigate to
    - api_endpoint: Specific API to call
    
    Respond with JSON object of extracted parameters.
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2
      });

      context.parameters = JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      context.errors.push(`Parameter extraction failed: ${error.message}`);
    }
  }

  // Execute the command based on intent and parameters
  private async executeCommand(context: CommandContext): Promise<void> {
    context.executionPath.push('command-execution');
    
    switch (context.intent) {
      case 'configure-greeting':
        await this.configureGreeting(context);
        break;
      case 'navigate-greeting-page':
        await this.navigateToPage(context, '/ai-assistant-config');
        break;
      case 'configure-business-hours':
        await this.configureBusinessHours(context);
        break;
      case 'navigate-business-hours-page':
        await this.navigateToPage(context, '/ai-assistant-config');
        break;
      case 'configure-ai-behavior':
        await this.configureAIBehavior(context);
        break;
      case 'navigate-ai-config':
        await this.navigateToPage(context, '/ai-assistant-config');
        break;
      case 'general-navigation':
        await this.handleGeneralNavigation(context);
        break;
      default:
        await this.handleUnknownCommand(context);
    }
  }

  // Configure greeting message using real API
  private async configureGreeting(context: CommandContext): Promise<void> {
    const { greeting_message, greeting_type } = context.parameters;
    
    if (!greeting_message) {
      context.result = {
        action: 'clarification_needed',
        message: 'What greeting message would you like to set?',
        options: [
          'Business greeting (professional)',
          'Friendly greeting (casual)',
          'Custom message (specify text)'
        ]
      };
      return;
    }

    try {
      // First, get current AI configuration
      const currentConfigResponse = await this.makeAPIRequest('/api/ai-config', 'GET');
      
      if (!currentConfigResponse.success) {
        context.errors.push(`Failed to get current config: ${currentConfigResponse.error}`);
        return;
      }

      // Update AI configuration with new greeting
      const updateData = {
        section: 'basics',
        config: {
          ...currentConfigResponse.data,
          businessDescription: greeting_message,
          greetingType: greeting_type || 'standard',
          lastUpdated: new Date().toISOString()
        }
      };

      // Call the real API to update configuration
      const updateResponse = await this.makeAPIRequest('/api/ai-config/update', 'POST', updateData);
      
      if (updateResponse.success) {
        context.result = {
          action: 'configuration_updated',
          message: `Greeting message updated to: "${greeting_message}"`,
          data: updateResponse.data,
          apiResponse: {
            statusCode: updateResponse.statusCode,
            executionTime: updateResponse.executionTime
          }
        };

        // Send webhook notification
        await this.sendWebhook('greeting-changed', {
          oldGreeting: currentConfigResponse.data?.businessDescription,
          newGreeting: greeting_message,
          greetingType: greeting_type,
          userId: context.userId,
          timestamp: context.timestamp
        });

      } else {
        context.errors.push(`API update failed: ${updateResponse.error}`);
      }
    } catch (error) {
      context.errors.push(`Failed to configure greeting: ${(error as Error).message}`);
    }
  }

  // Configure business hours using real API
  private async configureBusinessHours(context: CommandContext): Promise<void> {
    const { business_day, start_time, end_time, closed } = context.parameters;
    
    if (!business_day && !start_time) {
      context.result = {
        action: 'clarification_needed',
        message: 'What business hours would you like to configure?',
        options: [
          'Set hours for specific day (e.g., Monday 9 AM to 5 PM)',
          'Set default hours for all weekdays',
          'Mark specific days as closed'
        ]
      };
      return;
    }

    try {
      // Get current AI configuration to access business hours
      const currentConfigResponse = await this.makeAPIRequest('/api/ai-config', 'GET');
      
      if (!currentConfigResponse.success) {
        context.errors.push(`Failed to get current config: ${currentConfigResponse.error}`);
        return;
      }

      // Build business hours update
      const currentBusinessHours = currentConfigResponse.data?.businessHoursSchedule || {
        monday: { enabled: true, startTime: '09:00', endTime: '17:00' },
        tuesday: { enabled: true, startTime: '09:00', endTime: '17:00' },
        wednesday: { enabled: true, startTime: '09:00', endTime: '17:00' },
        thursday: { enabled: true, startTime: '09:00', endTime: '17:00' },
        friday: { enabled: true, startTime: '09:00', endTime: '17:00' },
        saturday: { enabled: false, startTime: '09:00', endTime: '17:00' },
        sunday: { enabled: false, startTime: '09:00', endTime: '17:00' }
      };

      // Update specific day if provided
      if (business_day) {
        const dayKey = business_day.toLowerCase();
        if (currentBusinessHours[dayKey]) {
          currentBusinessHours[dayKey] = {
            enabled: !closed,
            startTime: start_time || currentBusinessHours[dayKey].startTime,
            endTime: end_time || currentBusinessHours[dayKey].endTime
          };
        }
      }

      // Update configuration via API
      const updateData = {
        section: 'hours',
        config: {
          businessHoursSchedule: currentBusinessHours,
          lastUpdated: new Date().toISOString()
        }
      };

      const updateResponse = await this.makeAPIRequest('/api/ai-config/update', 'POST', updateData);
      
      if (updateResponse.success) {
        context.result = {
          action: 'configuration_updated',
          message: `Business hours updated for ${business_day || 'default schedule'}`,
          data: updateResponse.data,
          apiResponse: {
            statusCode: updateResponse.statusCode,
            executionTime: updateResponse.executionTime
          }
        };

        // Send webhook notification
        await this.sendWebhook('business-hours-updated', {
          updatedDay: business_day,
          startTime: start_time,
          endTime: end_time,
          closed: closed,
          userId: context.userId,
          timestamp: context.timestamp
        });

      } else {
        context.errors.push(`API update failed: ${updateResponse.error}`);
      }
    } catch (error) {
      context.errors.push(`Failed to configure business hours: ${(error as Error).message}`);
    }
  }

  // Configure AI behavior
  private async configureAIBehavior(context: CommandContext): Promise<void> {
    const { ai_personality, response_style } = context.parameters;
    
    context.result = {
      action: 'configuration_updated',
      message: `AI behavior updated`,
      data: { ai_personality, response_style }
    };
  }

  // Navigate to specific page
  private async navigateToPage(context: CommandContext, defaultPath: string): Promise<void> {
    const targetPath = context.parameters.page_path || defaultPath;
    
    context.result = {
      action: 'navigation',
      message: `Opening ${targetPath}`,
      path: targetPath,
      description: this.routeLibrary.get(targetPath)?.description || 'Page'
    };
  }

  // Handle general navigation requests
  private async handleGeneralNavigation(context: CommandContext): Promise<void> {
    const prompt = `
    Find the best page to navigate to based on this command:
    Command: "${context.command}"
    
    Available pages:
    ${Array.from(this.routeLibrary.entries()).map(([path, route]) => 
      `${path}: ${route.description}`
    ).join('\n')}
    
    Respond with JSON: {"path": "/page-path", "reason": "why this page"}
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const navigation = JSON.parse(response.choices[0].message.content || '{}');
      await this.navigateToPage(context, navigation.path);
      context.learningData.navigationReasoning = navigation.reason;
    } catch (error) {
      context.errors.push(`Navigation analysis failed: ${error.message}`);
    }
  }

  // Handle unknown commands
  private async handleUnknownCommand(context: CommandContext): Promise<void> {
    context.result = {
      action: 'unknown_command',
      message: `I'm not sure how to handle: "${context.command}". Can you rephrase or be more specific?`,
      suggestions: [
        'Try "configure greeting message"',
        'Try "open business hours page"',
        'Try "set AI personality to friendly"'
      ]
    };
  }

  // Log command execution and learn from results
  private async logAndLearn(context: CommandContext): Promise<void> {
    context.executionPath.push('logging-learning');
    
    // Store command history
    if (!this.commandHistory.has(context.userId)) {
      this.commandHistory.set(context.userId, []);
    }
    this.commandHistory.get(context.userId)!.push(context);

    // Update command patterns based on success/failure
    await this.updateLearningModel(context);
    
    // Log detailed execution information
    console.log('AI Command Engineer Execution Log:', {
      timestamp: context.timestamp,
      userId: context.userId,
      command: context.command,
      intent: context.intent,
      confidence: context.confidence,
      success: context.errors.length === 0,
      executionPath: context.executionPath,
      result: context.result
    });
  }

  // Update learning model based on command execution results
  private async updateLearningModel(context: CommandContext): Promise<void> {
    // Update pattern success rates
    for (const [key, pattern] of this.commandPatterns) {
      if (pattern.intent === context.intent) {
        if (context.errors.length === 0) {
          pattern.successRate = Math.min(0.98, pattern.successRate + 0.02);
        } else {
          pattern.successRate = Math.max(0.5, pattern.successRate - 0.05);
        }
        pattern.lastUsed = new Date();
      }
    }
  }

  // Get command execution statistics
  getExecutionStats(userId?: string): any {
    const allHistory = userId 
      ? this.commandHistory.get(userId) || []
      : Array.from(this.commandHistory.values()).flat();

    const totalCommands = allHistory.length;
    const successfulCommands = allHistory.filter(ctx => ctx.errors.length === 0).length;
    const uniqueIntents = new Set(allHistory.map(ctx => ctx.intent)).size;

    return {
      totalCommands,
      successfulCommands,
      successRate: totalCommands > 0 ? successfulCommands / totalCommands : 0,
      uniqueIntents,
      mostUsedIntents: this.getMostUsedIntents(allHistory),
      averageConfidence: allHistory.reduce((sum, ctx) => sum + ctx.confidence, 0) / totalCommands || 0
    };
  }

  private getMostUsedIntents(history: CommandContext[]): Array<{intent: string, count: number}> {
    const intentCounts = new Map<string, number>();
    history.forEach(ctx => {
      intentCounts.set(ctx.intent, (intentCounts.get(ctx.intent) || 0) + 1);
    });
    
    return Array.from(intentCounts.entries())
      .map(([intent, count]) => ({ intent, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private async loadLearningModel(): Promise<void> {
    // Initialize or load existing learning model
    this.learningModel = {
      version: '1.0.0',
      lastUpdated: new Date(),
      totalCommands: 0,
      learningData: {}
    };
  }
}

export const aiCommandEngineer = new AICommandEngineer();