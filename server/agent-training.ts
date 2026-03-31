import { storage } from "./storage";
import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AgentTrainingData {
  agentId: string;
  scenarios: TrainingScenario[];
  knowledgeBase: KnowledgeEntry[];
  tools: AgentTool[];
  responseGuidelines: ResponseGuideline[];
}

export interface TrainingScenario {
  id: string;
  title: string;
  customerInput: string;
  expectedResponse: string;
  context: string;
  tags: string[];
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

export interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
  priority: number;
}

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  usage_examples: string[];
}

export interface ResponseGuideline {
  id: string;
  situation: string;
  guideline: string;
  examples: string[];
}

export class AgentTrainingManager {
  private trainingData: Map<string, AgentTrainingData> = new Map();

  constructor() {
    this.initializeDefaultTraining();
  }

  private initializeDefaultTraining() {
    // AI Receptionist Training
    this.trainingData.set('ai-receptionist', {
      agentId: 'ai-receptionist',
      scenarios: [
        {
          id: 'greeting-basic',
          title: 'Basic Greeting',
          customerInput: 'Hello',
          expectedResponse: 'Hello! Thank you for calling. This is Maya, your AI assistant. How may I help you today?',
          context: 'Initial call greeting',
          tags: ['greeting', 'basic'],
          difficulty: 'basic'
        },
        {
          id: 'business-hours',
          title: 'Business Hours Inquiry',
          customerInput: 'What are your business hours?',
          expectedResponse: 'Our business hours are Monday through Friday, 9 AM to 6 PM Eastern Time. We also offer 24/7 support through our AI system. Is there something specific I can help you with today?',
          context: 'Information request',
          tags: ['hours', 'information'],
          difficulty: 'basic'
        },
        {
          id: 'frustrated-caller',
          title: 'Handling Frustrated Caller',
          customerInput: 'I\'ve been trying to reach someone for hours! This is ridiculous!',
          expectedResponse: 'I completely understand your frustration, and I apologize for the difficulty you\'ve experienced reaching us. Let me help you right away. What can I assist you with today?',
          context: 'Emotional de-escalation',
          tags: ['frustrated', 'empathy', 'de-escalation'],
          difficulty: 'intermediate'
        }
      ],
      knowledgeBase: [
        {
          id: 'company-info',
          category: 'Company Information',
          title: 'Basic Company Details',
          content: 'AI-powered communication platform specializing in intelligent call routing and customer service automation.',
          keywords: ['company', 'about', 'services'],
          priority: 10
        }
      ],
      tools: [
        {
          id: 'transfer-call',
          name: 'Transfer Call',
          description: 'Transfer caller to appropriate department or agent',
          parameters: { department: 'string', urgency: 'string' },
          usage_examples: ['Transfer sales inquiry to sales team', 'Transfer technical issue to support']
        },
        {
          id: 'schedule-callback',
          name: 'Schedule Callback',
          description: 'Schedule a callback for the customer',
          parameters: { preferred_time: 'string', phone_number: 'string', reason: 'string' },
          usage_examples: ['Schedule callback for detailed consultation', 'Schedule technical support callback']
        }
      ],
      responseGuidelines: [
        {
          id: 'greeting-protocol',
          situation: 'Initial call greeting',
          guideline: 'Always identify yourself as Maya and ask how you can help',
          examples: ['Hello! Thank you for calling. This is Maya, your AI assistant. How may I help you today?']
        }
      ]
    });

    // Sales Agent Training  
    this.trainingData.set('sales-agent', {
      agentId: 'sales-agent',
      scenarios: [
        {
          id: 'pricing-inquiry',
          title: 'RapidRMS Pricing Question',
          customerInput: 'How much does RapidRMS cost for a small restaurant?',
          expectedResponse: 'Great question! For a small restaurant, our Starter plan at $79 per month would be perfect. It includes up to 3 POS terminals, full inventory management, and staff scheduling. Can you tell me a bit about your restaurant - how many terminals do you currently use?',
          context: 'Initial pricing discussion',
          tags: ['pricing', 'rapidrms', 'small-business'],
          difficulty: 'basic'
        },
        {
          id: 'roi-calculation',
          title: 'ROI Discussion',
          customerInput: 'How will this save us money?',
          expectedResponse: 'Excellent question! Most restaurants see 15-25% operational cost reduction. For example, automated inventory prevents over-ordering and waste, staff scheduling optimization reduces labor costs, and integrated payments eliminate processing fees. What\'s your current monthly operating cost for POS and management systems?',
          context: 'Value proposition discussion',
          tags: ['roi', 'benefits', 'cost-savings'],
          difficulty: 'intermediate'
        }
      ],
      knowledgeBase: [
        {
          id: 'rapidrms-features',
          category: 'Product Features',
          title: 'RapidRMS Core Features',
          content: 'POS system, inventory management, staff scheduling, CRM, financial reporting, multi-location support, mobile apps, third-party integrations',
          keywords: ['features', 'pos', 'inventory', 'scheduling'],
          priority: 10
        },
        {
          id: 'pricing-tiers',
          category: 'Pricing',
          title: 'RapidRMS Pricing Structure',
          content: 'Starter: $79/month (3 terminals), Professional: $149/month (unlimited terminals), Enterprise: Custom (10+ locations)',
          keywords: ['pricing', 'cost', 'plans'],
          priority: 10
        }
      ],
      tools: [
        {
          id: 'schedule-demo',
          name: 'Schedule Demo',
          description: 'Schedule a product demonstration',
          parameters: { date: 'string', time: 'string', contact_info: 'object' },
          usage_examples: ['Schedule live demo for restaurant owner']
        },
        {
          id: 'send-pricing-info',
          name: 'Send Pricing Information',
          description: 'Email detailed pricing and features',
          parameters: { email: 'string', business_size: 'string' },
          usage_examples: ['Send customized pricing for multi-location restaurant']
        }
      ],
      responseGuidelines: [
        {
          id: 'consultative-approach',
          situation: 'Any sales interaction',
          guideline: 'Ask questions to understand their business needs before proposing solutions',
          examples: ['What challenges are you facing with your current POS system?']
        }
      ]
    });

    // Support Agent Training
    this.trainingData.set('support-agent', {
      agentId: 'support-agent',
      scenarios: [
        {
          id: 'pos-connection-issue',
          title: 'POS Terminal Not Connecting',
          customerInput: 'My POS terminal won\'t connect to the system',
          expectedResponse: 'I can help you with that connection issue. Let\'s start with some basic troubleshooting. First, can you confirm the terminal is powered on and connected to your network? Also, are you seeing any specific error messages on the screen?',
          context: 'Technical troubleshooting',
          tags: ['pos', 'connection', 'troubleshooting'],
          difficulty: 'intermediate'
        },
        {
          id: 'payment-processing-error',
          title: 'Payment Processing Problem',
          customerInput: 'Credit card payments are being declined but the cards are valid',
          expectedResponse: 'That\'s definitely frustrating when valid cards are declined. Let\'s check your payment gateway settings. Can you tell me what error message you\'re seeing? Also, is this happening with all cards or specific types like Visa, Mastercard, etc.?',
          context: 'Payment troubleshooting',
          tags: ['payments', 'declined', 'gateway'],
          difficulty: 'advanced'
        }
      ],
      knowledgeBase: [
        {
          id: 'common-solutions',
          category: 'Troubleshooting',
          title: 'Common RapidRMS Issues and Solutions',
          content: 'POS connection: check network and firewall. Payment issues: verify gateway credentials. Inventory sync: check automatic sync settings.',
          keywords: ['troubleshooting', 'solutions', 'problems'],
          priority: 10
        }
      ],
      tools: [
        {
          id: 'run-diagnostic',
          name: 'Run System Diagnostic',
          description: 'Run automated diagnostic on customer system',
          parameters: { system_id: 'string', test_type: 'string' },
          usage_examples: ['Run connection test for POS terminal']
        },
        {
          id: 'escalate-to-level2',
          name: 'Escalate to Level 2',
          description: 'Escalate complex technical issues',
          parameters: { issue_description: 'string', urgency: 'string' },
          usage_examples: ['Escalate hardware failure to Level 2 support']
        }
      ],
      responseGuidelines: [
        {
          id: 'methodical-approach',
          situation: 'Technical troubleshooting',
          guideline: 'Follow structured diagnostic approach and confirm each step',
          examples: ['Let\'s start with basic checks and work our way up']
        }
      ]
    });
  }

