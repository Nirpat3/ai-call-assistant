# AI Call Assistant

## Overview
This project is an AI-powered call management system designed for intelligent call routing, AI conversation handling, contact management, and real-time analytics for business phone systems. It aims to enhance business communication efficiency and customer interaction through advanced AI capabilities, offering a comprehensive solution for modern business communication needs.

## User Preferences
Preferred communication style: Simple, everyday language.
Design theme: iOS 16 style with off-white/silver backgrounds, no glass effects.
Workflow preference: Progressive disclosure with simple setup flows that gradually introduce advanced features.

## System Architecture
The system features a React 18 frontend with TypeScript, Tailwind CSS (shadcn/ui), and Wouter, supporting PWA via Capacitor for mobile. The backend is built with Node.js, Express.js, TypeScript, Drizzle ORM, and PostgreSQL. Real-time communication uses WebSockets. AI integration is through OpenAI GPT-4 and Whisper APIs, and Twilio Voice API handles call management. The PostgreSQL database includes connection pooling, Drizzle ORM schema management, multi-tenancy with organization-based data isolation, and application-level encryption.

Key features include:
- **Call Management**: Intelligent routing, AI conversation framework with specialized agents, voicemail transcription/summarization, and real-time monitoring.
- **Contact Management**: Multi-source sync, advanced routing rules, data encryption, and spam protection.
- **AI Agent System**: Multi-agent architecture, dynamic greetings, intent recognition, and knowledge base integration. Each agent has DNA, 3-layer memory (short-term, long-term, working), and a skills registry with 8 tools.
- **Analytics and Reporting**: Real-time dashboards, AI performance analytics, business intelligence, and custom reports.
- **Todo App**: iPhone Reminders-style task management with categories, notes, due dates, and reminders.
- **Realtime Voice Engine**: Twilio Media Streams integrated with OpenAI Realtime for full-duplex phone calls, supported by browser WebRTC for in-app voice conversations.
- **Multi-Agent System**: A conversational AI architecture with specialized agents (receptionist, personal_assistant, sales, billing, support), custom system prompts, capabilities, escalation triggers, and confidence thresholds. A Conversation Orchestrator handles intent detection, agent routing, and escalation logic.
- **Contact Routing**: A contact management system with intelligent call routing rules (AI, Forward to Number, Voicemail, Block), supporting CSV import.
- **Multi-Request Handling**: AI assistant capable of breaking down complex messages into sequential tasks and executing them.
- **Security**: JWT-based authentication with signed tokens (HS256) for all protected routes.
- **Reliability**: Comprehensive OpenAI error handling with exponential backoff retry logic.

## External Dependencies
- **OpenAI API**: GPT-4 for conversation, Whisper for transcription.
- **Twilio**: Voice calls, SMS notifications, phone number management.
- **PostgreSQL**: Primary database.
- **NVIDIA PersonaPlex**: Voice provider for TTS synthesis and full-duplex sessions.
- **SendGrid**: For email notifications.
- **Slack**: For team notifications.
- **Notion**: For knowledge base synchronization.
- **Telegram**: For alternative notification channel.