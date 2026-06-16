import twilio from "twilio";
import { storage } from "./storage";
import { sendEmail as sendEmailService } from "./email-service";

// Only initialize Twilio if we have valid credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

let twilioClient: any = null;
if (accountSid && authToken && accountSid.startsWith('AC')) {
  twilioClient = twilio(accountSid, authToken);
}

export async function sendNotification(
  type: "sms" | "email" | "whatsapp" | "telegram",
  recipient: string,
  message: string,
  callId?: number
): Promise<void> {
  try {
    const notification = await storage.createNotification({
      type,
      recipient,
      message,
      status: "pending",
      callId
    });

    switch (type) {
      case "sms":
        await sendSMS(recipient, message);
        break;
      case "email":
        await sendEmailNotification(recipient, message);
        break;
      case "whatsapp":
        await sendWhatsApp(recipient, message);
        break;
      case "telegram":
        await sendTelegram(recipient, message);
        break;
    }

    await storage.updateNotification(notification.id, {
      status: "sent",
      sentAt: new Date()
    });
  } catch (error) {
    console.error(`Failed to send ${type} notification:`, error);
    try {
      await storage.createNotification({
        type,
        recipient,
        message,
        status: "failed",
        callId
      });
    } catch (e) {
      console.error("Failed to create failed notification record:", e);
    }
  }
}

async function sendSMS(to: string, message: string): Promise<void> {
  if (!twilioClient) {
    throw new Error("Twilio not configured. Please provide valid TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.");
  }

  // Use Messaging Service if available (required for A2P compliance), otherwise fall back to phone number
  const msgParams: any = {
    body: message,
    to
  };

  if (messagingServiceSid) {
    msgParams.messagingServiceSid = messagingServiceSid;
  } else {
    msgParams.from = process.env.TWILIO_PHONE_NUMBER!;
  }

  await twilioClient.messages.create(msgParams);
}

async function sendEmailNotification(to: string, message: string): Promise<void> {
  await sendEmailService({
    to,
    subject: "AI Call Assistant Notification",
    text: message,
    html: `<div style="font-family: -apple-system, sans-serif; padding: 20px;">
      <h3 style="color: #1a1a2e;">AI Call Assistant</h3>
      <p style="line-height: 1.6;">${message}</p>
    </div>`
  });
}

async function sendWhatsApp(to: string, message: string): Promise<void> {
  if (!twilioClient) {
    throw new Error("Twilio not configured. Please provide valid TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.");
  }
  const whatsappNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  await twilioClient.messages.create({
    body: message,
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886"}`,
    to: whatsappNumber
  });
}

async function sendTelegram(chatId: string, message: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;
  if (!botToken) {
    throw new Error("Telegram not configured. Please set TELEGRAM_BOT_TOKEN.");
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML"
    })
  });

  if (!response.ok) {
    throw new Error(`Telegram API error: ${response.statusText}`);
  }
}

export async function getNotificationStatus(): Promise<{
  sms: boolean;
  email: boolean;
  whatsapp: boolean;
  telegram: boolean;
}> {
  const hasTwilio = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  const hasEmail = !!process.env.SENDGRID_API_KEY;
  const hasWhatsApp = !!(hasTwilio && process.env.TWILIO_WHATSAPP_NUMBER);
  const hasTelegram = !!process.env.TELEGRAM_BOT_TOKEN;

  return {
    sms: hasTwilio,
    email: hasEmail,
    whatsapp: hasWhatsApp,
    telegram: hasTelegram
  };
}

export async function testNotification(type: "sms" | "email" | "whatsapp" | "telegram"): Promise<boolean> {
  try {
    const testRecipient = process.env.TEST_NOTIFICATION_RECIPIENT || process.env.NOTIFICATION_PHONE || "";
    if (!testRecipient) {
      throw new Error("No test recipient configured. Set NOTIFICATION_PHONE in .env");
    }
    await sendNotification(type, testRecipient, "AI Call Assistant: Test notification — your notification system is active.");
    return true;
  } catch (error) {
    console.error(`Test notification failed for ${type}:`, error);
    return false;
  }
}
