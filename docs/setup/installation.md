# Installation Guide

This guide walks you through setting up the AI Call Assistant system.

## System Requirements

### Minimum Requirements
- Node.js 18.0 or higher
- PostgreSQL 14.0 or higher
- 2GB RAM
- 10GB disk space

### Recommended Requirements
- Node.js 20.0 or higher
- PostgreSQL 15.0 or higher
- 4GB RAM
- 20GB disk space

## Dependencies

### Required External Services
- **OpenAI API** - For AI conversation and transcription
- **Twilio** - For voice calls and SMS
- **PostgreSQL Database** - For data storage

### Optional Integrations
- SendGrid (Email notifications)
- Slack (Team notifications)
- Notion (Knowledge base sync)

## Installation Steps

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ai-call-assistant
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file with the following variables:
```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Optional Services
SENDGRID_API_KEY=your_sendgrid_api_key
SLACK_BOT_TOKEN=your_slack_bot_token
NOTION_API_KEY=your_notion_api_key
```

### 4. Database Setup
```bash
# Run database migrations
npm run db:push

# Seed initial data (optional)
npm run db:seed
```

### 5. Start the Application
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## Verification

After installation, verify the system is working:

1. **Access the Web Interface**: Open http://localhost:5000
2. **Check API Health**: Visit http://localhost:5000/api/health
3. **Test Database Connection**: Check the console for database connection messages
4. **Verify AI Services**: Test the AI configuration in system settings

## Next Steps

- [Quick Setup Guide](./quick-setup.md)
- [Configuration Guide](./configuration.md)
- [User Guide](../user-guides/getting-started.md)

## Troubleshooting

Common installation issues:

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure database exists and user has permissions

### API Key Issues
- Verify all required API keys are set
- Check API key permissions and quotas
- Test API connectivity

### Port Conflicts
- Default port is 5000
- Change PORT environment variable if needed
- Ensure no other services are using the same port

For more detailed troubleshooting, see the [Troubleshooting Guide](../troubleshooting/common-issues.md).