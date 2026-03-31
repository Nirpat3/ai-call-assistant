import OpenAI from "openai";
import { storage } from "../storage";
import { AIAgentRole, AIConversationState, InsertAIConversationState } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface Intent {
  name: string;
  confidence: number;
  entities: Record<string, string>;
}

export interface OrchestratorResult {
  response: string;
  intent: Intent;
  agentRole: string;
  shouldTransfer: boolean;
  transferTo?: string;
  shouldEscalate: boolean;
  escalationReason?: string;
  conversationState: Partial<AIConversationState>;
}

export class ConversationOrchestrator {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async detectIntent(userInput: string, context?: Record<string, unknown>): Promise<Intent> {
    const systemPrompt = `You are an intent detection system. Analyze the user input and determine their intent.

Possible intents:
- greeting: User is greeting or starting conversation
- schedule_appointment: User wants to schedule a meeting or appointment
- billing_inquiry: User has questions about bills, payments, invoices
- product_question: User wants to know about products or services
- technical_support: User needs help with technical issues
- complaint: User is expressing dissatisfaction
- transfer_request: User explicitly asks to speak to someone
- voicemail_request: User wants to leave a message
- sales_inquiry: User is interested in purchasing
- account_update: User wants to update their account info
- general_inquiry: General questions that don't fit other categories

Respond with JSON:
{
  "intent": "<intent_name>",
  "confidence": <0-100>,
  "entities": { "<entity_type>": "<value>" }
}

Entities to extract:
- person_name, phone_number, email, date, time, product_name, order_id, amount`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Context: ${JSON.stringify(context || {})}\n\nUser input: "${userInput}"` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        name: result.intent || "general_inquiry",
        confidence: result.confidence || 50,
        entities: result.entities || {},
      };
    } catch (error) {
      console.error("Intent detection error:", error);
      return {
        name: "general_inquiry",
        confidence: 0,
        entities: {},
      };
    }
  }

  async routeToAgent(intent: Intent): Promise<AIAgentRole | null> {
    const intentToRole: Record<string, string> = {
      greeting: "receptionist",
      schedule_appointment: "personal_assistant",
      billing_inquiry: "billing",
      product_question: "sales",
      technical_support: "support",
      complaint: "support",
      transfer_request: "receptionist",
      voicemail_request: "receptionist",
      sales_inquiry: "sales",
      account_update: "billing",
      general_inquiry: "receptionist",
    };

    const roleName = intentToRole[intent.name] || "receptionist";
    
    try {
      const agents = await storage.getAgentRoles(this.organizationId);
      return agents.find(a => a.name === roleName && a.isActive) || agents[0] || null;
    } catch (error) {
      console.error("Error routing to agent:", error);
      return null;
    }
  }

  async processConversation(
    userInput: string,
    conversationState?: AIConversationState | null,
    callerInfo?: { name?: string; phone?: string }
  ): Promise<OrchestratorResult> {
    const intent = await this.detectIntent(userInput, {
      previousIntents: conversationState?.intentHistory || [],
      callerName: callerInfo?.name,
    });

    const agent = await this.routeToAgent(intent);
    
    const currentAgentRole = conversationState?.currentAgentRole || agent?.name || "receptionist";
    const shouldTransferAgent = agent && agent.name !== currentAgentRole;

    const needsEscalation = this.checkEscalation(intent, agent, conversationState);

    const response = await this.generateResponse(
      userInput,
      intent,
      agent,
      conversationState,
      callerInfo
    );

    const updatedState: Partial<AIConversationState> = {
      currentAgentRole: agent?.name || currentAgentRole,
      previousAgentRoles: shouldTransferAgent && conversationState
        ? [...(conversationState.previousAgentRoles || []), currentAgentRole]
        : conversationState?.previousAgentRoles || [],
      intentHistory: [
        ...(conversationState?.intentHistory as Intent[] || []),
        intent
      ],
      extractedEntities: {
        ...(conversationState?.extractedEntities as Record<string, string> || {}),
        ...intent.entities,
      },
      turnCount: (conversationState?.turnCount || 0) + 1,
      confidenceHistory: [
        ...((conversationState?.confidenceHistory as number[]) || []),
        intent.confidence
      ],
      escalationStatus: needsEscalation.shouldEscalate ? "pending" : "none",
      escalationReason: needsEscalation.reason,
    };

    return {
      response,
      intent,
      agentRole: agent?.name || "receptionist",
      shouldTransfer: shouldTransferAgent || false,
      transferTo: shouldTransferAgent ? agent?.name : undefined,
      shouldEscalate: needsEscalation.shouldEscalate,
      escalationReason: needsEscalation.reason,
      conversationState: updatedState,
    };
  }

  private checkEscalation(
    intent: Intent,
    agent: AIAgentRole | null,
    state?: AIConversationState | null
  ): { shouldEscalate: boolean; reason?: string } {
    if (intent.confidence < (agent?.confidenceThreshold || 85)) {
      return { 
        shouldEscalate: true, 
        reason: `Low confidence (${intent.confidence}%) for intent: ${intent.name}` 
      };
    }

    if (state && state.turnCount && state.turnCount >= (agent?.maxTurns || 10)) {
      return { 
        shouldEscalate: true, 
        reason: `Exceeded maximum turns (${state.turnCount})` 
      };
    }

    const escalationKeywords = agent?.escalationTriggers || [];
    const inputLower = intent.name.toLowerCase();
    for (const trigger of escalationKeywords) {
      if (inputLower.includes(trigger.toLowerCase())) {
        return { 
          shouldEscalate: true, 
          reason: `Triggered by keyword: ${trigger}` 
        };
      }
    }

    if (intent.name === "complaint") {
      return { 
        shouldEscalate: true, 
        reason: "Customer complaint detected" 
      };
    }

    return { shouldEscalate: false };
  }

  private async generateResponse(
    userInput: string,
    intent: Intent,
    agent: AIAgentRole | null,
    state?: AIConversationState | null,
    callerInfo?: { name?: string; phone?: string }
  ): Promise<string> {
    const systemPrompt = agent?.systemPrompt || 
      "You are a helpful AI assistant. Be polite, concise, and helpful.";

    const contextInfo = callerInfo?.name 
      ? `You are speaking with ${callerInfo.name}.` 
      : "You are speaking with a caller.";

    const previousContext = state?.extractedEntities 
      ? `Known information: ${JSON.stringify(state.extractedEntities)}` 
      : "";

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: `${systemPrompt}\n\n${contextInfo}\n${previousContext}\n\nCurrent intent: ${intent.name} (confidence: ${intent.confidence}%)\n\nKeep responses conversational and under 3 sentences for phone calls.` 
          },
          { role: "user", content: userInput }
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      return response.choices[0].message.content || "I apologize, I didn't catch that. Could you please repeat?";
    } catch (error) {
      console.error("Response generation error:", error);
      return "I'm having some technical difficulties. Let me transfer you to someone who can help.";
    }
  }

  async createConversationState(
    callSid: string,
    initialAgentRole: string = "receptionist"
  ): Promise<AIConversationState> {
    const stateData: InsertAIConversationState = {
      callSid,
      currentAgentRole: initialAgentRole,
      previousAgentRoles: [],
      intentHistory: [],
      extractedEntities: {},
      contextMemory: {},
      turnCount: 0,
      confidenceHistory: [],
      isActive: true,
      organizationId: this.organizationId,
    };

    return await storage.createConversationState(stateData);
  }

  async updateConversationState(
    id: number,
    updates: Partial<AIConversationState>
  ): Promise<AIConversationState | null> {
    return await storage.updateConversationState(id, updates);
  }

  async processWithPersonaPlex(
    callSid: string,
    agentRole: AIAgentRole,
    persona?: string
  ): Promise<{
    sessionId: string;
    websocketUrl: string;
    provider: string;
  }> {
    const { voiceProviderManager } = await import("./voice-provider");

    const defaultPersona = agentRole.systemPrompt || `You are a ${agentRole.name}. ${agentRole.capabilities?.join(". ") || ""}`;
    const voiceMap: Record<string, string> = {
      receptionist: "NATF2",
      personal_assistant: "NATF1",
      sales: "NATM0",
      billing: "NATF3",
      support: "NATM1",
    };
    const voice = voiceMap[agentRole.name] || "NATF2";

    const session = await voiceProviderManager.createPersonaPlexSession({
      voice,
      persona: persona || defaultPersona,
      fullDuplex: true,
    });

    return {
      ...session,
      provider: "nvidia_personaplex",
    };
  }
}

export function createOrchestrator(organizationId: string): ConversationOrchestrator {
  return new ConversationOrchestrator(organizationId);
}
