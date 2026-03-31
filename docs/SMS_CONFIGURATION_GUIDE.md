# SMS Configuration Guide

## Overview

This guide provides step-by-step instructions for configuring SMS functionality in the AI Call Assistant platform, including Twilio A2P 10DLC registration requirements for US phone numbers.

## Prerequisites

- Active Twilio account with SMS capabilities
- Business registration documents (EIN, business license, etc.)
- Valid business address and contact information
- Credit card for Twilio registration fees

## Part 1: Twilio A2P 10DLC Registration

### What is A2P 10DLC?

A2P 10DLC (Application-to-Person 10-Digit Long Code) is a US telecom standard requiring businesses to register their messaging use cases. **All unregistered SMS messages to US numbers are blocked.**

### Registration Process

#### Step 1: Access Twilio Console

1. Log into your Twilio Console: https://console.twilio.com/
2. Navigate to: **Messaging → Regulatory Compliance → A2P 10DLC Overview**

#### Step 2: Create Trust Hub Profile

1. Go to: **Account → Trust Hub → Overview**
2. Create Customer Profile with:
   - Legal business name (must match tax registration)
   - Physical business address
   - Tax ID (EIN for business, SSN for sole proprietor)
   - Business documentation (articles of incorporation, business license)

#### Step 3: Choose Brand Type

| Brand Type | Best For | Daily Message Limit | Registration Fee |
|------------|----------|-------------------|------------------|
| **Sole Proprietor** | Individual businesses, no EIN | Lower throughput | $4 one-time |
| **Low-Volume Standard** | Small businesses, <6,000 messages/day | Up to 6,000 segments/day | $44 one-time |
| **Standard** | Established businesses, high volume | Higher throughput | $44 one-time |

**Recommended**: Standard Brand for established businesses

#### Step 4: Register Your Brand

Fill out these details accurately:
- **Company Name**: Must match tax registration exactly
- **Business Address**: Registered business address
- **Business Type**: Select appropriate industry category
- **Website**: Business website URL
- **Business Description**: Clear description of AI call assistant service

#### Step 5: Create A2P Campaign

1. **Campaign Use Case**: Select "Customer Care" or "Account Notifications"
2. **Campaign Details**:
   - **Purpose**: "AI-powered call assistant system sending automated notifications and customer service messages"
   - **Sample Messages**:
     ```
     Your AI assistant call summary: [details]. Reply STOP to opt out.
     Missed call from [number]. AI transcript available. Reply STOP to opt out.
     Voice message transcription: [content]. Reply STOP to opt out.
     ```
   - **Opt-in Process**: "Customers opt-in when they register for AI call services"
   - **Opt-out Instructions**: "Reply STOP to unsubscribe from AI call notifications"
   - **Help Response**: "Reply HELP for support or call [your support number]"

#### Step 6: Link Phone Numbers

1. Create or select existing Messaging Service
2. Add your 10DLC phone number to the sender pool
3. Link to your approved campaign

### Registration Costs (2025)

#### One-Time Fees
- **Brand Registration**: $44 (Standard/Low-Volume)
- **Campaign Registration**: $15
- **Total Initial Cost**: $59

#### Monthly Fees
- **Campaign Fee**: $2-5/month (varies by use case)
- **Per-message carrier fees**: ~$0.003 per SMS segment

### Timeline
- **Brand approval**: 1-2 weeks
- **Campaign approval**: 2-3 weeks
- **Total process**: 3-4 weeks

## Part 2: Platform Configuration

### Environment Variables

Ensure these environment variables are set in your deployment:

```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+17274362999  # Use verified number
OPENAI_API_KEY=your_openai_api_key  # For voice-to-text features
```

### Phone Number Configuration

The platform uses a verified phone number (`+17274362999`) instead of the toll-free number to avoid A2P 10DLC registration delays.

### Database Schema

SMS messages are stored with the following structure:
- Message content (encrypted)
- Sender/recipient information
- Delivery status
- Timestamp and metadata

## Part 3: Feature Overview

### Core SMS Features

1. **Outbound SMS Sending**: Send messages through web interface
2. **Voice-to-Text Drafting**: Record voice messages and convert to text
3. **AI Message Enhancement**: Improve message tone and clarity
4. **Contact Integration**: Send messages from contact profiles
5. **Message History**: Track all SMS communications
6. **Delivery Tracking**: Monitor message delivery status

### Voice-to-Text SMS Features

1. **Recording Interface**: Click and hold to record voice messages
2. **Real-time Transcription**: Automatic speech-to-text conversion
3. **AI Enhancement**: Multiple tone options (professional, friendly, casual)
4. **Preview and Edit**: Review before sending
5. **Character Counting**: SMS length optimization

## Part 4: Troubleshooting

### Common Issues

#### Error 30032: Toll-Free Number Not Verified
- **Cause**: Using unverified toll-free number
- **Solution**: Switch to verified 10DLC number or complete toll-free verification

#### Error 30034: Unregistered 10DLC Number
- **Cause**: Phone number not registered for A2P 10DLC
- **Solution**: Complete A2P 10DLC registration process

#### Voice Recording Not Working
- **Cause**: Browser microphone permissions
- **Solution**: Grant microphone access in browser settings

#### AI Enhancement Failures
- **Cause**: OpenAI API key issues
- **Solution**: Verify OpenAI API key configuration

### Support Escalation

For complex registration issues:
1. Check Twilio Console for detailed error messages
2. Review all business information for accuracy
3. Contact Twilio Support for registration assistance
4. Document all error codes and messages

## Part 5: Best Practices

### Message Content Guidelines

1. **Always include opt-out instructions**: "Reply STOP to opt out"
2. **Keep messages concise**: Under 160 characters when possible
3. **Include business identification**: Clearly identify your business
4. **Avoid spam triggers**: No excessive capitalization or promotional language

### Compliance Requirements

1. **Obtain consent**: Ensure recipients have opted in
2. **Honor opt-outs**: Process STOP requests immediately
3. **Maintain records**: Keep opt-in/opt-out documentation
4. **Regular audits**: Review message content and compliance

### Performance Optimization

1. **Monitor delivery rates**: Track failed deliveries
2. **Optimize message timing**: Avoid late night/early morning sends
3. **Segment audiences**: Tailor messages to recipient preferences
4. **A/B test content**: Improve engagement rates

## Part 6: Integration with AI Call Assistant

### Workflow Integration

1. **Call Summaries**: Automatically send call transcripts via SMS
2. **Missed Call Notifications**: Alert contacts about missed calls
3. **Voicemail Transcripts**: Send voicemail transcriptions
4. **Appointment Reminders**: Automated scheduling notifications

### Contact Management

1. **Phone Number Validation**: Ensure proper formatting
2. **Contact Preferences**: Respect SMS opt-in/opt-out preferences
3. **Duplicate Detection**: Prevent multiple messages to same contact
4. **Contact Synchronization**: Sync with mobile device contacts

## Conclusion

Proper SMS configuration requires careful attention to Twilio's A2P 10DLC requirements. Allow 3-4 weeks for the registration process and ensure all business information is accurate and up-to-date. The platform's voice-to-text and AI enhancement features provide a powerful messaging experience once properly configured.

For additional support, consult the Twilio documentation or contact your system administrator.