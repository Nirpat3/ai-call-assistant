import { openai } from './openai';
import { storage } from './storage';
import { humanGreetingSystem } from './human-greetings';
import { CallFlowConfig, GreetingTemplate, CallFlowStep, IntentPattern } from '../shared/schema';

export interface CallContext {
  callSid: string;
  callerNumber: string;
  callerName?: string;
  isVip: boolean;
  isReturningCaller: boolean;
  callHistory: any[];
  businessHours: boolean;
  currentStep: string;
  conversationTurns: number;
  unrecognizedInputs: number;
  collectedData: Record<string, any>;
  intent?: string;
  confidence?: number;
}

export interface FlowResponse {
  twiml: string;
  nextStep?: string;
  shouldEnd: boolean;
  transferTo?: string;
  captureVoicemail: boolean;
}

export class AdvancedCallFlowService {
  private activeFlows: Map<string, CallContext> = new Map();

  async processIncomingCall(
    callSid: string, 
    callerNumber: string, 
    callStatus: string
  ): Promise<FlowResponse> {
    // Get active call flow configuration
    const flowConfig = await this.getActiveFlowConfig();
    if (!flowConfig) {
      return this.generateFallbackResponse();
    }

    // Initialize or get existing call context
    let context = this.activeFlows.get(callSid);
    if (!context) {
      context = await this.initializeCallContext(callSid, callerNumber);
      this.activeFlows.set(callSid, context);
    }

    // Process based on current step
    return await this.executeFlowStep(context, flowConfig);
  }

  async processUserInput(
    callSid: string, 
    speechResult?: string, 
    digits?: string
  ): Promise<FlowResponse> {
    const context = this.activeFlows.get(callSid);
    if (!context) {
      return this.generateFallbackResponse();
    }

    const flowConfig = await this.getActiveFlowConfig();
    if (!flowConfig) {
      return this.generateFallbackResponse();
    }

    // Analyze user input
    if (speechResult) {
      await this.analyzeUserSpeech(context, speechResult, flowConfig);
    }

    if (digits) {
      await this.processDigitInput(context, digits, flowConfig);
    }

    context.conversationTurns++;

    // Check if we should transfer based on intent
    if (context.intent && this.shouldTransferForIntent(context.intent, flowConfig)) {
      return await this.generateTransferResponse(context, flowConfig);
    }

    // Check voicemail threshold
    if (context.unrecognizedInputs >= flowConfig.voicemailThreshold) {
      return await this.generateVoicemailResponse(context, flowConfig);
    }

    // Continue with next step
    return await this.executeFlowStep(context, flowConfig);
  }

  private async initializeCallContext(
    callSid: string, 
    callerNumber: string
  ): Promise<CallContext> {
    // Get caller information
    const contact = await storage.getContactByPhone(callerNumber);
    const callHistory = await storage.getCallsByPhone(callerNumber);
    const businessHours = await this.checkBusinessHours();

    return {
      callSid,
      callerNumber,
      callerName: contact?.firstName || undefined,
      isVip: contact?.isVip || false,
      isReturningCaller: callHistory.length > 0,
      callHistory,
      businessHours,
      currentStep: 'greeting',
      conversationTurns: 0,
      unrecognizedInputs: 0,
      collectedData: {},
    };
  }

  private async executeFlowStep(
    context: CallContext, 
    flowConfig: CallFlowConfig
  ): Promise<FlowResponse> {
    switch (context.currentStep) {
      case 'greeting':
        return await this.handleGreetingStep(context, flowConfig);
      case 'route_presentation':
        return await this.handleRoutePresentationStep(context, flowConfig);
      case 'speech_analysis':
        return await this.handleSpeechAnalysisStep(context, flowConfig);
      case 'follow_up':
        return await this.handleFollowUpStep(context, flowConfig);
      case 'collect_info':
        return await this.handleCollectInfoStep(context, flowConfig);
      case 'transfer':
        return await this.generateTransferResponse(context, flowConfig);
      case 'voicemail':
        return await this.generateVoicemailResponse(context, flowConfig);
      default:
        return this.generateFallbackResponse();
    }
  }