  async trainAgent(agentId: string, scenario: TrainingScenario): Promise<{
    score: number;
    feedback: string;
    suggestions: string[];
  }> {
    try {
      const trainingData = this.trainingData.get(agentId);
      if (!trainingData) {
        throw new Error(`No training data found for agent: ${agentId}`);
      }

      // Use OpenAI to evaluate the response
      const evaluation = await this.evaluateResponse(scenario, trainingData);
      
      // Store training results in knowledge base for future learning
      await this.storeTrainingResult(agentId, scenario, evaluation);

      return evaluation;
    } catch (error) {
      console.error('Error training agent:', error);
      throw error;
    }
  }

  private async evaluateResponse(scenario: TrainingScenario, trainingData: AgentTrainingData): Promise<{
    score: number;
    feedback: string;
    suggestions: string[];
  }> {
    const prompt = `
      Evaluate this AI agent training scenario:
      
      Customer Input: "${scenario.customerInput}"
      Expected Response: "${scenario.expectedResponse}"
      Context: ${scenario.context}
      
      Agent Guidelines:
      ${trainingData.responseGuidelines.map(g => `- ${g.situation}: ${g.guideline}`).join('\n')}
      
      Evaluate on a scale of 1-100 and provide specific feedback and improvement suggestions.
      Respond in JSON format:
      {
        "score": number,
        "feedback": "string",
        "suggestions": ["string1", "string2"]
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  private async storeTrainingResult(agentId: string, scenario: TrainingScenario, evaluation: any): Promise<void> {
    try {
      await storage.createKnowledgeBase({
        title: `Training Result: ${scenario.title}`,
        content: `Scenario: ${scenario.customerInput}\nScore: ${evaluation.score}\nFeedback: ${evaluation.feedback}`,
        source: 'agent-training',
        tags: ['training', agentId, ...scenario.tags],
        documentType: 'training-result'
      });
    } catch (error) {
      console.error('Error storing training result:', error);
    }
  }

  getTrainingData(agentId: string): AgentTrainingData | undefined {
    return this.trainingData.get(agentId);
  }

  addTrainingScenario(agentId: string, scenario: TrainingScenario): boolean {
    const data = this.trainingData.get(agentId);
    if (!data) return false;
    
    data.scenarios.push(scenario);
    return true;
  }

  addKnowledgeEntry(agentId: string, knowledge: KnowledgeEntry): boolean {
    const data = this.trainingData.get(agentId);
    if (!data) return false;
    
    data.knowledgeBase.push(knowledge);
    return true;
  }

  getAllAgentTrainingData(): Record<string, AgentTrainingData> {
    const result: Record<string, AgentTrainingData> = {};
    this.trainingData.forEach((data, agentId) => {
      result[agentId] = data;
    });
    return result;
  }

  async generateTrainingScenarios(agentId: string, topic: string, count: number = 3): Promise<TrainingScenario[]> {
    const prompt = `
      Generate ${count} training scenarios for a ${agentId.replace('-', ' ')} AI agent on the topic: ${topic}
      
      Each scenario should include realistic customer inputs and appropriate responses.
      Focus on practical situations the agent would commonly encounter.
      
      Return JSON array of scenarios with this format:
      [
        {
          "id": "unique-id",
          "title": "Scenario Title",
          "customerInput": "What the customer says",
          "expectedResponse": "How the agent should respond",
          "context": "Situation context",
          "tags": ["tag1", "tag2"],
          "difficulty": "basic|intermediate|advanced"
        }
      ]
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{"scenarios": []}');
    return result.scenarios || [];
  }
}

export const agentTrainingManager = new AgentTrainingManager();