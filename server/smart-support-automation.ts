import OpenAI from "openai";
import { storage } from "./storage";
import { humanConversationEngine } from "./human-conversation-engine";
import { knowledgeKeywordMapper } from "./knowledge-keyword-mapper";
import { ticketManagementService } from "./ticket-management";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface SupportWorkflowContext {
  callSid: string;
  callerNumber: string;
  callerName?: string;
  issueCategory: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attemptedSolutions: string[];
  conversationHistory: any[];
  escalationLevel: number;
  timeSpentResolving: number;
  customerSatisfaction?: number;
  knowledgeBaseResults: any[];
}

interface AutomationRule {
  id: string;
  name: string;
  trigger: {
    type: 'intent' | 'keyword' | 'escalation' | 'time_limit' | 'satisfaction';
    condition: string;
    value: any;
  };
  actions: AutomationAction[];
  enabled: boolean;
}

interface AutomationAction {
  type: 'search_knowledge' | 'generate_response' | 'escalate_human' | 'send_notification' | 'create_ticket' | 'follow_up';
  parameters: Record<string, any>;
  priority: number;
}

export class SmartSupportAutomation {
  private workflowContexts: Map<string, SupportWorkflowContext> = new Map();
  private automationRules: AutomationRule[] = [];

  constructor() {
    this.initializeDefaultRules();
    this.initializeKeywordMappings();
  }

  private async initializeKeywordMappings() {
    try {
      // Update keyword mappings from knowledge base on startup
      await knowledgeKeywordMapper.updateKeywordMappingsFromKnowledgeBase();
      console.log('✅ Keyword mappings initialized from knowledge base');
    } catch (error) {
      console.error('Error initializing keyword mappings:', error);
    }
  }

  private initializeDefaultRules() {
    this.automationRules = [
      {
        id: 'technical_support_flow',
        name: 'Technical Support Workflow',
        trigger: {
          type: 'intent',
          condition: 'contains',
          value: ['technical', 'support', 'error', 'problem', 'bug', 'not working', 'connecting', 'connection', 'pax', 'terminal', 'payment', 'machine', 'device', 'connectivity', 'network']
        },
        actions: [
          {
            type: 'search_knowledge',
            parameters: { categories: ['technical', 'troubleshooting'], limit: 5 },
            priority: 1
          },
          {
            type: 'generate_response',
            parameters: { tone: 'helpful', include_steps: true },
            priority: 2
          }
        ],
        enabled: true
      },
      {
        id: 'escalation_trigger',
        name: 'Auto-Escalation When AI Cannot Resolve',
        trigger: {
          type: 'escalation',
          condition: 'attempts_exceeded',
          value: 3
        },
        actions: [
          {
            type: 'escalate_human',
            parameters: { department: 'technical_support', priority: 'medium' },
            priority: 1
          },
          {
            type: 'send_notification',
            parameters: { 
              recipient: 'support_manager',
              message: 'AI escalation: Customer needs human assistance'
            },
            priority: 2
          }
        ],
        enabled: true
      },
      {
        id: 'urgent_issue_escalation',
        name: 'Immediate Escalation for Urgent Issues',
        trigger: {
          type: 'keyword',
          condition: 'contains',
          value: ['urgent', 'emergency', 'down', 'critical', 'outage']
        },
        actions: [
          {
            type: 'escalate_human',
            parameters: { department: 'technical_support', priority: 'urgent' },
            priority: 1
          },
          {
            type: 'create_ticket',
            parameters: { priority: 'urgent', auto_assign: true },
            priority: 2
          }
        ],
        enabled: true
      }
    ];
  }