  private async handleGreetingStep(
    context: CallContext, 
    flowConfig: CallFlowConfig
  ): Promise<FlowResponse> {
    let greeting: string;

    if (flowConfig.greetingType === 'dynamic' && flowConfig.enableAdvancedGreeting) {
      // Use dynamic greeting system
      const greetingContext = await humanGreetingSystem.analyzeCallerContext(
        context.callerNumber, 
        context.callHistory
      );
      const dynamicGreeting = await humanGreetingSystem.generateDynamicGreeting(greetingContext);
      greeting = `${dynamicGreeting.greeting} ${dynamicGreeting.followUp}`;
    } else if (flowConfig.greetingType === 'conversational') {
      // Use conversational greeting
      greeting = await this.generateConversationalGreeting(context, flowConfig);
    } else {
      // Use standard greeting
      greeting = flowConfig.standardGreeting || "Hello! Thank you for calling.";
      
      // Add personalization if enabled
      if (flowConfig.greetingPersonalization.useCallerName && context.callerName) {
        greeting = `Hello ${context.callerName}! Thank you for calling.`;
      }
    }

    // Determine next step based on route presentation setting
    let nextStep: string;
    let delay = 0;

    if (flowConfig.routePresentation === 'during_greeting') {
      greeting += this.generateRouteOptions(flowConfig);
      nextStep = 'speech_analysis';
    } else if (flowConfig.routePresentation === 'after_greeting') {
      nextStep = 'route_presentation';
      delay = flowConfig.routePresentationDelay;
    } else {
      nextStep = 'speech_analysis';
    }

    context.currentStep = nextStep;

    const twiml = this.generateTwiMLWithGather(greeting, {
      timeout: 5,
      input: flowConfig.speechAnalysisEnabled ? 'speech dtmf' : 'dtmf',
      speechTimeout: 'auto',
      action: '/api/twilio/gather',
      method: 'POST'
    });

    return {
      twiml,
      nextStep,
      shouldEnd: false,
      captureVoicemail: false
    };
  }

  private async handleRoutePresentationStep(
    context: CallContext, 
    flowConfig: CallFlowConfig
  ): Promise<FlowResponse> {
    const routeOptions = this.generateRouteOptions(flowConfig);
    context.currentStep = 'speech_analysis';

    const twiml = this.generateTwiMLWithGather(routeOptions, {
      timeout: 5,
      input: flowConfig.speechAnalysisEnabled ? 'speech dtmf' : 'dtmf',
      speechTimeout: 'auto',
      action: '/api/twilio/gather',
      method: 'POST'
    });

    return {
      twiml,
      nextStep: 'speech_analysis',
      shouldEnd: false,
      captureVoicemail: false
    };
  }

  private async handleSpeechAnalysisStep(
    context: CallContext, 
    flowConfig: CallFlowConfig
  ): Promise<FlowResponse> {
    // If no intent recognized and follow-up questions enabled
    if (!context.intent && flowConfig.followUpQuestions.enabled) {
      context.currentStep = 'follow_up';
      return await this.handleFollowUpStep(context, flowConfig);
    }

    // If intent recognized, proceed to transfer or continue conversation
    if (context.intent) {
      return await this.generateTransferResponse(context, flowConfig);
    }

    // If unavailable mode is enabled
    if (flowConfig.unavailableMode.enabled && !context.businessHours) {
      return await this.generateUnavailableResponse(context, flowConfig);
    }

    // Continue with follow-up questions
    context.currentStep = 'follow_up';
    return await this.handleFollowUpStep(context, flowConfig);
  }

