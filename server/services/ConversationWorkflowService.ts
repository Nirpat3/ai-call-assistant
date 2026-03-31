import OpenAI from "openai";
import { storage } from "../storage";
import type { 
  InsertConversationLog, 
  InsertAiResponseEvaluation, 
  KnowledgeBase, 
  ConversationTemplate 
} from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  confidence?: number;
  knowledgeUsed?: number[];
}

export interface ConversationContext {
  callId: number;
  callerPhone: string;
  callerName?: string;
  conversationHistory: ConversationMessage[];
  currentIntent?: string;
  customerSatisfaction?: number;
}

export interface AiResponse {
  response: string;
  confidence: number;
  knowledgeUsed: number[];
  shouldRespond: boolean;
  escalateToHuman: boolean;
  reasoning: string;
}

export class ConversationWorkflowService {
  private readonly CONFIDENCE_THRESHOLD = 90;
  private readonly MIN_KNOWLEDGE_RELEVANCE = 0.7;

  async processVoiceInput(
    audioUrl: string, 
    context: ConversationContext
  ): Promise<ConversationMessage> {
    try {
      // Transcribe audio using OpenAI Whisper
      const transcription = await this.transcribeAudio(audioUrl);
      
      const message: ConversationMessage = {
        role: "user",
        content: transcription,
        timestamp: new Date()
      };

      // Add to conversation history
      context.conversationHistory.push(message);

      return message;
    } catch (error) {
      console.error("Error processing voice input:", error);
      throw new Error("Failed to process voice input");
    }
  }

  async generateAiResponse(
    userMessage: string,
    context: ConversationContext
  ): Promise<AiResponse> {
    try {
      // 1. Retrieve relevant knowledge from knowledge base
      const relevantKnowledge = await this.retrieveKnowledge(userMessage, context);
      
      // 2. Generate AI response using knowledge base
      const aiResponse = await this.generateResponseWithKnowledge(
        userMessage, 
        relevantKnowledge, 
        context
      );

      // 3. Evaluate response confidence using second AI model
      const evaluation = await this.evaluateResponse(userMessage, aiResponse, relevantKnowledge);

      // 4. Log the conversation exchange
      await this.logConversationExchange(context, userMessage, aiResponse, evaluation);

      return {
        response: aiResponse,
        confidence: evaluation.confidence,
        knowledgeUsed: relevantKnowledge.map(k => k.id),
        shouldRespond: evaluation.confidence >= this.CONFIDENCE_THRESHOLD,
        escalateToHuman: evaluation.confidence < 70 || evaluation.requiresHuman,
        reasoning: evaluation.reasoning
      };
    } catch (error) {
      console.error("Error generating AI response:", error);
      throw new Error("Failed to generate AI response");
    }
  }

  private async transcribeAudio(audioUrl: string): Promise<string> {
    try {
      const response = await fetch(audioUrl);
      const audioBuffer = await response.arrayBuffer();
      
      // Convert to file format that OpenAI accepts
      const audioFile = new File([audioBuffer], "audio.wav", { type: "audio/wav" });
      
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en",
        response_format: "json",
        temperature: 0.0,
      });

