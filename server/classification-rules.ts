import type { CallClass, Classification } from "./classification-service";

// Scam/robocall phrases that appear verbatim in the overwhelming majority of
// spam transcripts. Matched case-insensitively against the first utterance.
const SPAM_PHRASES: Array<{ phrase: RegExp; reason: string }> = [
  { phrase: /\b(auto|vehicle|car)\s+(extended\s+)?warranty\b/i, reason: "auto warranty scam" },
  { phrase: /\bfinal\s+notice\b/i, reason: "urgency-scam opener" },
  { phrase: /\bsocial\s+security\s+(number|administration)\b/i, reason: "SSN scam" },
  { phrase: /\b(irs|tax)\s+(refund|lawsuit|warrant|levy)\b/i, reason: "IRS scam" },
  { phrase: /\bmedicare\s+(benefit|card|discount)\b/i, reason: "medicare scam" },
  { phrase: /\bstudent\s+loan\s+(forgiveness|relief)\b/i, reason: "student-loan scam" },
  { phrase: /\b(solar|photovoltaic)\s+(panel|incentive|program)\b/i, reason: "solar cold-call" },
  { phrase: /\bhome\s+warranty\b/i, reason: "home warranty scam" },
  { phrase: /\bwinner|won\s+a\s+(prize|cruise|gift\s+card|sweepstake)\b/i, reason: "prize scam" },
  { phrase: /\b(google|bing)\s+business\s+(listing|profile|verification)\b/i, reason: "listing scam" },
  { phrase: /\bcredit\s+card\s+(rate|debt)\s+(reduction|relief)\b/i, reason: "credit-card scam" },
  { phrase: /\bfinal\s+opportunity\b.*\b(lower|reduce)\s+rate\b/i, reason: "rate-reduction scam" },
  { phrase: /\bpress\s+[0-9]\s+to\s+(speak|be\s+removed|opt)/i, reason: "robocall IVR prompt" },
];

// Phrases that strongly suggest an AI/bot is the caller
const AI_BOT_PHRASES: Array<{ phrase: RegExp; reason: string }> = [
  { phrase: /^(hello|hi)[,.\s]+this\s+is\s+an?\s+(automated|recorded|virtual)/i, reason: "self-identifies as automated" },
  { phrase: /\bthis\s+call\s+may\s+be\s+recorded\s+for\s+quality\b/i, reason: "pre-recorded disclosure opener" },
  { phrase: /\bi\s+am\s+an?\s+(ai|artificial\s+intelligence|virtual)\s+assistant\b/i, reason: "AI self-ID" },
  { phrase: /\bcalling\s+on\s+behalf\s+of\b.*\b(do\s+not\s+call|dnc)\b/i, reason: "on-behalf-of robocaller" },
];

// A confident legit signal — people calling for specific people/places usually real
const LEGIT_HINTS: RegExp[] = [
  /\bis\s+(nir|annie|\w+)\s+(there|available|in)\b/i,
  /\bi'?m\s+calling\s+(about|regarding)\s+my\b/i,
  /\b(appointment|reservation|order)\s+#?\d+\b/i,
  /\bi\s+have\s+an?\s+(appointment|meeting|question)\b/i,
];

export interface RuleVerdict {
  /** "decided" means we're confident without asking the LLM. "uncertain" → escalate. */
  decided: boolean;
  classification?: Classification;
}

/**
 * Cheap rule-based pre-filter. Returns a decision only when signal is strong;
 * otherwise returns `decided: false` so the caller escalates to the LLM.
 */
export function classifyByRules(
  firstUtterance: string,
  metadata: { fromNumber: string; callerName?: string | null; isKnownContact: boolean }
): RuleVerdict {
  const text = (firstUtterance || "").trim();

  if (metadata.isKnownContact) {
    return {
      decided: true,
      classification: { label: "legit", confidence: 0.95, reason: "known contact" },
    };
  }

  if (!text) {
    // No words spoken — can't rule-match. Let LLM (or fallback) decide.
    return { decided: false };
  }

  for (const { phrase, reason } of AI_BOT_PHRASES) {
    if (phrase.test(text)) {
      return {
        decided: true,
        classification: { label: "ai_bot", confidence: 0.9, reason: `rule: ${reason}` },
      };
    }
  }

  for (const { phrase, reason } of SPAM_PHRASES) {
    if (phrase.test(text)) {
      return {
        decided: true,
        classification: { label: "spam", confidence: 0.9, reason: `rule: ${reason}` },
      };
    }
  }

  for (const hint of LEGIT_HINTS) {
    if (hint.test(text)) {
      return {
        decided: true,
        classification: { label: "legit", confidence: 0.8, reason: "rule: specific-intent phrasing" },
      };
    }
  }

  return { decided: false };
}