  async processIncomingSupportCall(input: {
    callSid: string;
    callerNumber: string;
    userMessage: string;
    callerName?: string;
  }): Promise<{
    response: string;
    actions: string[];
    shouldEscalate: boolean;
    escalationReason?: string;
    nextSteps: string[];
  }> {
    
    const { callSid, callerNumber, userMessage, callerName } = input;
    
    // Initialize or get existing workflow context
    let context = this.workflowContexts.get(callSid);
    if (!context) {
      context = await this.initializeWorkflowContext(callSid, callerNumber, callerName);
    }

    // Analyze the user message for intent and priority
    const analysis = await this.analyzeIssue(userMessage, context);
    context.issueCategory = analysis.category;
    context.priority = analysis.priority;

    // Execute automation workflow
    const workflowResult = await this.executeAutomationWorkflow(userMessage, context);
    
    // Update context
    context.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });

    this.workflowContexts.set(callSid, context);

    return workflowResult;
  }

  private async initializeWorkflowContext(
    callSid: string, 
    callerNumber: string, 
    callerName?: string
  ): Promise<SupportWorkflowContext> {
    return {
      callSid,
      callerNumber,
      callerName,
      issueCategory: 'general',
      priority: 'medium',
      attemptedSolutions: [],
      conversationHistory: [],
      escalationLevel: 0,
      timeSpentResolving: 0,
      knowledgeBaseResults: []
    };
  }

  private async analyzeIssue(userMessage: string, context: SupportWorkflowContext): Promise<{
    category: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    keywords: string[];
    complexity: number;
  }> {
    
    const analysisPrompt = `Analyze this customer support message and categorize it:

Customer Message: "${userMessage}"
Previous Context: ${context.conversationHistory.length > 0 ? 'Ongoing conversation' : 'New issue'}

Provide analysis in this format:
Category: [technical|billing|account|general|product]
Priority: [low|medium|high|urgent]  
Keywords: [comma-separated key terms]
Complexity: [1-10 scale where 10 is most complex]

Analysis:`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing customer support requests. Be precise and accurate in categorization."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      const analysis = response.choices[0].message.content || "";
      
      // Parse the analysis (simple implementation)
      const category = this.extractValue(analysis, 'Category:', 'general');
      const priority = this.extractValue(analysis, 'Priority:', 'medium') as any;
      const keywords = this.extractValue(analysis, 'Keywords:', '').split(',').map(k => k.trim());
      const complexity = parseInt(this.extractValue(analysis, 'Complexity:', '5'));

      return { category, priority, keywords, complexity };

    } catch (error) {
      console.error("Error analyzing issue:", error);
      return {
        category: 'general',
        priority: 'medium',
        keywords: [],
        complexity: 5
      };
    }
  }

  private async executeAutomationWorkflow(
    userMessage: string, 
    context: SupportWorkflowContext
  ): Promise<{
    response: string;
    actions: string[];
    shouldEscalate: boolean;
    escalationReason?: string;
    nextSteps: string[];
  }> {
    
    const actions: string[] = [];
    let shouldEscalate = false;
    let escalationReason = '';
    const nextSteps: string[] = [];

    // Use intelligent keyword mapping to analyze message
    const keywordAnalysis = await knowledgeKeywordMapper.analyzeUserMessage(userMessage);
    console.log(`\n=== Enhanced Keyword Analysis ===`);
    console.log(`Detected keywords: ${keywordAnalysis.detectedKeywords.map(k => k.keyword).join(', ')}`);
    console.log(`Suggested categories: ${keywordAnalysis.suggestedCategories.join(', ')}`);
    console.log(`Confidence score: ${keywordAnalysis.confidence}%`);
    console.log(`Recommended documents: ${keywordAnalysis.recommendedDocuments.length}`);

    // Enhanced rule matching using keyword analysis
    const matchingRules = this.findMatchingRulesWithKeywordAnalysis(userMessage, context, keywordAnalysis);
    
    let response = "";

    // If keyword analysis found high-confidence documents, prioritize them
    if (keywordAnalysis.confidence > 70 && keywordAnalysis.recommendedDocuments.length > 0) {
      console.log('Using high-confidence keyword analysis results');
      context.knowledgeBaseResults = keywordAnalysis.recommendedDocuments;
      actions.push('Enhanced: keyword_analysis');
    }

    for (const rule of matchingRules) {
      console.log(`Executing automation rule: ${rule.name}`);
      
      for (const action of rule.actions.sort((a, b) => a.priority - b.priority)) {
        const actionResult = await this.executeAction(action, userMessage, context);
        
        actions.push(`Executed: ${action.type}`);
        
        if (action.type === 'search_knowledge') {
          context.knowledgeBaseResults = actionResult.data || [];
        }
        
        if (action.type === 'generate_response') {
          response = actionResult.response || response;
        }
        
        if (action.type === 'escalate_human') {
          shouldEscalate = true;
          escalationReason = actionResult.reason || 'Automated escalation triggered';
          nextSteps.push('Transfer to human support representative');
        }
      }
    }

    // If no response generated, create default response
    if (!response) {
      response = await this.generateDefaultSupportResponse(userMessage, context);
    }

    // Check for escalation conditions
    const escalationCheck = this.checkEscalationConditions(context);
    if (escalationCheck.shouldEscalate) {
      shouldEscalate = true;
      escalationReason = escalationCheck.reason;
    }

    return {
      response,
      actions,
      shouldEscalate,
      escalationReason: shouldEscalate ? escalationReason : undefined,
      nextSteps
    };
  }

  private findMatchingRules(userMessage: string, context: SupportWorkflowContext): AutomationRule[] {
    console.log(`\n=== Finding matching rules for message: "${userMessage}" ===`);
    console.log(`Total available rules: ${this.automationRules.length}`);
    
    return this.automationRules.filter(rule => {
      console.log(`\nChecking rule: ${rule.name}`);
      console.log(`Rule enabled: ${rule.enabled}`);
      
      if (!rule.enabled) return false;

      const { trigger } = rule;
      const lowerMessage = userMessage.toLowerCase();
      console.log(`Trigger type: ${trigger.type}, condition: ${trigger.condition}`);
      console.log(`Trigger keywords: ${JSON.stringify(trigger.value)}`);

      switch (trigger.type) {
        case 'intent':
        case 'keyword':
          if (trigger.condition === 'contains') {
            const matches = trigger.value.some((keyword: string) => {
              const match = lowerMessage.includes(keyword.toLowerCase());
              console.log(`  - Checking "${keyword}" against "${lowerMessage}": ${match}`);
              return match;
            });
            console.log(`Rule "${rule.name}" matches: ${matches}`);
            return matches;
          }
          break;
        
        case 'escalation':
          if (trigger.condition === 'attempts_exceeded') {
            return context.escalationLevel >= trigger.value;
          }
          break;
        
        case 'time_limit':
          return context.timeSpentResolving >= trigger.value;
      }

      return false;
    });
  }

  private findMatchingRulesWithKeywordAnalysis(
    userMessage: string, 
    context: SupportWorkflowContext, 
    keywordAnalysis: any
  ): AutomationRule[] {
    const matchingRules: AutomationRule[] = [];
    
    // First try original rule matching
    const originalMatches = this.findMatchingRules(userMessage, context);
    matchingRules.push(...originalMatches);

    // Enhanced matching based on keyword analysis
    for (const rule of this.automationRules) {
      if (!rule.enabled || matchingRules.includes(rule)) continue;

      // Match based on detected categories
      if (rule.trigger.type === 'intent' || rule.trigger.type === 'keyword') {
        for (const detectedKeyword of keywordAnalysis.detectedKeywords) {
          // Check if rule keywords match detected keyword categories
          const ruleKeywords = Array.isArray(rule.trigger.value) ? rule.trigger.value : [rule.trigger.value];
          
          if (ruleKeywords.some((keyword: string) => 
            detectedKeyword.category.includes(keyword.toLowerCase()) ||
            detectedKeyword.relatedTerms.includes(keyword.toLowerCase())
          )) {
            console.log(`Enhanced match: Rule "${rule.name}" matched via category "${detectedKeyword.category}"`);
            matchingRules.push(rule);
            break;
          }
        }
      }
    }

    return matchingRules;
  }

  private async executeAction(
    action: AutomationAction, 
    userMessage: string, 
    context: SupportWorkflowContext
  ): Promise<any> {
    
    switch (action.type) {
      case 'search_knowledge':
        return await this.searchKnowledgeBase(userMessage, action.parameters);
      
      case 'generate_response':
        return await this.generateIntelligentResponse(userMessage, context, action.parameters);
      
      case 'escalate_human':
        return await this.initiateHumanEscalation(context, action.parameters);
      
      case 'send_notification':
        return await this.sendNotification(context, action.parameters);
      
      case 'create_ticket':
        return await this.createSupportTicket(context, action.parameters);
      
      default:
        console.log(`Unknown action type: ${action.type}`);
        return {};
    }
  }

  private async searchKnowledgeBase(query: string, parameters: any): Promise<any> {
    try {
      // Search your knowledge base
      const knowledgeResults = await storage.searchKnowledgeBase(query, parameters.limit || 5);
      
      return {
        success: true,
        data: knowledgeResults,
        count: knowledgeResults.length
      };
    } catch (error) {
      console.error("Knowledge base search error:", error);
      return {
        success: false,
        data: [],
        count: 0
      };
    }
  }

  private async generateIntelligentResponse(
    userMessage: string, 
    context: SupportWorkflowContext, 
    parameters: any
  ): Promise<any> {
    
    const knowledgeContext = context.knowledgeBaseResults
      .map(kb => `- ${kb.title}: ${kb.content}`)
      .join('\n');

    const supportPrompt = `You are a helpful customer support AI assistant. Generate a natural, human-like response to help resolve this customer's issue.

Customer Message: "${userMessage}"
Issue Category: ${context.issueCategory}
Priority: ${context.priority}

Available Knowledge Base Information:
${knowledgeContext || 'No specific knowledge base results found.'}

Previous Attempted Solutions: ${context.attemptedSolutions.join(', ') || 'None'}

Guidelines:
- Be conversational and empathetic
- Provide step-by-step solutions when applicable
- If you can't resolve the issue completely, acknowledge limitations
- Use natural language, not robotic responses
- Include confidence level in your ability to help

Response:`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert customer support assistant. Be helpful, empathetic, and solution-focused while maintaining a natural conversational tone."
          },
          {
            role: "user",
            content: supportPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      const generatedResponse = response.choices[0].message.content || "";
      
      return {
        response: generatedResponse,
        confidence: this.calculateResponseConfidence(generatedResponse, context)
      };

    } catch (error) {
      console.error("Error generating intelligent response:", error);
      return {
        response: "I understand you're having an issue. Let me connect you with a human support representative who can provide more detailed assistance.",
        confidence: 0.3
      };
    }
  }

  private async initiateHumanEscalation(context: SupportWorkflowContext, parameters: any): Promise<any> {
    // This would integrate with your support ticket system or call routing
    console.log(`Escalating call ${context.callSid} to human support: ${parameters.department}`);
    
    context.escalationLevel++;
    
    return {
      escalated: true,
      department: parameters.department,
      priority: parameters.priority,
      reason: `AI unable to resolve ${context.issueCategory} issue after ${context.escalationLevel} attempts`
    };
  }

  private async sendNotification(context: SupportWorkflowContext, parameters: any): Promise<any> {
    // Integrate with notification system (Slack, email, etc.)
    console.log(`Sending notification: ${parameters.message}`);
    
    return {
      sent: true,
      recipient: parameters.recipient,
      message: parameters.message
    };
  }

  private async createSupportTicket(context: SupportWorkflowContext, parameters: any): Promise<any> {
    try {
      const ticketData = {
        organizationId: 'default-org-id', // Should come from context
        callSid: context.callSid,
        title: `Support Request: ${context.issueCategory}`,
        description: context.conversationHistory.map(h => `${h.speaker}: ${h.content}`).join('\n'),
        category: context.issueCategory || 'general',
        priority: parameters.priority || context.priority || 'medium',
        customerName: context.callerName,
        customerPhone: context.callerNumber,
        aiAssigned: true,
      };
      
      // Create ticket using the ticket management service
      const ticket = await ticketManagementService.createTicket(ticketData);
      
      console.log(`✅ Support ticket created: ${ticket.ticketId}`);
      
      // Store ticket reference in context
      context.ticketId = ticket.id;
      
      return {
        ticketId: ticket.ticketId,
        created: true,
        priority: ticket.priority,
        aiConfidence: ticket.aiConfidenceScore,
        suggestedSolutions: ticket.suggestedSolutions
      };
    } catch (error) {
      console.error("Error creating support ticket:", error);
      return {
        created: false,
        error: 'Failed to create ticket'
      };
    }
  }

  private checkEscalationConditions(context: SupportWorkflowContext): {
    shouldEscalate: boolean;
    reason: string;
  } {
    // Check various escalation conditions
    if (context.escalationLevel >= 3) {
      return {
        shouldEscalate: true,
        reason: "Maximum AI resolution attempts reached"
      };
    }
    
    if (context.priority === 'urgent') {
      return {
        shouldEscalate: true,
        reason: "Urgent priority issue requires human attention"
      };
    }
    
    if (context.timeSpentResolving > 600) { // 10 minutes
      return {
        shouldEscalate: true,
        reason: "Time limit exceeded for AI resolution"
      };
    }
    
    return {
      shouldEscalate: false,
      reason: ""
    };
  }

  private async generateDefaultSupportResponse(userMessage: string, context: SupportWorkflowContext): Promise<string> {
    return `I understand you're reaching out about ${context.issueCategory}. Let me help you with that. Can you provide a bit more detail about what specifically you're experiencing?`;
  }

  private calculateResponseConfidence(response: string, context: SupportWorkflowContext): number {
    // Simple confidence calculation based on knowledge base results and response length
    let confidence = 0.5;
    
    if (context.knowledgeBaseResults.length > 0) {
      confidence += 0.3;
    }
    
    if (response.length > 100) {
      confidence += 0.1;
    }
    
    if (response.includes('step') || response.includes('try') || response.includes('solution')) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  private extractValue(text: string, key: string, defaultValue: string): string {
    const regex = new RegExp(`${key}\\s*([^\\n]+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : defaultValue;
  }

  // Public methods for configuration
  addAutomationRule(rule: AutomationRule): void {
    this.automationRules.push(rule);
  }

  updateAutomationRule(id: string, updates: Partial<AutomationRule>): boolean {
    const index = this.automationRules.findIndex(rule => rule.id === id);
    if (index !== -1) {
      this.automationRules[index] = { ...this.automationRules[index], ...updates };
      return true;
    }
    return false;
  }

  getAutomationRules(): AutomationRule[] {
    return this.automationRules;
  }

  getWorkflowMetrics(callSid: string): SupportWorkflowContext | undefined {
    return this.workflowContexts.get(callSid);
  }
}

export const smartSupportAutomation = new SmartSupportAutomation();