  private async handleFollowUpStep(
    context: CallContext, 
    flowConfig: CallFlowConfig
  ): Promise<FlowResponse> {
    const followUpConfig = flowConfig.followUpQuestions;
    
    // Check if we've asked too many questions
    if (context.conversationTurns >= followUpConfig.maxQuestions) {
      context.currentStep = 'voicemail';
      return await this.generateVoicemailResponse(context, flowConfig);
    }

    let question: string;

    // Ask for name if not collected
    if (followUpConfig.askName && !context.callerName && !context.collectedData.name) {
      question = "I'd be happy to help you. May I get your name first?";
      context.currentStep = 'collect_info';
      context.collectedData.collecting = 'name';
    }
    // Ask for purpose if name is collected
    else if (followUpConfig.askPurpose && !context.collectedData.purpose) {
      const nameGreeting = context.callerName || context.collectedData.name || '';
      question = `Thank you${nameGreeting ? `, ${nameGreeting}` : ''}. What can I help you with today?`;
      context.currentStep = 'collect_info';
      context.collectedData.collecting = 'purpose';
    }
    // Default follow-up
    else {
      question = "I want to make sure you're connected to the right person. Could you tell me a bit more about what you're looking for?";
      context.currentStep = 'speech_analysis';
    }

    const twiml = this.generateTwiMLWithGather(question, {
      timeout: 5,
      input: 'speech',
      speechTimeout: 'auto',
      action: '/api/twilio/gather',
      method: 'POST'
    });

    return {
      twiml,
      nextStep: context.currentStep,
      shouldEnd: false,
      captureVoicemail: false
    };
  }

  private async handleCollectInfoStep(
    context: CallContext, 
    flowConfig: CallFlowConfig
  ): Promise<FlowResponse> {
    // This step processes collected information and moves to next appropriate step
    context.currentStep = 'follow_up';
    return await this.handleFollowUpStep(context, flowConfig);
  }

