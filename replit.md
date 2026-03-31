# AI Call Assistant

## Overview
This project is an AI-powered call management system designed to provide intelligent call routing, AI conversation handling, contact management, and real-time analytics for business phone systems. It aims to enhance business communication efficiency and customer interaction through advanced AI capabilities.

## User Preferences
Preferred communication style: Simple, everyday language.
Design theme: iOS 16 style with off-white/silver backgrounds, no glass effects.
Workflow preference: Progressive disclosure with simple setup flows that gradually introduce advanced features.

## System Architecture
The system is built with a React 18 frontend using TypeScript, Tailwind CSS with shadcn/ui, and Wouter for routing. It supports PWA via Capacitor for mobile deployment. The backend uses Node.js with Express.js, TypeScript, and Drizzle ORM with PostgreSQL. Real-time communication is handled via WebSockets. AI integration leverages OpenAI GPT-4 and Whisper APIs, and Twilio Voice API is used for call handling. The database is PostgreSQL with connection pooling, schema management via Drizzle ORM, and supports multi-tenancy with organization-based data isolation and application-level encryption.

Key features include:
- **Call Management**: Intelligent call routing with business rules, AI conversation framework with specialized agents, voicemail transcription/summarization, and real-time call monitoring.
- **Contact Management**: Multi-source sync (e.g., mobile devices), advanced routing rules, data encryption, and spam protection.
- **AI Agent System**: Multi-agent architecture, dynamic greetings, intent recognition, and knowledge base integration.
- **Analytics and Reporting**: Real-time dashboards, AI performance analytics, business intelligence, and custom reports.
- **Todo App**: iPhone Reminders-style task management with categories, notes, due dates, and reminders.

## Recent Changes (March 31, 2026)
- **NVIDIA PersonaPlex Voice Provider Integration**: Added PersonaPlex as a 5th voice provider
  - New `NvidiaPersonaPlexProvider` class in `server/services/voice-provider.ts` with TTS synthesis and full-duplex session creation
  - 18 pre-built voices: Natural (NATF0-3, NATM0-3) and Variety (VARF0-4, VARM0-4)
  - API routes: `GET /api/voice-providers/status`, `GET /api/voice-providers/personaplex/voices`, `POST /api/voice-providers/personaplex/session` (auth-protected)
  - Voice Provider selector added to Call Management page (`call-management.tsx`), AI Receptionist page (`ai-receptionist.tsx`), and AI Assistant Config page (`ai-assistant-config.tsx`)
  - PersonaPlex features display (full-duplex, voice cloning, backchannels, ~170ms latency) shown when selected
  - Conversation Orchestrator extended with `processWithPersonaPlex()` for agent-specific voice/persona mapping
  - Voice config schema unified to `{ provider, voiceId }` format across all pages
  - Env var: `NVIDIA_PERSONAPLEX_API_KEY` (via personaplex.io hosted API)
  - Schema comment updated in `shared/schema.ts` to include `nvidia_personaplex`

- **Codebase Fix & Cleanup**: Resolved all critical TypeScript/JSX errors throughout the frontend
  - Fixed JSX structure error in `personal-assistant-dashboard.tsx` (mismatched TabsContent/div closing tags)
  - Updated `apiRequest` calls across 15+ files from old 3-arg format `(method, url, body)` to new 2-arg format `(url, options?)`
  - Fixed `useWebSocket` hook calls from old 2-arg format `(url, options)` to new 1-arg format `(options)` in 5+ files
  - Updated WebSocket message handling to use `msg.type`/`msg.data` pattern consistently
  - Fixed type issues: removed missing type imports (AiConfig, Notification), added proper type params to useQuery calls
  - Fixed navigation link in personal-assistant-dashboard (now correctly points to /settings/call-settings)
  - Added missing `Eye` and `Breadcrumb` imports to call-log-clean.tsx
  - Added `onClose` prop support to `SupportChatbot` component
  - Fixed null-safety issues in admin-portal.tsx (date formatting for nullable dates)
  - Fixed `phoneNumbers` type casting in ContactManager (encrypted string vs array)
  - All core application flows tested and verified: login, dashboard, call log, contacts

## Recent Changes (January 1, 2026)
- **Multi-Agent System Implementation**: Full conversational AI architecture
  - 5 new database tables: `ai_agent_roles`, `ai_knowledge_packs`, `ai_conversation_states`, `ai_voice_configs`, `ai_intent_mappings`
  - 5 specialized agents seeded: receptionist, personal_assistant, sales, billing, support
  - Each agent has custom system prompts, capabilities, escalation triggers, and confidence thresholds
  - Conversation Orchestrator (`server/services/conversation-orchestrator.ts`): Intent detection using GPT-4o-mini, agent routing, escalation logic
  - Voice Provider Manager (`server/services/voice-provider.ts`): 4 providers (OpenAI Realtime, ElevenLabs, Cartesia, Twilio) with fallback hierarchy
  - 11+ intent taxonomy: greeting, schedule_appointment, billing_inquiry, product_question, technical_support, complaint, transfer_request, voicemail_request, sales_inquiry, account_update, general_inquiry
  - Escalation triggers: low confidence (<85-90%), max turns exceeded (default 10), keyword triggers, complaint detection
  - Storage methods added for all multi-agent CRUD operations

- **Call Flow Architecture Update**: Comprehensive update to align with documented call flow specification
  - Fixed DTMF support number: Press 2 now correctly routes to +1888-727-4302 (Support) instead of Sales
  - Added DTMF Press 0 option: Continues AI conversation instead of transferring
  - Updated all greeting messages to include "Press 0 to continue with AI assistance"
  - VIP greetings: "Hello [Name], welcome back! I'm your AI assistant..."
  - Known contacts: "Hello [Name], thank you for calling. I'm here to assist you..."
  - Unknown callers: Dynamic greeting with full menu options
  - Added `getCallsByPhone` method to storage for caller history analysis
  - Added `processCallRecording` function for post-call conversation analysis
  - Integrated sentiment analysis, key topic extraction, and call summarization
  - 90% confidence threshold for AI responses with human escalation detection

## Previous Changes (October 3, 2025)
- **Contact Management with Routing Rules**: Complete contact management system with intelligent call routing
  - Added contact_routes table to schema with action, forwardTo, priority, active, organization_id, updated_at fields
  - Storage methods implemented: createContactRoute, getContactRoutesForPhone, updateContactRoute, deleteContactRoute
  - Re-enabled contact routing in Twilio call handler to fetch and apply routing rules based on caller number
  - Comprehensive UI: Add Contact dialog with all fields including routing options
  - Routing actions supported: AI (default), Forward to Number, Voicemail, Block
  - CSV import functionality for bulk contact uploads
  - E2E tested: contact creation with routing rules confirmed working
  - Note: Organization ID is hardcoded (pre-existing pattern throughout app)
- **Multi-Request Handling**: AI assistant now intelligently breaks down complex messages into sequential tasks
  - OpenAI GPT-4 analyzes user messages to detect multiple distinct requests
  - Each task is executed sequentially with individual processing
  - Combined response with numbered task cards showing structured results
  - Fallback to single-task processing if breakdown fails
  - Frontend displays multi-task cards with task descriptions and data
- **Security Enhancement**: Implemented proper JWT-based authentication with signed tokens (HS256 algorithm)
  - Replaced hardcoded userId with requireAuth middleware
  - All protected routes now verify JWT signatures before allowing access
  - Frontend automatically includes Authorization headers via apiRequest utility
  - Tokens expire after 24 hours with proper verification
  - Fixed query URL construction for parameterized routes with authentication
- **Reliability Enhancement**: Added comprehensive OpenAI error handling with exponential backoff retry logic
  - Retries failed requests up to 3 times with delays: 1s, 2s, 4s
  - Handles rate limits, timeouts, and transient errors gracefully
  - Provides user-friendly fallback messages on persistent failures
- Added comprehensive AI assistant with database schema, backend service, and API routes
- Built Perplexity-style frontend with voice input/output and conversation history
- Successfully tested end-to-end authentication flow, AI command processing, and multi-request handling

## Previous Changes (October 2, 2025)
- Added Todo app with iPhone Reminders-style interface
- Database schema: `todo_categories` and `todos` tables with full CRUD support
- Navigation updated with Todo item in primary menu

## External Dependencies
- **OpenAI API**: GPT-4 for conversation, Whisper for transcription.
- **Twilio**: Voice calls, SMS notifications, phone number management.
- **PostgreSQL**: Primary database.
- **SendGrid**: For email notifications (optional).
- **Slack**: For team notifications (optional).
- **Notion**: For knowledge base synchronization (optional).
- **Telegram**: For alternative notification channel (optional).