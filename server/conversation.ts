import OpenAI from "openai";
import { storage } from "./storage";
import { transcribeAudio, analyzeCallIntent } from "./openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ConversationContext {
  callSid: string;
  callerNumber: string;
  businessContext: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    confidence?: number;
  }>;
  currentIntent: string;
  entities: Record<string, any>;
  emotionalTone: 'positive' | 'neutral' | 'frustrated' | 'urgent';
  requiresHuman: boolean;
}

export class ConversationManager {
  private contexts: Map<string, ConversationContext> = new Map();
  private confidenceThreshold = 0.90; // 90% confidence threshold

  async startConversation(callSid: string, callerNumber: string): Promise<ConversationContext> {
    const contact = await storage.getContactByPhone(callerNumber);
    const businessHours = await this.getBusinessHours();
    
    const context: ConversationContext = {
      callSid,
      callerNumber,
      businessContext: this.buildBusinessContext(contact, businessHours),
      conversationHistory: [],
      currentIntent: 'greeting',
      entities: {},
      emotionalTone: 'neutral',
      requiresHuman: false
    };

    this.contexts.set(callSid, context);
    return context;
  }

  async processUserInput(callSid: string, audioUrl: string): Promise<{
    response: string;
    confidence: number;
    shouldTransferToHuman: boolean;
    twimlResponse: string;
  }> {
    const context = this.contexts.get(callSid);
    if (!context) {
      throw new Error('Conversation context not found');
    }

    // Transcribe user input
    const transcription = await transcribeAudio(audioUrl);
    
    // Analyze intent and emotion
    const analysis = await this.analyzeUserInput(transcription, context);
    
    // Update context
    context.conversationHistory.push({
      role: 'user',
      content: transcription,
      timestamp: new Date()
    });
    
    context.currentIntent = analysis.intent;
    context.entities = { ...context.entities, ...analysis.entities };
    context.emotionalTone = analysis.emotionalTone;

    // Generate human-like response
    const aiResponse = await this.generateHumanLikeResponse(context, analysis);
    
    // Check if human intervention is needed
    const shouldTransfer = this.shouldTransferToHuman(context, aiResponse.confidence);
    
    if (!shouldTransfer) {
      context.conversationHistory.push({
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        confidence: aiResponse.confidence
      });
    }

    // Generate TwiML response
    const twimlResponse = this.generateTwiMLResponse(aiResponse.content, shouldTransfer);

    return {
      response: aiResponse.content,
      confidence: aiResponse.confidence,
      shouldTransferToHuman: shouldTransfer,
      twimlResponse
    };
  }

