# AI Call Assistant - Developer Documentation

## Overview

The AI Call Assistant is a comprehensive call management system that uses artificial intelligence to handle incoming calls, manage contacts, and provide intelligent call routing. This documentation provides detailed information for developers working on the system.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Getting Started](#getting-started)
3. [API Documentation](#api-documentation)
4. [Security Implementation](#security-implementation)
5. [Contact Management](#contact-management)
6. [Call Routing System](#call-routing-system)
7. [Mobile App Development](#mobile-app-development)
8. [Deployment Guide](#deployment-guide)
9. [Troubleshooting](#troubleshooting)

## Architecture Overview

### Technology Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket connections
- **Mobile**: Progressive Web App (PWA) + Capacitor
- **AI Integration**: OpenAI GPT-4 and Whisper
- **Voice Communication**: Twilio Voice API
- **Notifications**: Multi-channel (SMS, Email, WhatsApp, Telegram)

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile Apps   │    │   Web Client    │    │  Admin Panel    │
│  (iOS/Android)  │    │    (React)      │    │     (Web)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  API Gateway    │
                    │   (Express)     │
                    └─────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
       ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
       │   Contact   │  │    Call     │  │     AI      │
       │ Management  │  │  Routing    │  │  Services   │
       └─────────────┘  └─────────────┘  └─────────────┘
                │                │                │
                └────────────────┼────────────────┘
                                 │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   Database      │
                    └─────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- API keys for external services (optional for development)

### Installation

1. **Clone and Install Dependencies**
```bash
npm install
```

2. **Database Setup**
```bash
# Push database schema
npm run db:push
```

3. **Environment Configuration**
```bash
# Required environment variables are automatically provided
# Optional: Add external service API keys for full functionality
```

4. **Start Development Server**
```bash
npm run dev
```

### Project Structure

```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility libraries
│   │   └── index.css      # Global styles with mobile optimization
├── server/                # Node.js backend application
│   ├── index.ts          # Main server entry point
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Database operations
│   ├── twilio.ts         # Call handling logic
│   ├── openai.ts         # AI integration
│   └── notifications.ts  # Multi-channel notifications
├── shared/               # Shared code between client and server
│   └── schema.ts         # Database schema and types
├── developer/            # Developer documentation
└── capacitor.config.json # Mobile app configuration
```

## Key Features

### Contact Management System
- **Contact Synchronization**: Import contacts from iOS/Android devices
- **Manual Contact Management**: Add, edit, delete contacts via web interface
- **VIP Contact Designation**: Priority handling for important contacts
- **Contact Routing Rules**: Custom call handling per contact

### Intelligent Call Routing
- **Personalized Greetings**: Custom messages for known contacts
- **Smart Routing**: AI-powered call direction based on intent
- **Business Hours**: Time-based routing rules
- **Fallback Options**: Voicemail and forwarding capabilities

### Mobile-First Design
- **Progressive Web App**: Installable on mobile devices
- **iOS/Android Optimization**: Native app experience
- **Offline Capabilities**: Basic functionality without internet
- **Touch-Optimized Interface**: Designed for mobile interaction

### Security Features
- **Data Encryption**: All sensitive data encrypted at rest and in transit
- **API Authentication**: Secure endpoints with proper validation
- **Rate Limiting**: Protection against abuse
- **Input Sanitization**: Prevention of injection attacks

## Next Steps

1. Review the [API Documentation](./API.md) for endpoint details
2. Check [Security Implementation](./SECURITY.md) for security best practices
3. Follow [Mobile App Development](./MOBILE.md) for app store deployment
4. Use [Deployment Guide](./DEPLOYMENT.md) for production setup

## Support

For technical support or questions:
- Review the troubleshooting guide
- Check API documentation for endpoint usage
- Refer to security documentation for best practices
- Follow mobile development guide for app deployment