import OpenAI from "openai";
import { storage } from "./storage";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ConversationAnalytics {
  callSid: string;
  organizationId: string;
  duration: number;
  turnCount: number;
  averageResponseTime: number;
  sentimentProgression: Array<{
    timestamp: Date;
    sentiment: 'positive' | 'neutral' | 'negative';
    confidence: number;
  }>;
  emotionDetection: {
    primary: string;
    secondary?: string;
    intensity: number;
  };
  voiceQualityMetrics: {
    clarity: number;
    naturalness: number;
    appropriateness: number;
    engagement: number;
  };
  conversationFlow: {
    wasSmooth: boolean;
    interruptions: number;
    misunderstandings: number;
    transfersRequested: number;
  };
  aiPerformance: {
    intentAccuracy: number;
    responseRelevance: number;
    personalityConsistency: number;
    problemResolution: boolean;
  };
  outcomeMetrics: {
    satisfaction: number;
    goalAchieved: boolean;
    followUpRequired: boolean;
    escalationNeeded: boolean;
  };
  recommendations: string[];
  createdAt: Date;
}

export interface ConversationInsights {
  totalCalls: number;
  averageDuration: number;
  satisfactionTrend: Array<{
    date: string;
    averageSatisfaction: number;
    callCount: number;
  }>;
  topIssues: Array<{
    category: string;
    frequency: number;
    averageResolutionTime: number;
  }>;
  voicePersonalityPerformance: Array<{
    personalityId: string;
    usage: number;
    satisfaction: number;
    effectiveness: number;
  }>;
  emotionalAnalysis: {
    mostCommonEmotion: string;
    emotionalJourney: Array<{
      emotion: string;
      frequency: number;
      averageOutcome: number;
    }>;
  };
  improvementAreas: Array<{
    area: string;
    priority: 'high' | 'medium' | 'low';
    impact: number;
    recommendations: string[];
  }>;
}

export class ConversationAnalyzer {
  async analyzeConversation(
    callSid: string,
    organizationId: string,
    conversationHistory: Array<{
      role: string;
      content: string;
      timestamp: Date;
      speaker?: string;
    }>
  ): Promise<ConversationAnalytics> {
    const startTime = conversationHistory[0]?.timestamp || new Date();
    const endTime = conversationHistory[conversationHistory.length - 1]?.timestamp || new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000; // seconds

    // Analyze sentiment progression
    const sentimentProgression = await this.analyzeSentimentProgression(conversationHistory);
    
    // Detect emotions
    const emotionDetection = await this.detectEmotions(conversationHistory);
    
    // Evaluate voice quality (simulated for now)
    const voiceQualityMetrics = await this.evaluateVoiceQuality(conversationHistory);
    
    // Analyze conversation flow
    const conversationFlow = await this.analyzeConversationFlow(conversationHistory);
    
    // Evaluate AI performance
    const aiPerformance = await this.evaluateAIPerformance(conversationHistory);
    
    // Determine outcome metrics
    const outcomeMetrics = await this.analyzeOutcomes(conversationHistory);
    
    // Generate improvement recommendations
    const recommendations = await this.generateRecommendations({
      sentimentProgression,
      emotionDetection,
      conversationFlow,
      aiPerformance,
      outcomeMetrics
    });

    const analytics: ConversationAnalytics = {
      callSid,
      organizationId,
      duration,
      turnCount: conversationHistory.length,
      averageResponseTime: duration / conversationHistory.length,
      sentimentProgression,
      emotionDetection,
      voiceQualityMetrics,
      conversationFlow,
      aiPerformance,
      outcomeMetrics,
      recommendations,
      createdAt: new Date()
    };

    // Store analytics in database
    await this.storeAnalytics(analytics);

    return analytics;
  }