  private async analyzeUserInput(transcription: string, context: ConversationContext) {
    const prompt = `
    Analyze this customer conversation input and provide a JSON response:
    
    Customer said: "${transcription}"
    
    Previous conversation context:
    - Current intent: ${context.currentIntent}
    - Emotional tone: ${context.emotionalTone}
    - Previous messages: ${context.conversationHistory.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}
    
    Provide analysis in this JSON format:
    {
      "intent": "greeting|question|complaint|request|pricing|support|goodbye",
      "entities": {
        "product": "string or null",
        "issue": "string or null", 
        "urgency": "low|medium|high",
        "phone_number": "string or null",
        "email": "string or null"
      },
      "emotionalTone": "positive|neutral|frustrated|urgent",
      "requiresHuman": boolean,
      "reasoning": "explanation for the analysis"
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private async generateHumanLikeResponse(context: ConversationContext, analysis: any): Promise<{
    content: string;
    confidence: number;
  }> {
    // Get relevant knowledge base information
    const knowledgeContext = await this.getRelevantKnowledge(analysis.intent, context.conversationHistory);
    
    const systemPrompt = `
    You are a professional, helpful customer service representative. Your goal is to sound completely human and natural.
    
    CONVERSATION GUIDELINES:
    - Use natural speech patterns with occasional "ums", "let me check that", "absolutely"
    - Show empathy and understanding
    - Be conversational but professional
    - Use the customer's name if known
    - Reference previous parts of the conversation naturally
    - Avoid robotic or overly formal language
    - Use contractions (I'll, we're, that's, etc.)
    - Add natural pauses and breathing room in speech
    
    PERSONALITY TRAITS:
    - Warm and approachable
    - Knowledgeable but not overwhelming
    - Patient and understanding
    - Proactive in offering help
    
    BUSINESS CONTEXT:
    ${context.businessContext}
    
    KNOWLEDGE BASE:
    ${knowledgeContext}
    
    CONVERSATION HISTORY:
    ${context.conversationHistory.map(h => `${h.role}: ${h.content}`).join('\n')}
    
    CURRENT SITUATION:
    - Customer's emotional tone: ${context.emotionalTone}
    - Detected intent: ${analysis.intent}
    - Key entities: ${JSON.stringify(analysis.entities)}
    
    Respond naturally as a human would. Keep responses concise (30-60 words) for phone conversations.
    `;

    const userMessage = context.conversationHistory[context.conversationHistory.length - 1]?.content || '';

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    // Calculate confidence based on intent clarity and knowledge availability
    const confidence = this.calculateResponseConfidence(analysis, knowledgeContext);

    return {
      content: response.choices[0].message.content || "I'm sorry, could you repeat that?",
      confidence
    };
  }

  private calculateResponseConfidence(analysis: any, knowledgeContext: string): number {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence for clear intents
    if (['greeting', 'goodbye', 'pricing'].includes(analysis.intent)) {
      confidence += 0.3;
    }
    
    // Boost confidence if we have relevant knowledge
    if (knowledgeContext.length > 100) {
      confidence += 0.2;
    }
    
    // Reduce confidence for frustrated customers
    if (analysis.emotionalTone === 'frustrated') {
      confidence -= 0.2;
    }
    
    // Reduce confidence for complex technical issues
    if (analysis.intent === 'complaint' && analysis.entities.urgency === 'high') {
      confidence -= 0.3;
    }
    
    return Math.max(0.1, Math.min(0.95, confidence));
  }

  private shouldTransferToHuman(context: ConversationContext, confidence: number): boolean {
    // Transfer if confidence is below threshold
    if (confidence < this.confidenceThreshold) {
      return true;
    }
    
    // Transfer if customer is frustrated and has been in conversation for a while
    if (context.emotionalTone === 'frustrated' && context.conversationHistory.length > 6) {
      return true;
    }
    
    // Transfer if explicitly requested
    if (context.conversationHistory.some(h => 
      h.role === 'user' && 
      /speak.*human|talk.*person|transfer.*agent|real.*person/i.test(h.content)
    )) {
      return true;
    }
    
    return false;
  }

  private generateTwiMLResponse(content: string, shouldTransfer: boolean): string {
    const twilio = require('twilio');
    const twiml = new twilio.twiml.VoiceResponse();
    
    if (shouldTransfer) {
      twiml.say({
        voice: 'Polly.Joanna',
        rate: '0.9'
      }, "Let me connect you with one of our team members who can better assist you.");
      
      // Add transfer logic here - could be to a queue or specific number
      twiml.dial('+1404-590-1101'); // Sales line as example
    } else {
      // Add natural speech characteristics
      const naturalContent = this.addSpeechMarks(content);
      
      twiml.say({
        voice: 'Polly.Joanna',
        rate: '0.9'
      }, naturalContent);
      
      // Continue listening for response
      twiml.gather({
        input: 'speech',
        speechTimeout: 'auto',
        action: '/webhook/call-gather',
        method: 'POST'
      });
    }
    
    return twiml.toString();
  }

  private addSpeechMarks(content: string): string {
    // Add natural pauses and emphasis to make speech more human-like
    return content
      .replace(/\. /g, '. <break time="0.5s"/> ')
      .replace(/\? /g, '? <break time="0.3s"/> ')
      .replace(/\, /g, ', <break time="0.2s"/> ')
      .replace(/absolutely/gi, '<emphasis level="moderate">absolutely</emphasis>')
      .replace(/definitely/gi, '<emphasis level="moderate">definitely</emphasis>');
  }

  private async getRelevantKnowledge(intent: string, history: any[]): Promise<string> {
    try {
      const knowledgeItems = await storage.getKnowledgeBase();
      
      // Simple relevance matching - could be enhanced with vector embeddings
      const relevantItems = knowledgeItems.filter(item => {
        const searchText = `${item.title} ${item.content}`.toLowerCase();
        return intent === 'pricing' ? searchText.includes('price') || searchText.includes('cost') :
               intent === 'support' ? searchText.includes('support') || searchText.includes('help') :
               intent === 'complaint' ? searchText.includes('issue') || searchText.includes('problem') :
               true;
      });
      
      return relevantItems.slice(0, 3).map(item => `${item.title}: ${item.content}`).join('\n');
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
      return '';
    }
  }

  private buildBusinessContext(contact: any, businessHours: any): string {
    const contactInfo = contact ? 
      `Customer: ${contact.firstName} ${contact.lastName}, ${contact.isVip ? 'VIP customer' : 'valued customer'}` :
      'New customer';
    
    return `
    Business: AI-powered communication platform
    Phone: +17274362999
    Sales: +1404-590-1101
    Support: +1888-727-4302
    ${contactInfo}
    Business Hours: ${businessHours.isOpen ? 'Currently open' : 'Currently closed'}
    `;
  }

  private async getBusinessHours(): Promise<{ isOpen: boolean }> {
    const now = new Date();
    const hour = now.getHours();
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    
    // Business hours: 6 AM - 11 PM EST, Monday-Friday
    const isOpen = isWeekday && hour >= 6 && hour < 23;
    
    return { isOpen };
  }

  async endConversation(callSid: string): Promise<void> {
    const context = this.contexts.get(callSid);
    if (context) {
      // Log conversation for learning
      await this.logConversationForLearning(context);
      this.contexts.delete(callSid);
    }
  }

  private async logConversationForLearning(context: ConversationContext): Promise<void> {
    try {
      // Save conversation log
      await storage.createConversationLog({
        callSid: context.callSid,
        callerNumber: context.callerNumber,
        conversationData: JSON.stringify(context.conversationHistory),
        intent: context.currentIntent,
        emotionalTone: context.emotionalTone,
        transferredToHuman: context.requiresHuman,
        organizationId: "88872271-d973-49c5-a3bd-6d4fc18c60f2"
      });

      // Generate summary and potential FAQ
      await this.generateFAQFromConversation(context);
    } catch (error) {
      console.error('Error logging conversation:', error);
    }
  }

  private async generateFAQFromConversation(context: ConversationContext): Promise<void> {
    if (context.conversationHistory.length < 4) return; // Skip short conversations
    
    const conversationText = context.conversationHistory
      .map(h => `${h.role}: ${h.content}`)
      .join('\n');

    const prompt = `
    Analyze this customer conversation and determine if it represents a common question that should be added to our FAQ.
    
    Conversation:
    ${conversationText}
    
    If this conversation reveals a frequently asked question, provide a JSON response with:
    {
      "shouldAddToFAQ": boolean,
      "question": "clear, concise question",
      "answer": "helpful, comprehensive answer",
      "category": "pricing|support|product|technical|general",
      "confidence": 0.0-1.0
    }
    
    Only suggest FAQ additions for clear, actionable questions that other customers might ask.
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const faqSuggestion = JSON.parse(response.choices[0].message.content || '{}');
      
      if (faqSuggestion.shouldAddToFAQ && faqSuggestion.confidence > 0.7) {
        // Check if similar FAQ already exists
        const existingFAQs = await storage.getKnowledgeBase();
        const isDuplicate = existingFAQs.some(faq => 
          faq.title.toLowerCase().includes(faqSuggestion.question.toLowerCase().split(' ')[0])
        );
        
        if (!isDuplicate) {
          await storage.createKnowledgeBase({
            title: faqSuggestion.question,
            content: faqSuggestion.answer,
            category: faqSuggestion.category,
            isActive: false, // Requires manual approval
            organizationId: "88872271-d973-49c5-a3bd-6d4fc18c60f2"
          });
        }
      }
    } catch (error) {
      console.error('Error generating FAQ suggestion:', error);
    }
  }
}

export const conversationManager = new ConversationManager();