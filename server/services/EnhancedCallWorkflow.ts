import { storage } from '../storage';

export interface CallWorkflowResult {
  action: 'passthrough' | 'ai_greeting' | 'phone_tree' | 'route' | 'voicemail' | 'block';
  destination?: string;
  greeting?: string;
  phoneTreeOptions?: any[];
  reason: string;
}

export class EnhancedCallWorkflow {
  async processIncomingCall(callerNumber: string): Promise<CallWorkflowResult> {
    // Step 1: Check if caller is in contacts and has pass-through configured
    const contact = await this.checkContactPassthrough(callerNumber);
    if (contact) {
      return contact;
    }

    // Step 2: Check business hours
    const businessHoursCheck = await this.checkBusinessHours();
    if (!businessHoursCheck.isOpen) {
      return {
        action: 'voicemail',
        greeting: businessHoursCheck.afterHoursMessage,
        reason: 'Outside business hours'
      };
    }

    // Step 3: Get AI configuration for greeting and phone tree
    const aiConfig = await storage.getAiConfig();
    if (!aiConfig) {
      return {
        action: 'ai_greeting',
        greeting: "Hello! You've reached our AI assistant. How can I help you today?",
        reason: 'Default AI greeting'
      };
    }

    // Step 4: Check if phone tree is enabled
    const phoneTree = aiConfig.phoneTree as any;
    if (phoneTree && phoneTree.enabled) {
      return {
        action: 'phone_tree',
        greeting: aiConfig.greeting,
        phoneTreeOptions: phoneTree.options,
        reason: 'Phone tree routing enabled'
      };
    }

    // Step 5: Default to AI greeting
    return {
      action: 'ai_greeting',
      greeting: aiConfig.greeting,
      reason: 'AI assistant handling'
    };
  }

  private async checkContactPassthrough(callerNumber: string): Promise<CallWorkflowResult | null> {
    const contact = await storage.getContactByPhone(callerNumber);
    if (!contact) return null;

    const contactRoutes = await storage.getContactRoutesForPhone(callerNumber);
    
    for (const route of contactRoutes) {
      if (!route.active) continue;

      // Check if business hours restriction applies
      if (route.businessHoursOnly) {
        const businessHours = await this.checkBusinessHours();
        if (!businessHours.isOpen) continue;
      }

      switch (route.action) {
        case 'passthrough':
          return {
            action: 'passthrough',
            destination: route.forwardTo || undefined,
            reason: `Contact ${contact.firstName || ''} ${contact.lastName || ''} configured for passthrough`
          };
        case 'forward':
          return {
            action: 'route',
            destination: route.forwardTo || undefined,
            reason: `Contact ${contact.firstName || ''} ${contact.lastName || ''} configured for forwarding`
          };
        case 'voicemail':
          return {
            action: 'voicemail',
            reason: `Contact ${contact.firstName || ''} ${contact.lastName || ''} configured for voicemail`
          };
        case 'block':
          return {
            action: 'block',
            reason: `Contact ${contact.firstName || ''} ${contact.lastName || ''} is blocked`
          };
      }
    }

    return null;
  }

  private async checkBusinessHours(): Promise<{
    isOpen: boolean;
    afterHoursMessage?: string;
  }> {
    const aiConfig = await storage.getAiConfig();
    if (!aiConfig) {
      return { isOpen: true };
    }

    if (aiConfig.isAlwaysOpen) {
      return { isOpen: true };
    }

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM

    const businessHours = aiConfig.businessHours as any;
    const daySchedule = businessHours[currentDay];
    
    if (!daySchedule || !daySchedule.enabled) {
      return {
        isOpen: false,
        afterHoursMessage: "Thank you for calling. We are currently closed. Please leave a message and we'll get back to you."
      };
    }

    const isWithinHours = currentTime >= daySchedule.open && currentTime <= daySchedule.close;
    if (!isWithinHours) {
      return {
        isOpen: false,
        afterHoursMessage: `Thank you for calling. Our business hours are ${daySchedule.open} to ${daySchedule.close}. Please leave a message.`
      };
    }

    return { isOpen: true };
  }

  async handlePhoneTreeSelection(selection: string): Promise<CallWorkflowResult> {
    const aiConfig = await storage.getAiConfig();
    if (!aiConfig) {
      return {
        action: 'ai_greeting',
        greeting: "I'm sorry, there seems to be an issue with our phone system. Let me connect you to an assistant.",
        reason: 'Phone tree configuration missing'
      };
    }

    const phoneTree = aiConfig.phoneTree as any;
    if (!phoneTree || !phoneTree.options) {
      return {
        action: 'ai_greeting',
        greeting: "I'm sorry, there seems to be an issue with our phone system. Let me connect you to an assistant.",
        reason: 'Phone tree configuration missing'
      };
    }

    const selectedOption = phoneTree.options.find((option: any) => option.key === selection);

    if (!selectedOption) {
      return {
        action: 'ai_greeting',
        greeting: "I didn't understand your selection. Let me help you directly. What can I assist you with today?",
        reason: 'Invalid phone tree selection'
      };
    }

    switch (selectedOption.action) {
      case 'route':
        return {
          action: 'route',
          destination: selectedOption.destination,
          reason: `Phone tree routing to ${selectedOption.label}`
        };
      case 'ai':
        return {
          action: 'ai_greeting',
          greeting: `Thank you for selecting ${selectedOption.label}. How can I help you today?`,
          reason: `AI handling for ${selectedOption.label}`
        };
      default:
        return {
          action: 'ai_greeting',
          greeting: "Let me connect you with the right person. How can I help you today?",
          reason: 'Fallback to AI'
        };
    }
  }

  async generateTwiMLResponse(workflowResult: CallWorkflowResult): Promise<string> {
    switch (workflowResult.action) {
      case 'passthrough':
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>${workflowResult.destination}</Dial>
</Response>`;

      case 'route':
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${workflowResult.greeting || 'Connecting you now.'}</Say>
  <Dial>${workflowResult.destination}</Dial>
</Response>`;

      case 'phone_tree':
        const options = workflowResult.phoneTreeOptions?.map((option: any) => 
          `Press ${option.key} for ${option.label}.`
        ).join(' ') || '';
        
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="/api/twilio/gather" method="POST" numDigits="1" timeout="10">
    <Say>${workflowResult.greeting} ${options}</Say>
  </Gather>
  <Say>I didn't receive a selection. Let me connect you to our AI assistant.</Say>
  <Redirect>/api/twilio/ai-greeting</Redirect>
</Response>`;

      case 'ai_greeting':
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="/api/twilio/gather" method="POST" input="speech" timeout="5">
    <Say>${workflowResult.greeting}</Say>
  </Gather>
  <Say>I didn't catch that. Please hold while I connect you to someone who can help.</Say>
  <Dial>+1234567890</Dial>
</Response>`;

      case 'voicemail':
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${workflowResult.greeting || 'Please leave a message after the beep.'}</Say>
  <Record action="/api/twilio/recording" method="POST" maxLength="120" transcribe="true"/>
</Response>`;

      case 'block':
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>This number is not accepting calls at this time.</Say>
  <Hangup/>
</Response>`;

      default:
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling. How can I help you today?</Say>
</Response>`;
    }
  }
}

export const enhancedCallWorkflow = new EnhancedCallWorkflow();