      return transcription.text;
    } catch (error) {
      console.error("Error transcribing audio:", error);
      throw new Error("Failed to transcribe audio");
    }
  }

  private async retrieveKnowledge(
    query: string, 
    context: ConversationContext
  ): Promise<KnowledgeBase[]> {
    try {
      // Get all active knowledge base entries
      const allKnowledge = await storage.getKnowledgeBase();
      
      if (!allKnowledge.length) {
        return [];
      }

      // Use AI to rank knowledge relevance
      const relevanceScores = await this.rankKnowledgeRelevance(query, allKnowledge);
      
      // Filter by relevance threshold and return top matches
      return relevanceScores
        .filter(item => item.relevance >= this.MIN_KNOWLEDGE_RELEVANCE)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 5)
        .map(item => item.knowledge);
    } catch (error) {
      console.error("Error retrieving knowledge:", error);
      return [];
    }
  }

  private async rankKnowledgeRelevance(
    query: string, 
    knowledge: KnowledgeBase[]
  ): Promise<Array<{ knowledge: KnowledgeBase; relevance: number }>> {
    try {
      const rankings = await Promise.all(
        knowledge.map(async (kb) => {
          const relevanceResponse = await openai.chat.completions.create({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: [
              {
                role: "system",
                content: `You are a knowledge relevance evaluator. Rate how relevant the provided knowledge is to answering the user's query on a scale of 0.0 to 1.0. Consider context, keywords, and intent. Respond with JSON format: {"relevance": number, "reasoning": "brief explanation"}`
              },
              {
                role: "user",
                content: `Query: "${query}"\n\nKnowledge: "${kb.content}"\n\nHow relevant is this knowledge to answering the query?`
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
          });

          const result = JSON.parse(relevanceResponse.choices[0].message.content || "{}");
          return {
            knowledge: kb,
            relevance: result.relevance || 0
          };
        })
      );

      return rankings;
    } catch (error) {
      console.error("Error ranking knowledge relevance:", error);
      return knowledge.map(kb => ({ knowledge: kb, relevance: 0.5 }));
    }
  }

  private async generateResponseWithKnowledge(
    userMessage: string,
    knowledge: KnowledgeBase[],
    context: ConversationContext
  ): Promise<string> {
    try {
      const conversationHistory = context.conversationHistory
        .slice(-6) // Last 6 messages for context
        .map(msg => `${msg.role}: ${msg.content}`)
        .join("\n");

      const knowledgeContext = knowledge
        .map(kb => `[${kb.title}]: ${kb.content}`)
        .join("\n\n");

      const systemPrompt = `You are an AI customer service assistant. Use the provided knowledge base to answer customer questions accurately and helpfully. 

Guidelines:
- Only use information from the provided knowledge base
- If the knowledge base doesn't contain relevant information, politely say you need to transfer to a human agent
- Be conversational, empathetic, and professional
- Keep responses concise but complete
- Ask clarifying questions if needed
- Always prioritize customer satisfaction

Knowledge Base:
${knowledgeContext}

Recent Conversation:
${conversationHistory}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      return response.choices[0].message.content || "I apologize, but I'm having trouble processing your request. Let me transfer you to a human agent who can better assist you.";
    } catch (error) {
      console.error("Error generating response with knowledge:", error);
      return "I apologize for the technical difficulty. Let me connect you with a human agent who can help you immediately.";
    }
  }

  private async evaluateResponse(
    userMessage: string,
    aiResponse: string,
    knowledge: KnowledgeBase[]
  ): Promise<{
    confidence: number;
    requiresHuman: boolean;
    reasoning: string;
    responseQuality: number;
  }> {
    try {
      const knowledgeContext = knowledge
        .map(kb => `[${kb.title}]: ${kb.content}`)
        .join("\n\n");

      const evaluationResponse = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a response quality evaluator. Analyze the AI response and determine:
1. Confidence level (0-100): How confident are you that this response correctly addresses the user's question?
2. Whether human intervention is needed
3. Response quality (0-100): How well-crafted and helpful is the response?

Consider:
- Accuracy based on knowledge base
- Completeness of the answer
- Appropriateness of tone
- Whether the response might confuse or mislead the customer

Respond in JSON format: {
  "confidence": number,
  "requiresHuman": boolean,
  "reasoning": "detailed explanation",
  "responseQuality": number
}`
          },
          {
            role: "user",
            content: `User Question: "${userMessage}"

AI Response: "${aiResponse}"

Available Knowledge:
${knowledgeContext}

Evaluate this response.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const evaluation = JSON.parse(evaluationResponse.choices[0].message.content || "{}");
      
      return {
        confidence: evaluation.confidence || 50,
        requiresHuman: evaluation.requiresHuman || false,
        reasoning: evaluation.reasoning || "Unable to evaluate response",
        responseQuality: evaluation.responseQuality || 50
      };
    } catch (error) {
      console.error("Error evaluating response:", error);
      return {
        confidence: 50,
        requiresHuman: true,
        reasoning: "Failed to evaluate response quality",
        responseQuality: 50
      };
    }
  }

  private async logConversationExchange(
    context: ConversationContext,
    userMessage: string,
    aiResponse: string,
    evaluation: any
  ): Promise<void> {
    try {
      // Create conversation log entry
      const conversationLog: InsertConversationLog = {
        callId: context.callId,
        transcript: JSON.stringify(context.conversationHistory),
        aiResponses: [
          {
            userMessage,
            aiResponse,
            confidence: evaluation.confidence,
            timestamp: new Date().toISOString()
          }
        ],
        conversationScore: this.calculateConversationScore(context),
        responseScore: evaluation.responseQuality,
        knowledgeUsed: evaluation.knowledgeUsed || [],
        resolutionStatus: evaluation.requiresHuman ? "escalated" : "pending",
        tags: await this.extractConversationTags(userMessage, aiResponse)
      };

      await storage.createConversationLog(conversationLog);

      // Create AI response evaluation
      const responseEvaluation: InsertAiResponseEvaluation = {
        conversationLogId: 0, // Will be set after conversation log is created
        userMessage,
        aiResponse,
        confidenceScore: evaluation.confidence,
        knowledgeBaseIds: evaluation.knowledgeUsed || [],
        approved: evaluation.confidence >= this.CONFIDENCE_THRESHOLD,
        feedback: evaluation.reasoning
      };

      await storage.createAiResponseEvaluation(responseEvaluation);
    } catch (error) {
      console.error("Error logging conversation exchange:", error);
    }
  }

  private calculateConversationScore(context: ConversationContext): number {
    // Simple scoring algorithm based on conversation flow
    const messageCount = context.conversationHistory.length;
    const userMessages = context.conversationHistory.filter(msg => msg.role === "user");
    const avgConfidence = context.conversationHistory
      .filter(msg => msg.confidence)
      .reduce((sum, msg) => sum + (msg.confidence || 0), 0) / messageCount || 0;

    // Score factors: brevity, confidence, resolution
    let score = 100;
    
    // Penalize long conversations (may indicate confusion)
    if (messageCount > 10) score -= (messageCount - 10) * 2;
    
    // Reward high confidence
    score = (score * 0.7) + (avgConfidence * 0.3);
    
    // Apply customer satisfaction if available
    if (context.customerSatisfaction) {
      score = (score * 0.8) + (context.customerSatisfaction * 20 * 0.2);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private async extractConversationTags(userMessage: string, aiResponse: string): Promise<string[]> {
    try {
      const tagResponse = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `Extract 3-5 relevant tags from this customer service conversation. Tags should be single words or short phrases that categorize the conversation topic, sentiment, or resolution type. Return as JSON array: {"tags": ["tag1", "tag2", "tag3"]}`
          },
          {
            role: "user",
            content: `Customer: ${userMessage}\nAgent: ${aiResponse}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(tagResponse.choices[0].message.content || "{}");
      return result.tags || [];
    } catch (error) {
      console.error("Error extracting tags:", error);
      return ["general", "support"];
    }
  }

  async findSimilarConversations(
    currentMessage: string,
    limit: number = 5
  ): Promise<ConversationTemplate[]> {
    try {
      // Get conversation templates and use AI to find similar scenarios
      const templates = await storage.getConversationTemplates();
      
      if (!templates.length) {
        return [];
      }

      const similarities = await Promise.all(
        templates.map(async (template) => {
          const similarityResponse = await openai.chat.completions.create({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: [
              {
                role: "system",
                content: `Rate the similarity between the current customer message and the conversation scenario on a scale of 0.0 to 1.0. Consider intent, topic, and context. Respond with JSON: {"similarity": number}`
              },
              {
                role: "user",
                content: `Current message: "${currentMessage}"\n\nTemplate scenario: "${template.scenario}"\n\nSimilarity score?`
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
          });

          const result = JSON.parse(similarityResponse.choices[0].message.content || "{}");
          return {
            template,
            similarity: result.similarity || 0
          };
        })
      );

      return similarities
        .filter(item => item.similarity >= 0.6)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => item.template);
    } catch (error) {
      console.error("Error finding similar conversations:", error);
      return [];
    }
  }
}

export const conversationWorkflowService = new ConversationWorkflowService();