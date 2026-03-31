import twilio from "twilio";

export interface TransferRequest {
  callSid: string;
  transferTo: string;
  transferType: 'warm' | 'cold' | 'conference';
  reason?: string;
  transferredBy?: string;
}

/**
 * Performs a cold transfer (direct forward) to another number
 */
export function coldTransfer(request: TransferRequest): string {
  const twiml = new twilio.twiml.VoiceResponse();
  
  try {
    // Announce the transfer with more detailed information
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, `I'm now transferring your call to the ${request.reason || 'appropriate department'}. Please stay on the line while I connect you.`);
    
    // Add a brief pause for natural flow
    twiml.pause({ length: 1 });
    
    // Dial the transfer destination with hold music
    const dial = twiml.dial({
      timeout: 30,
      action: '/api/twilio/transfer-status',
      method: 'POST',
      callerId: process.env.TWILIO_PHONE_NUMBER,
      ringTone: 'us'
    });
    
    // Add the destination number
    dial.number(request.transferTo);
    
    return twiml.toString();
  } catch (error) {
    console.error('Cold transfer failed:', error);
    twiml.say('I apologize, but I was unable to transfer your call. Please try again or leave a message.');
    twiml.redirect('/api/twilio/voicemail');
    return twiml.toString();
  }
}

/**
 * Performs a warm transfer (agent speaks to recipient first)
 */
export function warmTransfer(request: TransferRequest): string {
  const twiml = new twilio.twiml.VoiceResponse();
  
  try {
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, `I'm connecting you with ${request.reason || 'the right person'}. Please hold while I confirm they're available.`);
    
    // Add brief pause for natural flow
    twiml.pause({ length: 1 });
    
    // Create a conference for the warm transfer
    const conferenceName = `transfer-${request.callSid}-${Date.now()}`;
    
    // Add the original caller to the conference with hold music
    twiml.dial().conference({
      startConferenceOnEnter: false,
      endConferenceOnExit: true,
      waitUrl: '/api/twilio/hold-music',
      waitMethod: 'GET'
    }, conferenceName);
    
    return twiml.toString();
  } catch (error) {
    console.error('Warm transfer failed:', error);
    twiml.say('I apologize, but I was unable to transfer your call. Please try again or leave a message.');
    twiml.redirect('/api/twilio/voicemail');
    return twiml.toString();
  }
}

/**
 * Creates a three-way conference call
 */
export function conferenceTransfer(request: TransferRequest): string {
  const twiml = new twilio.twiml.VoiceResponse();
  
  try {
    const conferenceName = `conference-${request.callSid}-${Date.now()}`;
    
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Setting up a conference call. Please hold.');
    
    // Add caller to conference
    twiml.dial().conference({
      startConferenceOnEnter: true,
      endConferenceOnExit: false
    }, conferenceName);
    
    return twiml.toString();
  } catch (error) {
    console.error('Conference transfer failed:', error);
    twiml.say('I apologize, but I was unable to set up the conference call.');
    twiml.redirect('/api/twilio/voicemail');
    return twiml.toString();
  }
}

/**
 * Handles automatic call forwarding based on rules
 */
export function autoForward(from: string, to: string): string | null {
  try {
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Check if it's business hours
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // Weekend or after hours (6 AM to 11 PM EST)
    if (day === 0 || day === 6 || hour < 6 || hour >= 23) {
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Thank you for calling. Our office is currently closed. Your call is being forwarded to our after-hours line.');
    }
    
    // Forward the call
    const dial = twiml.dial({
      timeout: 30,
      action: '/api/twilio/forward-status',
      method: 'POST',
      callerId: from
    });
    
    dial.number(to);
    
    return twiml.toString();
  } catch (error) {
    console.error('Auto forward failed:', error);
    return null;
  }
}