# SMS Support Team Onboarding Guide

## Overview

This guide provides support team members with essential information to assist customers with SMS functionality in the AI Call Assistant platform.

## Quick Reference

### Common Issues & Solutions

| Issue | Error Code | Cause | Solution |
|-------|------------|-------|----------|
| SMS not delivered | 30032 | Toll-free number not verified | Use verified 10DLC number |
| SMS blocked | 30034 | Unregistered 10DLC number | Complete A2P registration |
| Voice recording fails | N/A | Browser permissions | Grant microphone access |
| AI enhancement fails | N/A | OpenAI API issue | Check API key configuration |

### Customer Support Scripts

#### SMS Delivery Issues

**Customer**: "My SMS messages aren't being delivered"

**Support Response**:
"I understand you're having trouble with SMS delivery. This is likely due to Twilio's A2P 10DLC registration requirements for US phone numbers. Let me help you resolve this:

1. First, let's check if your phone number is registered
2. If not registered, we'll need to complete the A2P 10DLC process
3. This takes 3-4 weeks but ensures reliable delivery
4. I can guide you through the registration steps"

#### Voice-to-Text Not Working

**Customer**: "The voice recording feature isn't working"

**Support Response**:
"I can help you with the voice recording feature. This usually happens due to browser permissions:

1. Check if your browser has microphone access
2. Look for a microphone icon in your browser's address bar
3. Click 'Allow' if prompted for microphone access
4. Try refreshing the page and testing again
5. If issues persist, try a different browser (Chrome works best)"

## Technical Background

### SMS System Architecture

The platform uses:
- **Twilio API**: For SMS sending and receiving
- **OpenAI Whisper**: For voice-to-text conversion
- **GPT-4**: For message enhancement
- **Database**: For message storage and tracking

### Phone Number Configuration

- **Primary**: +17274362999 (verified 10DLC)
- **Backup**: +18557838879 (toll-free, requires verification)
- **Status**: Active and configured for SMS

### Key Features

1. **Outbound SMS**: Send messages from web interface
2. **Voice-to-Text**: Record and transcribe voice messages
3. **AI Enhancement**: Improve message tone and clarity
4. **Contact Integration**: Send from contact profiles
5. **Message History**: Track all communications

## A2P 10DLC Registration Support

### Customer Requirements

Help customers gather:
- **Business Information**: Legal name, address, EIN
- **Documentation**: Business license, articles of incorporation
- **Use Case**: Description of how SMS will be used
- **Sample Messages**: Examples of planned SMS content

### Registration Process Timeline

- **Day 1**: Customer starts Trust Hub profile
- **Week 1**: Brand registration submitted
- **Week 2-3**: Brand approval process
- **Week 3-4**: Campaign creation and approval
- **Week 4**: Phone number linking and testing

### Cost Breakdown

**Initial Setup**:
- Brand registration: $44 (one-time)
- Campaign registration: $15 (one-time)
- **Total initial cost**: $59

**Monthly Costs**:
- Campaign maintenance: $2-5/month
- Per-message fees: ~$0.003 per SMS

## Troubleshooting Steps

### Step 1: Verify Configuration

1. Check Twilio account status
2. Verify phone number registration
3. Confirm A2P campaign approval
4. Test message delivery

### Step 2: Check Browser Requirements

1. Ensure microphone permissions granted
2. Use supported browsers (Chrome, Firefox, Safari)
3. Check internet connection stability
4. Clear browser cache if needed

### Step 3: Validate API Keys

1. Verify Twilio credentials
2. Check OpenAI API key status
3. Confirm environment variables set
4. Test API connectivity

### Step 4: Escalation Process

**When to Escalate**:
- Twilio registration issues beyond basic guidance
- Technical API problems
- Complex integration requirements
- Billing or account issues

**How to Escalate**:
1. Document all troubleshooting steps taken
2. Include error messages and codes
3. Provide customer account information
4. Escalate to technical support team

## Common Customer Questions

### Q: How long does A2P registration take?
**A**: The complete process takes 3-4 weeks. Brand registration typically takes 1-2 weeks, and campaign approval takes another 2-3 weeks.

### Q: Why was my registration rejected?
**A**: Common reasons include:
- Information doesn't match business registration
- Incomplete opt-in/opt-out processes
- Vague campaign descriptions
- Missing required documentation

### Q: Can I use my existing phone number?
**A**: Yes, but it needs to be a 10DLC number and registered for A2P. Toll-free numbers require separate verification.

### Q: What if I'm not in the US?
**A**: A2P 10DLC is only required for US phone numbers. International numbers have different requirements.

### Q: How much will SMS cost?
**A**: Initial setup is about $59, then $2-5/month plus ~$0.003 per message sent.

## Best Practices for Support

### Documentation
- Always document customer issues and resolutions
- Record registration progress and timeline
- Keep notes on configuration changes

### Communication
- Set clear expectations about timelines
- Explain technical concepts in simple terms
- Provide regular updates on registration status

### Follow-up
- Check back after 1 week on registration progress
- Verify functionality after approval
- Collect feedback on the process

## Training Resources

### Required Reading
- [SMS Configuration Guide](./SMS_CONFIGURATION_GUIDE.md)
- [Twilio A2P 10DLC Documentation](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc)
- [Platform User Guide](./USER_GUIDE.md)

### Practice Scenarios
1. Customer needs to register new business
2. Registration rejected due to documentation
3. Voice recording not working in browser
4. Messages not delivering after registration

## Support Tools

### Twilio Console Access
- Account dashboard for registration status
- Message logs for delivery tracking
- Campaign management for approvals

### Platform Admin Tools
- SMS message history and logs
- User account management
- Configuration verification

### Documentation Resources
- Step-by-step registration guides
- Troubleshooting checklists
- Common error code reference

## Escalation Contacts

**Technical Issues**: technical-support@company.com
**Billing Questions**: billing@company.com
**Twilio Registration**: Include Twilio support ticket number

## Success Metrics

Track these metrics for SMS support:
- Registration completion rate
- Average resolution time
- Customer satisfaction scores
- Escalation rates

## Conclusion

SMS support requires understanding both the technical requirements and the business registration process. The key is helping customers navigate the A2P 10DLC registration while providing clear timelines and expectations. Most issues can be resolved through proper registration and configuration guidance.

Regular training on Twilio updates and platform changes ensures the support team can provide accurate, helpful assistance to customers.