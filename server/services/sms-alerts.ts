import twilio from 'twilio';

const OWNER_PHONE = '+17066762576';

let twilioClient: any = null;
let twilioFromNumber: string | null = null;

function getTwilioClient() {
  if (!twilioClient) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (sid && token && sid.startsWith('AC')) {
      twilioClient = twilio(sid, token);
      twilioFromNumber = from || null;
    }
  }
  return { client: twilioClient, from: twilioFromNumber };
}

async function sendSmsAlert(message: string): Promise<boolean> {
  const { client, from } = getTwilioClient();
  if (!client || !from) {
    console.log(`[SMS Alert] Twilio not configured — would have sent: ${message}`);
    return false;
  }

  try {
    await client.messages.create({
      body: message,
      from,
      to: OWNER_PHONE,
    });
    console.log(`[SMS Alert] Sent to ${OWNER_PHONE}: ${message.substring(0, 60)}...`);
    return true;
  } catch (err: any) {
    console.error(`[SMS Alert] Failed to send:`, err.message || err);
    return false;
  }
}

export async function notifyMissedCall(callerPhone: string, callerName?: string): Promise<void> {
  const who = callerName && callerName !== 'caller' ? `${callerName} (${callerPhone})` : callerPhone;
  const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  await sendSmsAlert(`📞 Missed call from ${who} at ${time}`);
}

export async function notifyNewVoicemail(callerPhone: string, message: string, callerName?: string): Promise<void> {
  const who = callerName && callerName !== 'caller' ? `${callerName} (${callerPhone})` : callerPhone;
  const preview = message.length > 120 ? message.substring(0, 120) + '…' : message;
  await sendSmsAlert(`🎙 New voicemail from ${who}:\n"${preview}"`);
}

export async function notifyNewMessage(callerPhone: string, forPerson: string, message: string, urgency: string, callerName?: string): Promise<void> {
  const who = callerName && callerName !== 'caller' ? `${callerName} (${callerPhone})` : callerPhone;
  const preview = message.length > 100 ? message.substring(0, 100) + '…' : message;
  const urgencyTag = urgency === 'urgent' || urgency === 'high' ? ` ⚠️ ${urgency.toUpperCase()}` : '';
  await sendSmsAlert(`💬 Message from ${who} for ${forPerson}${urgencyTag}:\n"${preview}"`);
}

export async function notifyNewTicket(title: string, priority: string, callerName?: string): Promise<void> {
  const priorityTag = priority === 'critical' || priority === 'high' ? ` ⚠️ ${priority.toUpperCase()}` : '';
  const who = callerName ? ` from ${callerName}` : '';
  await sendSmsAlert(`🎫 New support ticket${who}${priorityTag}:\n"${title}"`);
}

export async function notifyCallSummary(agentName: string, callerPhone: string, turnCount: number, durationSec: number, sentiment: string, toolsUsed: string[]): Promise<void> {
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  const tools = toolsUsed.length > 0 ? toolsUsed.join(', ') : 'none';
  const sentimentEmoji = sentiment === 'frustrated' ? '😤' : sentiment === 'negative' ? '😕' : sentiment === 'positive' ? '😊' : '😐';
  await sendSmsAlert(`📊 Call ended — ${agentName} handled ${callerPhone}\n${turnCount} turns, ${durationStr}\nSentiment: ${sentimentEmoji} ${sentiment}\nTools: ${tools}`);
}