  private async analyzeUserSpeech(
    context: CallContext, 
    speechResult: string, 
    flowConfig: CallFlowConfig
  ): Promise<void> {
    try {
      // Collect information if in collect_info step
      if (context.currentStep === 'collect_info') {
        const collecting = context.collectedData.collecting;
        if (collecting === 'name') {
          // Extract name from speech
          const nameMatch = speechResult.match(/(?:my name is |i'm |i am |this is |call me )([a-zA-Z\s]+)/i);
          context.collectedData.name = nameMatch ? nameMatch[1].trim() : speechResult.trim();
          if (!context.callerName) {
            context.callerName = context.collectedData.name;
          }
        } else if (collecting === 'purpose') {
          context.collectedData.purpose = speechResult;
        }
        context.collectedData.collecting = null;
      }

      // Analyze intent using configured patterns
      const intent = await this.recognizeIntent(speechResult, flowConfig);
      if (intent) {
        context.intent = intent.intent;
        context.confidence = parseFloat(intent.confidence.toString());
      } else {
        context.unrecognizedInputs++;
      }

      // Store conversation turn
      if (!context.collectedData.conversation) {
        context.collectedData.conversation = [];
      }
      context.collectedData.conversation.push({
        speaker: 'caller',
        message: speechResult,
        timestamp: new Date().toISOString(),
        intent: context.intent,
        confidence: context.confidence
      });

    } catch (error) {
      console.error('Error analyzing user speech:', error);
      context.unrecognizedInputs++;
    }
  }

  private async processDigitInput(
    context: CallContext, 
    digits: string, 
    flowConfig: CallFlowConfig
  ): Promise<void> {
    // Map digits to intents based on standard phone tree
    const digitIntentMap: Record<string, string> = {
      '1': 'sales',
      '2': 'support',
      '3': 'general',
      '9': 'voicemail'
    };

    const intent = digitIntentMap[digits];
    if (intent) {
      context.intent = intent;
      context.confidence = 1.0;
    }
  }

  private async recognizeIntent(
    speechResult: string, 
    flowConfig: CallFlowConfig
  ): Promise<IntentPattern | null> {
    const intentConfig = flowConfig.intentRecognition;
    const speechLower = speechResult.toLowerCase();

    // Check sales keywords
    for (const keyword of intentConfig.salesKeywords) {
      if (speechLower.includes(keyword.toLowerCase())) {
        return {
          id: 0,
          intent: 'sales',
          patterns: intentConfig.salesKeywords,
          confidence: '0.85',
          action: 'transfer',
          actionConfig: {},
          isActive: true,
          createdAt: new Date()
        };
      }
    }

    // Check support keywords
    for (const keyword of intentConfig.supportKeywords) {
      if (speechLower.includes(keyword.toLowerCase())) {
        return {
          id: 0,
          intent: 'support',
          patterns: intentConfig.supportKeywords,
          confidence: '0.85',
          action: 'transfer',
          actionConfig: {},
          isActive: true,
          createdAt: new Date()
        };
      }
    }

    // Check custom intents
    for (const customIntent of intentConfig.customIntents) {
      for (const pattern of customIntent.patterns || []) {
        if (speechLower.includes(pattern.toLowerCase())) {
          return {
            id: 0,
            intent: customIntent.intent,
            patterns: customIntent.patterns,
            confidence: customIntent.confidence || '0.80',
            action: customIntent.action,
            actionConfig: customIntent.actionConfig || {},
            isActive: true,
            createdAt: new Date()
          };
        }
      }
    }

    return null;
  }

  private shouldTransferForIntent(intent: string, flowConfig: CallFlowConfig): boolean {
    const transferIntents = ['sales', 'support'];
    return transferIntents.includes(intent);
  }

  private async generateTransferResponse(
    context: CallContext, 
    flowConfig: CallFlowConfig
  ): Promise<FlowResponse> {
    const transferSettings = flowConfig.transferSettings;
    let transferTo: string;
    let message = transferSettings.transferMessage;

    switch (context.intent) {
      case 'sales':
        transferTo = transferSettings.salesNumber;
        message = `${context.callerName ? `Thank you ${context.callerName}. ` : ''}Let me connect you with our sales team.`;
        break;
      case 'support':
        transferTo = transferSettings.supportNumber;
        message = `${context.callerName ? `Thank you ${context.callerName}. ` : ''}I'll transfer you to our support team right away.`;
        break;
      default:
        transferTo = transferSettings.defaultNumber;
        break;
    }

    const twiml = `
      <Response>
        <Say voice="alice">${message}</Say>
        <Dial timeout="30">${transferTo}</Dial>
        <Say voice="alice">I'm sorry, but no one is available right now. Please leave a message after the tone.</Say>
        <Record action="/api/twilio/recording" method="POST" maxLength="120" transcribe="true"/>
      </Response>
    `;

    return {
      twiml,
      shouldEnd: true,
      transferTo,
      captureVoicemail: false
    };
  }

  private async generateVoicemailResponse(
    context: CallContext, 
    flowConfig: CallFlowConfig
  ): Promise<FlowResponse> {
    const message = context.callerName 
      ? `Thank you ${context.callerName}. Please leave your message after the tone and we'll get back to you as soon as possible.`
      : "Please leave your message after the tone and we'll get back to you as soon as possible.";

    const twiml = `
      <Response>
        <Say voice="alice">${message}</Say>
        <Record action="/api/twilio/recording" method="POST" maxLength="${flowConfig.unavailableMode.maxMessageLength || 120}" transcribe="true"/>
        <Say voice="alice">Thank you for your message. Goodbye!</Say>
      </Response>
    `;

    return {
      twiml,
      shouldEnd: true,
      captureVoicemail: true
    };
  }

  private async generateUnavailableResponse(
    context: CallContext, 
    flowConfig: CallFlowConfig
  ): Promise<FlowResponse> {
    const unavailableConfig = flowConfig.unavailableMode;
    let message = unavailableConfig.message;

    if (context.callerName) {
      message = `Hello ${context.callerName}. ${message}`;
    }

    if (unavailableConfig.captureMessage) {
      const twiml = `
        <Response>
          <Say voice="alice">${message}</Say>
          <Record action="/api/twilio/recording" method="POST" maxLength="${unavailableConfig.maxMessageLength}" transcribe="true"/>
          <Say voice="alice">Thank you for your message. Goodbye!</Say>
        </Response>
      `;

      return {
        twiml,
        shouldEnd: true,
        captureVoicemail: true
      };
    } else {
      const twiml = `
        <Response>
          <Say voice="alice">${message} Please call back during business hours. Goodbye!</Say>
        </Response>
      `;

      return {
        twiml,
        shouldEnd: true,
        captureVoicemail: false
      };
    }
  }

  private generateRouteOptions(flowConfig: CallFlowConfig): string {
    return " For sales, press 1 or say 'sales'. For support, press 2 or say 'support'. For general inquiries, press 3 or just tell me how I can help you.";
  }

  private generateTwiMLWithGather(message: string, gatherOptions: any): string {
    return `
      <Response>
        <Gather timeout="${gatherOptions.timeout}" input="${gatherOptions.input}" 
                speechTimeout="${gatherOptions.speechTimeout}" 
                action="${gatherOptions.action}" method="${gatherOptions.method}">
          <Say voice="alice">${message}</Say>
        </Gather>
        <Say voice="alice">I didn't catch that. Let me transfer you to someone who can help.</Say>
        <Dial>+1234567892</Dial>
      </Response>
    `;
  }

  private generateFallbackResponse(): FlowResponse {
    const twiml = `
      <Response>
        <Say voice="alice">Thank you for calling. Please hold while I connect you.</Say>
        <Dial>+1234567892</Dial>
        <Say voice="alice">Please leave a message after the tone.</Say>
        <Record action="/api/twilio/recording" method="POST" maxLength="120" transcribe="true"/>
      </Response>
    `;

    return {
      twiml,
      shouldEnd: true,
      captureVoicemail: true
    };
  }

  private async generateConversationalGreeting(
    context: CallContext, 
    flowConfig: CallFlowConfig
  ): Promise<string> {
    try {
      const prompt = `Generate a natural, conversational greeting for a phone call with these details:
      - Caller name: ${context.callerName || 'Unknown'}
      - Is VIP: ${context.isVip}
      - Is returning caller: ${context.isReturningCaller}
      - Business hours: ${context.businessHours}
      - Time: ${new Date().toLocaleString()}
      
      Make it sound natural and human-like, around 20-30 words.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 100
      });

      return response.choices[0].message.content || flowConfig.standardGreeting;
    } catch (error) {
      console.error('Error generating conversational greeting:', error);
      return flowConfig.standardGreeting || "Hello! Thank you for calling.";
    }
  }

  private async getActiveFlowConfig(): Promise<CallFlowConfig | null> {
    try {
      // For now, get the first active config - in production you'd have logic to select the right one
      const configs = await storage.getCallFlowConfigs?.() || [];
      return configs.find(config => config.isActive) || null;
    } catch (error) {
      console.error('Error getting flow config:', error);
      return null;
    }
  }

  private async checkBusinessHours(): Promise<boolean> {
    try {
      const aiConfig = await storage.getAiConfig();
      if (aiConfig?.isAlwaysOpen) return true;

      const now = new Date();
      const day = now.toLocaleLowerCase('en-US', { weekday: 'long' });
      const time = now.toTimeString().slice(0, 5);
      
      const businessHours = aiConfig?.businessHours as any;
      const dayConfig = businessHours?.[day];
      
      if (!dayConfig?.enabled) return false;
      
      return time >= dayConfig.open && time <= dayConfig.close;
    } catch (error) {
      console.error('Error checking business hours:', error);
      return true; // Default to open if unable to check
    }
  }

  endCall(callSid: string): void {
    this.activeFlows.delete(callSid);
  }

  getCallContext(callSid: string): CallContext | undefined {
    return this.activeFlows.get(callSid);
  }
}

export const advancedCallFlowService = new AdvancedCallFlowService();