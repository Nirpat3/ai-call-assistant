import { handleIncomingCall, handleVoicemail, handleRecording } from "./twilio";
import { storage } from "./storage";

// Simulate a test call to demonstrate the AI conversation framework
export async function simulateTestCall() {
  console.log("📞 Simulating incoming test call...");
  
  // Test incoming call data
  const testCallData = {
    CallSid: "CA_test_" + Date.now(),
    From: "+15551234567", // Test number
    To: "+17274362999", // Our main number
    CallStatus: "ringing",
    Direction: "inbound",
    CallerName: "Test Customer"
  };
  
  try {
    // Handle incoming call
    console.log("🔄 Processing incoming call...");
    const callResponse = await handleIncomingCall(testCallData);
    console.log("✅ Call handled, TwiML response generated");
    
    // Simulate voicemail recording
    console.log("📝 Simulating voicemail message...");
    const voicemailData = {
      ...testCallData,
      CallStatus: "completed",
      RecordingUrl: "https://api.twilio.com/test-recording.mp3",
      TranscriptionText: "Hi, this is a test call for the AI conversation system. I'm calling about pricing for your services and would like to speak with someone about setting up a demo. My name is John Smith and you can reach me back at 555-123-4567. Thank you!"
    };
    
    await handleRecording(voicemailData);
    console.log("✅ Voicemail processed and transcribed");
    
    // Create another test call with different intent
    const testCallData2 = {
      CallSid: "CA_test_support_" + Date.now(),
      From: "+15559876543",
      To: "+17274362999",
      CallStatus: "completed",
      Direction: "inbound",
      CallerName: "Sarah Johnson"
    };
    
    const supportVoicemail = {
      ...testCallData2,
      RecordingUrl: "https://api.twilio.com/test-recording-2.mp3",
      TranscriptionText: "Hello, I'm having trouble with my account setup and need technical support. I've been trying to configure the integration but keep getting error messages. This is urgent as we have a presentation tomorrow. Please call me back as soon as possible at 555-987-6543. Thanks!"
    };
    
    await handleRecording(supportVoicemail);
    console.log("✅ Second test voicemail processed");
    
    // Create a VIP customer call
    const vipCallData = {
      CallSid: "CA_test_vip_" + Date.now(),
      From: "+15556661234", // This should match Nirav's number in contacts
      To: "+17274362999",
      CallStatus: "completed",
      Direction: "inbound",
      CallerName: "Nirav Patel"
    };
    
    const vipVoicemail = {
      ...vipCallData,
      RecordingUrl: "https://api.twilio.com/test-recording-3.mp3",
      TranscriptionText: "Hi, this is Nirav. I wanted to follow up on our conversation about the enterprise features. Could you send me the detailed pricing breakdown we discussed? Also, I'd like to schedule a call for next week to review the implementation timeline. Thanks!"
    };
    
    await handleRecording(vipVoicemail);
    console.log("✅ VIP customer voicemail processed");
    
    console.log("🎉 Test call simulation completed successfully!");
    console.log("📋 Check the voicemail section to see the AI-processed messages");
    
    return {
      success: true,
      testCalls: [testCallData.CallSid, testCallData2.CallSid, vipCallData.CallSid]
    };
    
  } catch (error) {
    console.error("❌ Error during test call simulation:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for use in routes
export default simulateTestCall;