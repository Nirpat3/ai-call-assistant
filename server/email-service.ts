interface EmailData {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(data: EmailData): Promise<void> {
  // For now, just log the email (would integrate with SendGrid/SMTP in production)
  console.log('Email would be sent:', {
    to: data.to,
    subject: data.subject,
    content: data.html || data.text
  });
  
  // TODO: Integrate with actual email service
  // Example with SendGrid:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send(data);
}