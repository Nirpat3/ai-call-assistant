# AI Calling System Test Scenarios

## Basic Functionality Tests

### 1. Menu Navigation Test
- Call 727-436-2999
- Press 1 → Should connect to sales team
- Press 2 → Should connect to technical support  
- Press 3 → Should go to voicemail

### 2. Speech Recognition Test
- Call 727-436-2999
- Say "I want to buy something" → Should route to sales
- Say "I need technical help" → Should route to support
- Say "I want to leave a message" → Should go to voicemail

### 3. VIP Customer Test
If you're in the contacts as a VIP:
- Should get personalized greeting with your name
- Faster routing to preferred agents

### 4. Business Hours Test
- Call during business hours (6 AM - 11 PM EST)
- Call outside business hours
- Should handle differently based on time

## Advanced Feature Tests

### 5. Call Transfer Test
- Get connected to an agent
- Ask to be transferred to another department
- Verify smooth handoff

### 6. Voicemail Transcription
- Leave a voicemail
- Check dashboard for transcription accuracy
- Verify notification delivery

### 7. Spam Protection
- Test with blocked numbers (if configured)
- Verify calls are properly filtered

## Dashboard Verification

### Real-time Monitoring
- Watch call logs update in real-time
- Check call statistics accuracy
- Verify agent status indicators

### Call Analytics
- Review call duration tracking
- Check AI confidence scores
- Monitor conversation quality metrics

## Expected Behaviors

✅ **Working Correctly:**
- Clear audio quality
- Proper menu navigation
- Accurate speech recognition
- Smooth call transfers
- Real-time dashboard updates

❌ **Issues to Watch For:**
- "Application error occurred" messages
- Audio cutting out
- Failed transfers
- Dashboard not updating
- Transcription errors

## Performance Metrics

- **Call Answer Rate**: Should be near 100%
- **AI Handling Success**: Target 90%+ automation
- **Average Response Time**: Under 3 seconds
- **Call Completion Rate**: Successful routing/resolution

## Troubleshooting Quick Checks

1. **If no answer**: Check Twilio webhook configuration
2. **If audio issues**: Verify voice settings in AI config
3. **If routing fails**: Check call routing rules
4. **If dashboard not updating**: Check WebSocket connection