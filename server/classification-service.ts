import { openai } from "./openai";
import { classifyByRules } from "./classification-rules";

export type CallClass = "legit" | "spam" | "ai_bot";
export type ClassifierProvenance = "rules" | "shre-local" | "cloud-openai" | "default";

export interface Classification {
  label: CallClass;
  confidence: number;
  reason: string;
  provenance?: ClassifierProvenance;
}

const SYSTEM_PROMPT = `You are a call-screening classifier. Given the caller's first utterance and metadata, decide if the call is:
- "legit": a real human with a genuine reason (personal, business, customer support, sales enquiry, appointment, etc.)
- "spam": robocalls, warranty scams, IRS/tax threats, solar/insurance cold-dial scripts, prize/contest notifications, debt collection from unknown parties
- "ai_bot": an automated agent (press-1 menus, synthesized voice reading a script, long pre-recorded silence followed by TTS, another AI assistant calling)

Return JSON only: { "label": "...", "confidence": 0.0-1.0, "reason": "short explanation" }

Err toward "legit" when uncertain. Only classify as spam/ai_bot with confidence >= 0.7 if the signals are clear.`;

const SHRE_ROUTER_URL = process.env.SHRE_ROUTER_URL || "http://127.0.0.1:5497";
const SHRE_ROUTER_TIMEOUT_MS = Number(process.env.SHRE_ROUTER_TIMEOUT_MS || 3500);
const SHRE_AGENT_ID = process.env.SHRE_AGENT_ID || "annie";
const SHRE_CHANNEL = process.env.SHRE_CHANNEL || "ai-call-assistant";

export async function classifyCaller(
  firstUtterance: string,
  metadata: { fromNumber: string; callerName?: string | null; isKnownContact: boolean }
): Promise<Classification> {
  const safeUtterance = (firstUtterance || "").trim().slice(0, 500);

  // Tier 1: rules (free, zero-latency, deterministic)
  const ruleVerdict = classifyByRules(safeUtterance, metadata);
  if (ruleVerdict.decided && ruleVerdict.classification) {
    return { ...ruleVerdict.classification, provenance: "rules" };
  }

  if (!safeUtterance) {
    return {
      label: "legit",
      confidence: 0.3,
      reason: "no utterance captured",
      provenance: "default",
    };
  }

  const userPrompt = `From: ${metadata.fromNumber}\nCaller ID name: ${metadata.callerName || "unknown"}\nFirst utterance: "${safeUtterance}"`;

  // Tier 2: shre-router (local, free, training-clean)
  const shreResult = await tryShreRouter(userPrompt);
  if (shreResult) return shreResult;

  // Tier 3: OpenAI fallback (cloud, costs $, tagged for provenance firewall)
  return tryOpenAI(userPrompt);
}

async function tryShreRouter(userPrompt: string): Promise<Classification | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SHRE_ROUTER_TIMEOUT_MS);

  try {
    const res = await fetch(`${SHRE_ROUTER_URL}/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-channel": SHRE_CHANNEL,
        ...(process.env.SHRE_ROUTER_KEY ? { Authorization: `Bearer ${process.env.SHRE_ROUTER_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: "auto",
        agentId: SHRE_AGENT_ID,
        metadata: { taskType: "call-classification" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`shre-router classifier returned ${res.status}, falling back to OpenAI`);
      return null;
    }

    const data = await res.json();
    const text =
      data.content?.[0]?.text ||
      data.message?.content ||
      data.choices?.[0]?.message?.content ||
      "{}";
    const parsed = JSON.parse(text) as Partial<Classification>;
    return normalize(parsed, "shre-local");
  } catch (err) {
    console.warn("shre-router classifier unreachable, falling back to OpenAI:", (err as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function tryOpenAI(userPrompt: string): Promise<Classification> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as Partial<Classification>;
    return normalize(parsed, "cloud-openai");
  } catch (err) {
    console.error("OpenAI classifier failed, defaulting to legit:", err);
    return {
      label: "legit",
      confidence: 0.0,
      reason: "both shre-router + OpenAI failed — failed open",
      provenance: "default",
    };
  }
}

function normalize(parsed: Partial<Classification>, provenance: ClassifierProvenance): Classification {
  const label: CallClass =
    parsed.label === "spam" || parsed.label === "ai_bot" ? parsed.label : "legit";
  const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;
  const reason = parsed.reason || "no reason given";
  return { label, confidence, reason, provenance };
}

export function shouldSilentDrop(c: Classification): boolean {
  return (c.label === "spam" || c.label === "ai_bot") && c.confidence >= 0.7;
}
