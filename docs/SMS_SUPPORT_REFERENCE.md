# SMS Support Quick Reference Card

## Emergency Contacts
- **Technical Support**: technical-support@company.com
- **Twilio Issues**: Include Twilio ticket number
- **Billing Questions**: billing@company.com

## Common Error Codes

### Error 30032: Toll-Free Not Verified
- **Issue**: Using unverified toll-free number
- **Solution**: Switch to verified 10DLC number (+17274362999)
- **Timeline**: Immediate fix

### Error 30034: Unregistered 10DLC
- **Issue**: Phone number not registered for A2P
- **Solution**: Complete A2P 10DLC registration
- **Timeline**: 3-4 weeks

### Voice Recording Fails
- **Issue**: Browser permissions not granted
- **Solution**: Enable microphone access in browser
- **Timeline**: Immediate fix

### AI Enhancement Fails
- **Issue**: OpenAI API key problems
- **Solution**: Verify API key configuration
- **Timeline**: 5-10 minutes

## A2P Registration Checklist

### Customer Information Needed
- [ ] Legal business name (exact match to tax records)
- [ ] Business address (physical location)
- [ ] Tax ID (EIN for business, SSN for sole proprietor)
- [ ] Business documentation (license, articles of incorporation)
- [ ] Business website URL
- [ ] Sample SMS messages
- [ ] Description of SMS use case

### Registration Steps
1. **Trust Hub Profile** (Day 1)
2. **Brand Registration** (Week 1-2)
3. **Campaign Creation** (Week 3)
4. **Phone Number Linking** (Week 4)
5. **Testing & Verification** (Week 4)

### Costs
- **Brand Registration**: $44 (one-time)
- **Campaign Registration**: $15 (one-time)
- **Monthly Campaign Fee**: $2-5/month
- **Per-message Fee**: ~$0.003 per SMS

## Troubleshooting Steps

### SMS Delivery Issues
1. Check Twilio console for error codes
2. Verify phone number registration status
3. Confirm campaign approval
4. Test with different recipient numbers

### Voice Recording Problems
1. Check browser compatibility (Chrome preferred)
2. Verify microphone permissions
3. Test with different browsers
4. Check internet connection

### AI Features Not Working
1. Verify OpenAI API key is active
2. Check API usage limits
3. Test with simple messages
4. Review browser console for errors

## Customer Communication Templates

### Registration Timeline
"The A2P 10DLC registration process typically takes 3-4 weeks:
- Week 1: Brand registration submission
- Week 2: Brand approval
- Week 3: Campaign creation and review
- Week 4: Final approval and testing"

### Cost Explanation
"The initial setup cost is $59 (brand $44 + campaign $15), then $2-5 monthly for campaign maintenance plus approximately $0.003 per message sent."

### Voice Recording Issues
"For voice recording features, please ensure:
1. Your browser has microphone permissions enabled
2. You're using Chrome, Firefox, or Safari
3. Click 'Allow' when prompted for microphone access
4. Try refreshing the page if issues persist"

## Platform Features

### SMS Capabilities
- ✅ Outbound messaging from web interface
- ✅ Voice-to-text message drafting
- ✅ AI-powered message enhancement
- ✅ Contact integration and history
- ✅ Delivery tracking and status

### Voice-to-Text Features
- ✅ Real-time audio transcription
- ✅ Multiple tone options (professional, friendly, casual)
- ✅ Message preview and editing
- ✅ Character counting for SMS limits

### AI Enhancement Options
- **Professional**: Formal business communication
- **Friendly**: Warm, approachable tone
- **Casual**: Relaxed, conversational style

## Escalation Criteria

### Escalate to Technical Support
- Complex API integration issues
- Database or server errors
- Multiple system failures
- Custom configuration requests

### Escalate to Management
- Billing disputes over $100
- Customer complaints about service
- Feature requests from enterprise clients
- Legal or compliance questions

## Success Metrics

### Track These KPIs
- Registration completion rate: Target >85%
- Average resolution time: Target <24 hours
- Customer satisfaction: Target >4.5/5
- First-call resolution: Target >70%

### Red Flags
- Multiple registration rejections
- Repeated delivery failures
- API errors across multiple accounts
- Unusual billing patterns

## Version Updates

**Document Version**: 1.0
**Last Updated**: July 3, 2025
**Next Review**: August 3, 2025

## Additional Resources

- [Complete SMS Configuration Guide](./SMS_CONFIGURATION_GUIDE.md)
- [Onboarding SMS Support Guide](./ONBOARDING_SMS_SUPPORT.md)
- [Platform User Guide](./USER_GUIDE.md)
- [Twilio A2P Documentation](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc)