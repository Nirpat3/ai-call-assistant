import { humanGreetingSystem } from './human-greetings';
import { storage } from './storage';

export async function testDynamicGreeting() {
  console.log("🎯 Testing Dynamic Greeting System");
  
  // Test scenario 1: New caller during business hours
  const newCallerContext = await humanGreetingSystem.analyzeCallerContext(
    "+15551234567", 
    [] // No call history
  );
  
  const newCallerGreeting = await humanGreetingSystem.generateDynamicGreeting(newCallerContext);
  console.log("\n📞 New Caller Greeting:");
  console.log("Context:", newCallerContext);
  console.log("Greeting:", newCallerGreeting.greeting);
  console.log("Follow-up:", newCallerGreeting.followUp);
  console.log("Tone:", newCallerGreeting.tone);
  
  // Test scenario 2: Returning caller with history
  const mockCallHistory = [
    { createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 1 day ago
    { createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 1 week ago
  ];
  
  const returningCallerContext = await humanGreetingSystem.analyzeCallerContext(
    "+15559876543",
    mockCallHistory
  );
  
  const returningCallerGreeting = await humanGreetingSystem.generateDynamicGreeting(returningCallerContext);
  console.log("\n🔄 Returning Caller Greeting:");
  console.log("Context:", returningCallerContext);
  console.log("Greeting:", returningCallerGreeting.greeting);
  console.log("Follow-up:", returningCallerGreeting.followUp);
  console.log("Tone:", returningCallerGreeting.tone);
  
  // Test scenario 3: Natural speech patterns
  const sampleResponse = "Hello! Thanks for calling. How can I help you today?";
  const naturalSpeech = humanGreetingSystem.addNaturalSpeechPatterns(sampleResponse);
  console.log("\n🗣️ Natural Speech Enhancement:");
  console.log("Original:", sampleResponse);
  console.log("Enhanced:", naturalSpeech);
  
  // Test scenario 4: Different times of day
  const timeScenarios = ['morning', 'afternoon', 'evening', 'night'] as const;
  console.log("\n⏰ Time-Based Greetings:");
  
  for (const timeOfDay of timeScenarios) {
    const timeContext = {
      timeOfDay,
      isBusinessHours: timeOfDay !== 'night',
      isReturningCaller: false,
      callerEmotion: 'neutral' as const
    };
    
    const timeGreeting = await humanGreetingSystem.generateDynamicGreeting(timeContext);
    console.log(`${timeOfDay}: ${timeGreeting.greeting}`);
  }
  
  console.log("\n✅ Dynamic Greeting System Test Complete");
}

// Test the system
if (require.main === module) {
  testDynamicGreeting().catch(console.error);
}