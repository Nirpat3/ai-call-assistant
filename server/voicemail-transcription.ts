import OpenAI from "openai";
import fetch from "node-fetch";
import { storage } from "./storage";
import twilio from "twilio";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize Twilio client for authenticated requests
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export interface VoicemailTranscription {
  transcription: string;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent';
  confidence: number;
  keyPoints: string[];
  actionRequired: boolean;
  category: 'inquiry' | 'complaint' | 'appointment' | 'sales' | 'support' | 'other';
}

/**
 * Transcribes and analyzes a voicemail recording using OpenAI Whisper
 */
export async function transcribeVoicemail(recordingUrl: string): Promise<VoicemailTranscription> {
  try {
    // Download the audio file with Twilio authentication
    const authHeader = 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    
    const audioResponse = await fetch(recordingUrl, {
      headers: {
        'Authorization': authHeader
      }
    });
    
    if (!audioResponse.ok) {
      throw new Error(`Failed to download recording: ${audioResponse.statusText}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioFile = new File([audioBuffer], 'voicemail.wav', { type: 'audio/wav' });

    // Transcribe using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
      prompt: "This is a voicemail message. Please transcribe clearly including any phone numbers, names, or important details.",
    });

    const transcribedText = transcription.text;

    // Analyze the transcription using GPT-4o
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert voicemail analyst. Analyze the following voicemail transcription and provide:
1. A clear, concise summary (2-3 sentences)
2. Sentiment analysis (positive/neutral/negative/urgent)
3. Confidence score (0-1)
4. Key points (up to 5 bullet points)
5. Whether action is required (true/false)
6. Category classification

Respond with JSON in this exact format:
{
  "summary": "string",
  "sentiment": "positive|neutral|negative|urgent",
  "confidence": number,
  "keyPoints": ["string"],
  "actionRequired": boolean,
  "category": "inquiry|complaint|appointment|sales|support|other"
}`
        },
        {
          role: "user",
          content: `Please analyze this voicemail transcription: "${transcribedText}"`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const analysis = JSON.parse(analysisResponse.choices[0].message.content || '{}');

    return {
      transcription: transcribedText,
      summary: analysis.summary || "No summary available",
      sentiment: analysis.sentiment || "neutral",
      confidence: Math.max(0, Math.min(1, analysis.confidence || 0.8)),
      keyPoints: Array.isArray(analysis.keyPoints) ? analysis.keyPoints : [],
      actionRequired: Boolean(analysis.actionRequired),
      category: analysis.category || "other"
    };

  } catch (error) {
    console.error("Error transcribing voicemail:", error);
    console.error("Error details:", {
      message: (error as Error).message,
      stack: (error as Error).stack,
      recordingUrl
    });
    
    // For development, provide more specific error messages
    let errorMessage = "Transcription failed - please check the recording manually";
    let summary = "Unable to process voicemail automatically";
    
    if ((error as any).status === 401 || (error as any).message?.includes('unauthorized')) {
      errorMessage = "Authentication failed - please check API credentials";
      summary = "API authentication error occurred";
    } else if ((error as any).status === 429) {
      errorMessage = "Rate limit exceeded - please try again later";
      summary = "Too many requests to transcription service";
    } else if ((error as any).message?.includes('quota')) {
      errorMessage = "API quota exceeded - please check your OpenAI usage";
      summary = "Transcription quota exceeded";
    }
    
    // Return basic structure with error info
    return {
      transcription: errorMessage,
      summary: summary,
      sentiment: "neutral",
      confidence: 0,
      keyPoints: ["Manual review required"],
      actionRequired: true,
      category: "other"
    };
  }
}

/**
 * Process a voicemail recording and update the database
 */
export async function processVoicemailRecording(voicemailId: number, recordingUrl: string): Promise<void> {
  try {
    console.log(`Processing voicemail ${voicemailId} from ${recordingUrl}`);
    
    const analysis = await transcribeVoicemail(recordingUrl);
    
    // Update the voicemail in the database
    await storage.updateVoicemail(voicemailId, {
      transcription: analysis.transcription,
      summary: analysis.summary,
      processed: true
    });

    console.log(`Successfully processed voicemail ${voicemailId}`);
    
  } catch (error) {
    console.error(`Error processing voicemail ${voicemailId}:`, error);
    
    // Mark as processed with error
    await storage.updateVoicemail(voicemailId, {
      transcription: "Processing failed",
      summary: "Unable to process this voicemail",
      processed: true
    });
  }
}

/**
 * Batch process unprocessed voicemails
 */
export async function processUnprocessedVoicemails(): Promise<void> {
  try {
    const voicemails = await storage.getVoicemails();
    const unprocessed = voicemails.filter(vm => !vm.processed && vm.recordingUrl);
    
    console.log(`Found ${unprocessed.length} unprocessed voicemails`);
    
    for (const voicemail of unprocessed) {
      await processVoicemailRecording(voicemail.id, voicemail.recordingUrl);
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error) {
    console.error("Error processing unprocessed voicemails:", error);
  }
}