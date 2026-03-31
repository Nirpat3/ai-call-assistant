import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export { openai };

export async function transcribeAudio(audioUrl: string): Promise<string> {
  try {
    // Download audio file and transcribe
    const response = await fetch(audioUrl);
    const audioBuffer = await response.arrayBuffer();
    const audioFile = new File([audioBuffer], "audio.wav", { type: "audio/wav" });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    return transcription.text;
  } catch (error) {
    console.error("Transcription failed:", error);
    throw new Error("Failed to transcribe audio");
  }
}

export async function summarizeCall(transcription: string, callerInfo?: string): Promise<string> {
  try {
    const prompt = `Please provide a concise summary of this phone call transcription. Include the main purpose of the call, key points discussed, and any action items or follow-up needed. Keep it professional and under 150 words.

${callerInfo ? `Caller: ${callerInfo}\n` : ""}
Transcription: ${transcription}

Respond with JSON in this format: { "summary": "your summary here" }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional call summarization assistant. Provide clear, concise summaries of phone calls."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.summary || "Unable to generate summary";
  } catch (error) {
    console.error("Summarization failed:", error);
    
    // Handle API quota exceeded gracefully
    if ((error as any).status === 429 || (error as any).code === 'insufficient_quota') {
      return `Call summary unavailable (API quota exceeded). Manual review needed for: ${transcription.slice(0, 100)}...`;
    }
    
    throw new Error("Failed to generate call summary");
  }
}

export async function analyzeCallIntent(transcription: string): Promise<{
  intent: string;
  keywords: string[];
  priority: "low" | "medium" | "high";
  suggestedRoute?: string;
}> {
  try {
    const prompt = `Analyze this call transcription to determine the caller's intent, extract key keywords, assess priority level, and suggest routing.

Transcription: ${transcription}

Respond with JSON in this format:
{
  "intent": "brief description of what the caller wants",
  "keywords": ["extracted", "keywords"],
  "priority": "low|medium|high",
  "suggestedRoute": "sales|support|general|urgent"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a call routing assistant that analyzes call content to determine intent and routing needs."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      intent: result.intent || "General inquiry",
      keywords: result.keywords || [],
      priority: result.priority || "medium",
      suggestedRoute: result.suggestedRoute
    };
  } catch (error) {
    console.error("Intent analysis failed:", error);
    
    // Handle API quota exceeded gracefully
    if ((error as any).status === 429 || (error as any).code === 'insufficient_quota') {
      return {
        intent: "general_inquiry",
        keywords: [],
        priority: "medium",
        suggestedRoute: "general"
      };
    }
    
    return {
      intent: "General inquiry",
      keywords: [],
      priority: "medium"
    };
  }
}

export async function generateCallResponse(intent: string, businessHours: any): Promise<string> {
  try {
    const isBusinessHours = checkBusinessHours(businessHours);
    
    const prompt = `Generate an appropriate AI assistant response for a caller with this intent: "${intent}"
    
Current business status: ${isBusinessHours ? "During business hours" : "Outside business hours"}

The response should be professional, helpful, and either:
- Route them to the appropriate department during business hours
- Take a message and explain next steps outside business hours
- Provide relevant information if it's a simple inquiry

Keep the response under 50 words and conversational.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional AI call assistant. Generate appropriate responses for callers."
        },
        {
          role: "user",
          content: prompt
        }
      ],
    });

    return response.choices[0].message.content || "Thank you for calling. How can I help you today?";
  } catch (error) {
    console.error("Response generation failed:", error);
    return "Thank you for calling. How can I help you today?";
  }
}

function checkBusinessHours(businessHours: any): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  if (!businessHours?.days?.includes(currentDay)) {
    return false;
  }
  
  const startHour = parseInt(businessHours.start?.split(':')[0] || '6');
  const endHour = parseInt(businessHours.end?.split(':')[0] || '23');
  
  return currentHour >= startHour && currentHour < endHour;
}
