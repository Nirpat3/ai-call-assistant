import twilio from "twilio";
import { storage } from "./storage";

// Only initialize Twilio if we have valid credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_TOKEN;

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
        await sendEmail(recipient, message);
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
    // Update notification status to failed if it was created
    try {
      const notification = await storage.createNotification({
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
  await twilioClient.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER || "+15551234567",
    to
  });
}

async function sendEmail(to: string, message: string): Promise<void> {
  // For a production app, you'd integrate with an email service like SendGrid, AWS SES, etc.
  // This is a placeholder implementation
  console.log(`Email notification sent to ${to}: ${message}`);
  
  // Example with a hypothetical email service:
  /*
  const emailService = new EmailService(process.env.EMAIL_API_KEY);
  await emailService.send({
    to,
    from: process.env.FROM_EMAIL,
    subject: "CallBot AI Notification",
    text: message
  });
  */
}

async function sendWhatsApp(to: string, message: string): Promise<void> {
  if (!twilioClient) {
    throw new Error("Twilio not configured. Please provide valid TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.");
  }
  try {
    // Format phone number for WhatsApp (must include country code and whatsapp: prefix)
    const whatsappNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    
    await twilioClient.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886"}`,
      to: whatsappNumber
    });
  } catch (error) {
    console.error("WhatsApp send failed:", error);
    throw error;
  }
}

async function sendTelegram(chatId: string, message: string): Promise<void> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || "default_token";
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML"
      })
    });
    
    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Telegram send failed:", error);
    throw error;
  }
}

export async function getNotificationStatus(): Promise<{
  sms: boolean;
  email: boolean;
  whatsapp: boolean;
  telegram: boolean;
}> {
  // Check if notification channels are properly configured
  const hasTwilio = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  const hasEmail = !!process.env.EMAIL_API_KEY; // Placeholder for email service config
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
    const testRecipient = process.env.TEST_NOTIFICATION_RECIPIENT || "+15551234567";
    await sendNotification(type, testRecipient, "CallBot AI test notification");
    return true;
  } catch (error) {
    console.error(`Test notification failed for ${type}:`, error);
    return false;
  }
}
