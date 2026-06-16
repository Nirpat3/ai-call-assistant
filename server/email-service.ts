import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "notifications@aicallassistant.com";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log("[Email] SendGrid configured");
} else {
  console.warn("[Email] SENDGRID_API_KEY not set — email notifications disabled");
}

interface EmailData {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(data: EmailData): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.log("[Email] Would send (SendGrid not configured):", data.subject, "->", data.to);
    return;
  }

  const message: any = {
    to: data.to,
    from: FROM_EMAIL,
    subject: data.subject,
  };

  if (data.text) message.text = data.text;
  if (data.html) message.html = data.html;

  await sgMail.send(message);

  console.log(`[Email] Sent to ${data.to}: ${data.subject}`);
}

export async function sendCallSummaryEmail(
  to: string,
  callerName: string,
  callerPhone: string,
  summary: string,
  transcription?: string,
  recordingUrl?: string
): Promise<void> {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a1a2e; color: white; padding: 20px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0;">AI Call Assistant</h2>
        <p style="margin: 5px 0 0; opacity: 0.8;">Call Summary</p>
      </div>
      <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef;">
        <p style="margin: 0 0 8px;"><strong>From:</strong> ${callerName || 'Unknown'} (${callerPhone})</p>
        <p style="margin: 0 0 8px;"><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}</p>
      </div>
      <div style="padding: 20px; border: 1px solid #e9ecef; border-top: none;">
        <h3 style="margin: 0 0 10px;">Summary</h3>
        <p style="margin: 0; line-height: 1.6;">${summary}</p>
      </div>
      ${transcription ? `
      <div style="padding: 20px; border: 1px solid #e9ecef; border-top: none;">
        <h3 style="margin: 0 0 10px;">Transcription</h3>
        <p style="margin: 0; line-height: 1.6; color: #555;">${transcription}</p>
      </div>` : ''}
      ${recordingUrl ? `
      <div style="padding: 20px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 12px 12px;">
        <a href="${recordingUrl}" style="display: inline-block; background: #1a1a2e; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none;">Listen to Recording</a>
      </div>` : ''}
    </div>
  `;

  await sendEmail({
    to,
    subject: `Call from ${callerName || callerPhone} — AI Call Assistant`,
    text: `Call from ${callerName || callerPhone} (${callerPhone})\n\nSummary: ${summary}${transcription ? '\n\nTranscription: ' + transcription : ''}`,
    html,
  });
}