  private async analyzeSentimentProgression(conversationHistory: any[]): Promise<any[]> {
    const sentimentAnalysis = [];
    
    for (const turn of conversationHistory) {
      if (turn.role === 'user') {
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "Analyze the sentiment of this text. Respond with JSON containing 'sentiment' (positive/neutral/negative) and 'confidence' (0-1)."
              },
              { role: "user", content: turn.content }
            ],
            response_format: { type: "json_object" }
          });

          const analysis = JSON.parse(response.choices[0].message.content!);
          sentimentAnalysis.push({
            timestamp: turn.timestamp,
            sentiment: analysis.sentiment,
            confidence: analysis.confidence
          });
        } catch (error) {
          console.error("Sentiment analysis error:", error);
          sentimentAnalysis.push({
            timestamp: turn.timestamp,
            sentiment: 'neutral',
            confidence: 0.5
          });
        }
      }
    }

    return sentimentAnalysis;
  }

  private async detectEmotions(conversationHistory: any[]): Promise<any> {
    const userMessages = conversationHistory
      .filter(turn => turn.role === 'user')
      .map(turn => turn.content)
      .join(' ');

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Analyze the emotional content of this conversation. Identify the primary and secondary emotions, and rate the intensity (0-1).
            
            Respond with JSON:
            {
              "primary": "emotion_name",
              "secondary": "emotion_name_or_null",
              "intensity": 0.8
            }`
          },
          { role: "user", content: userMessages }
        ],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content!);
    } catch (error) {
      console.error("Emotion detection error:", error);
      return {
        primary: "neutral",
        secondary: null,
        intensity: 0.5
      };
    }
  }

  private async evaluateVoiceQuality(conversationHistory: any[]): Promise<any> {
    // In a real implementation, this would analyze actual audio quality
    // For now, we'll use AI to evaluate conversation quality
    const assistantMessages = conversationHistory
      .filter(turn => turn.role === 'assistant')
      .map(turn => turn.content)
      .join(' ');

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Evaluate the quality of these AI assistant responses on a scale of 0-1 for:
            - clarity: How clear and understandable are the responses?
            - naturalness: How human-like and conversational are they?
            - appropriateness: How well do they match the context and tone?
            - engagement: How engaging and helpful are they?
            
            Respond with JSON:
            {
              "clarity": 0.8,
              "naturalness": 0.7,
              "appropriateness": 0.9,
              "engagement": 0.8
            }`
          },
          { role: "user", content: assistantMessages }
        ],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content!);
    } catch (error) {
      console.error("Voice quality evaluation error:", error);
      return {
        clarity: 0.7,
        naturalness: 0.7,
        appropriateness: 0.7,
        engagement: 0.7
      };
    }
  }

  private async analyzeConversationFlow(conversationHistory: any[]): Promise<any> {
    const fullConversation = conversationHistory
      .map(turn => `${turn.role}: ${turn.content}`)
      .join('\n');

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Analyze this conversation flow and identify:
            - wasSmooth: Was the conversation smooth and natural? (boolean)
            - interruptions: Count of interruptions or abrupt topic changes (number)
            - misunderstandings: Count of apparent misunderstandings (number)
            - transfersRequested: Count of times transfer was requested (number)
            
            Respond with JSON:
            {
              "wasSmooth": true,
              "interruptions": 0,
              "misunderstandings": 1,
              "transfersRequested": 0
            }`
          },
          { role: "user", content: fullConversation }
        ],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content!);
    } catch (error) {
      console.error("Conversation flow analysis error:", error);
      return {
        wasSmooth: true,
        interruptions: 0,
        misunderstandings: 0,
        transfersRequested: 0
      };
    }
  }

  private async evaluateAIPerformance(conversationHistory: any[]): Promise<any> {
    const fullConversation = conversationHistory
      .map(turn => `${turn.role}: ${turn.content}`)
      .join('\n');

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Evaluate the AI's performance in this conversation on a scale of 0-1:
            - intentAccuracy: How well did the AI understand user intents?
            - responseRelevance: How relevant were the AI's responses?
            - personalityConsistency: How consistent was the AI's personality?
            - problemResolution: Was the user's problem resolved? (boolean)
            
            Respond with JSON:
            {
              "intentAccuracy": 0.8,
              "responseRelevance": 0.9,
              "personalityConsistency": 0.8,
              "problemResolution": true
            }`
          },
          { role: "user", content: fullConversation }
        ],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content!);
    } catch (error) {
      console.error("AI performance evaluation error:", error);
      return {
        intentAccuracy: 0.7,
        responseRelevance: 0.7,
        personalityConsistency: 0.7,
        problemResolution: false
      };
    }
  }

  private async analyzeOutcomes(conversationHistory: any[]): Promise<any> {
    const fullConversation = conversationHistory
      .map(turn => `${turn.role}: ${turn.content}`)
      .join('\n');

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Analyze the conversation outcomes:
            - satisfaction: User satisfaction level (0-1)
            - goalAchieved: Was the user's goal achieved? (boolean)
            - followUpRequired: Is follow-up needed? (boolean)
            - escalationNeeded: Should this be escalated? (boolean)
            
            Respond with JSON:
            {
              "satisfaction": 0.8,
              "goalAchieved": true,
              "followUpRequired": false,
              "escalationNeeded": false
            }`
          },
          { role: "user", content: fullConversation }
        ],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content!);
    } catch (error) {
      console.error("Outcome analysis error:", error);
      return {
        satisfaction: 0.7,
        goalAchieved: false,
        followUpRequired: true,
        escalationNeeded: false
      };
    }
  }

  private async generateRecommendations(analytics: any): Promise<string[]> {
    const recommendations = [];

    // Sentiment-based recommendations
    const avgSentiment = analytics.sentimentProgression.reduce((sum: number, item: any) => {
      return sum + (item.sentiment === 'positive' ? 1 : item.sentiment === 'negative' ? -1 : 0);
    }, 0) / analytics.sentimentProgression.length;

    if (avgSentiment < -0.3) {
      recommendations.push("Consider using more empathetic language patterns");
      recommendations.push("Implement proactive apology and understanding phrases");
    }

    // Flow-based recommendations
    if (analytics.conversationFlow.misunderstandings > 2) {
      recommendations.push("Improve intent recognition accuracy");
      recommendations.push("Add clarification questions for ambiguous requests");
    }

    if (analytics.conversationFlow.interruptions > 1) {
      recommendations.push("Reduce response length for smoother conversation flow");
      recommendations.push("Implement better turn-taking protocols");
    }

    // Performance-based recommendations
    if (analytics.aiPerformance.intentAccuracy < 0.7) {
      recommendations.push("Enhance training data for better intent recognition");
    }

    if (analytics.aiPerformance.responseRelevance < 0.7) {
      recommendations.push("Improve context awareness in response generation");
    }

    // Outcome-based recommendations
    if (!analytics.outcomeMetrics.goalAchieved) {
      recommendations.push("Review conversation paths for goal achievement");
      recommendations.push("Consider earlier human agent transfer protocols");
    }

    if (analytics.outcomeMetrics.satisfaction < 0.6) {
      recommendations.push("Focus on improving user experience and satisfaction");
      recommendations.push("Consider personality adjustments for better rapport");
    }

    return recommendations.length > 0 ? recommendations : ["Conversation performed well - maintain current approach"];
  }

  private async storeAnalytics(analytics: ConversationAnalytics): Promise<void> {
    // Store in database - this would need to be implemented in the storage layer
    console.log("Storing conversation analytics:", analytics.callSid);
  }

  async getInsights(organizationId: string, timeRange: { start: Date; end: Date }): Promise<ConversationInsights> {
    // This would query the database for analytics within the time range
    // For now, return mock insights
    return {
      totalCalls: 150,
      averageDuration: 240,
      satisfactionTrend: [
        { date: "2025-07-01", averageSatisfaction: 0.78, callCount: 25 },
        { date: "2025-07-02", averageSatisfaction: 0.82, callCount: 30 },
        { date: "2025-07-03", averageSatisfaction: 0.85, callCount: 28 }
      ],
      topIssues: [
        { category: "Technical Support", frequency: 45, averageResolutionTime: 180 },
        { category: "Billing Inquiry", frequency: 32, averageResolutionTime: 120 },
        { category: "Sales Information", frequency: 28, averageResolutionTime: 200 }
      ],
      voicePersonalityPerformance: [
        { personalityId: "friendly_receptionist", usage: 60, satisfaction: 0.84, effectiveness: 0.78 },
        { personalityId: "professional_assistant", usage: 30, satisfaction: 0.81, effectiveness: 0.82 },
        { personalityId: "empathetic_support", usage: 10, satisfaction: 0.89, effectiveness: 0.85 }
      ],
      emotionalAnalysis: {
        mostCommonEmotion: "neutral",
        emotionalJourney: [
          { emotion: "frustrated", frequency: 25, averageOutcome: 0.72 },
          { emotion: "neutral", frequency: 60, averageOutcome: 0.80 },
          { emotion: "satisfied", frequency: 15, averageOutcome: 0.95 }
        ]
      },
      improvementAreas: [
        {
          area: "Intent Recognition",
          priority: "high",
          impact: 0.85,
          recommendations: [
            "Enhance training data with more diverse examples",
            "Implement better context understanding"
          ]
        },
        {
          area: "Voice Naturalness",
          priority: "medium",
          impact: 0.65,
          recommendations: [
            "Fine-tune speech synthesis parameters",
            "Add more natural speech patterns"
          ]
        }
      ]
    };
  }
}

export const conversationAnalyzer = new ConversationAnalyzer();

/**
 * Process a call recording and return conversation analysis
 * Used by Twilio webhook handlers for post-call processing
 */
export async function processCallRecording(
  callId: number,
  recordingUrl: string,
  transcription: string,
  callerPhone: string,
  duration: number
): Promise<{
  conversationBreakdown: any[];
  sentiment: string;
  keyTopics: string[];
  actionItems: string[];
  summary: string;
}> {
  try {
    // Parse transcription into conversation turns
    const conversationHistory = parseTranscriptionToTurns(transcription, callerPhone);
    
    // Analyze the conversation using call ID as string
    const analysis = await conversationAnalyzer.analyzeConversation(
      String(callId),
      callerPhone,
      conversationHistory
    );
    
    // Calculate overall sentiment from sentiment progression
    const positiveSentiments = analysis.sentimentProgression.filter(s => s.sentiment === 'positive').length;
    const negativeSentiments = analysis.sentimentProgression.filter(s => s.sentiment === 'negative').length;
    const totalSentiments = analysis.sentimentProgression.length || 1;
    const sentimentScore = (positiveSentiments - negativeSentiments) / totalSentiments;
    
    // Calculate overall quality from metrics
    const overallQuality = (
      analysis.voiceQualityMetrics.clarity +
      analysis.voiceQualityMetrics.naturalness +
      analysis.aiPerformance.responseRelevance +
      analysis.outcomeMetrics.satisfaction
    ) / 4;
    
    // Extract key topics from emotion and flow analysis
    const keyTopics: string[] = [];
    if (analysis.emotionDetection.primary) keyTopics.push(analysis.emotionDetection.primary);
    if (analysis.emotionDetection.secondary) keyTopics.push(analysis.emotionDetection.secondary);
    if (analysis.outcomeMetrics.goalAchieved) keyTopics.push('Goal Achieved');
    if (analysis.outcomeMetrics.escalationNeeded) keyTopics.push('Escalation Required');
    
    // Extract relevant data from analysis
    return {
      conversationBreakdown: conversationHistory,
      sentiment: sentimentScore > 0.2 ? 'positive' : sentimentScore < -0.2 ? 'negative' : 'neutral',
      keyTopics: keyTopics.slice(0, 5),
      actionItems: analysis.recommendations?.slice(0, 5) || [],
      summary: `Call with ${callerPhone} lasting ${Math.round(duration / 60)} minutes. ${
        overallQuality > 0.7 ? 'High quality interaction.' : 
        overallQuality > 0.4 ? 'Standard interaction.' : 
        'Needs follow-up.'
      }`
    };
  } catch (error) {
    console.error('Error processing call recording:', error);
    // Return basic analysis on error
    return {
      conversationBreakdown: [],
      sentiment: 'neutral',
      keyTopics: [],
      actionItems: [],
      summary: `Call with ${callerPhone} lasting ${Math.round(duration / 60)} minutes.`
    };
  }
}

/**
 * Parse raw transcription text into conversation turns
 */
function parseTranscriptionToTurns(transcription: string, callerPhone: string): any[] {
  if (!transcription || transcription.trim().length === 0) {
    return [];
  }
  
  // Simple parsing - split by sentences and alternate between caller/AI
  const sentences = transcription.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const turns: any[] = [];
  
  sentences.forEach((sentence, index) => {
    turns.push({
      speaker: index % 2 === 0 ? 'caller' : 'ai',
      message: sentence.trim(),
      timestamp: new Date(Date.now() - (sentences.length - index) * 5000).toISOString(),
      sentiment: 'neutral'
    });
  });
  
  return turns;
}