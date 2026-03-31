# API Documentation

## Overview

The AI Call Assistant API provides secure endpoints for managing contacts, call routing, AI configuration, and mobile device synchronization. All endpoints use HTTPS and include comprehensive security measures.

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:5000/api
```

## Authentication

All API endpoints use JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Rate Limiting

- **General endpoints**: 100 requests per minute per IP
- **Sync endpoints**: 10 requests per minute per device
- **Webhook endpoints**: 1000 requests per minute (from Twilio)

## Contact Management Endpoints

### GET /api/contacts

Retrieve all contacts for the authenticated user.

**Response:**
```json
{
  "contacts": [
    {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumbers": ["+1234567890"],
      "email": "john@example.com",
      "company": "Example Corp",
      "department": "Sales",
      "title": "Manager",
      "isVip": false,
      "syncSource": "ios",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/contacts

Create a new contact.

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumbers": ["+1987654321"],
  "email": "jane@example.com",
  "company": "Tech Inc",
  "isVip": true
}
```

### PUT /api/contacts/:id

Update an existing contact.

### DELETE /api/contacts/:id

Delete a contact.

## Contact Synchronization

### POST /api/contacts/sync

Synchronize contacts from mobile devices.

**Request Body:**
```json
{
  "deviceId": "unique-device-identifier",
  "deviceType": "ios",
  "deviceName": "iPhone 15 Pro",
  "contacts": [
    {
      "syncId": "device-contact-id",
      "firstName": "Contact",
      "lastName": "Name",
      "phoneNumbers": ["+1234567890"],
      "email": "contact@example.com"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "syncedContacts": 25,
  "deviceSync": {
    "id": 1,
    "deviceId": "unique-device-identifier",
    "lastSyncAt": "2024-01-01T00:00:00Z",
    "totalContacts": 25,
    "syncStatus": "completed"
  }
}
```

## Contact Routing

### GET /api/contact-routes

Get all contact routing rules.

### POST /api/contact-routes

Create a new contact routing rule.

**Request Body:**
```json
{
  "contactId": 1,
  "phoneNumber": "+1234567890",
  "action": "ai",
  "forwardTo": "+1987654321",
  "priority": 1,
  "businessHoursOnly": false,
  "active": true
}
```

**Actions:**
- `ai`: Route to AI assistant
- `forward`: Forward to another number
- `voicemail`: Send directly to voicemail
- `block`: Block the caller

### GET /api/contact-routes/phone/:phoneNumber

Get routing rules for a specific phone number.

## Call Management

### GET /api/calls/recent

Get recent calls with pagination.

**Query Parameters:**
- `limit`: Number of calls to return (default: 50, max: 100)
- `offset`: Number of calls to skip for pagination

### GET /api/dashboard/stats

Get dashboard statistics.

**Response:**
```json
{
  "callsToday": 15,
  "aiHandled": 12,
  "automated": 8,
  "voicemails": 3
}
```

## AI Configuration

### GET /api/ai-config

Get current AI configuration.

### PUT /api/ai-config

Update AI configuration.

**Request Body:**
```json
{
  "greeting": "Hello! You've reached our AI assistant.",
  "businessHours": {
    "start": "09:00",
    "end": "18:00",
    "timezone": "EST",
    "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
  },
  "routingRules": [
    {
      "name": "Sales Route",
      "keywords": ["sales", "pricing", "quote"],
      "forwardTo": "+1234567890",
      "priority": 1
    }
  ]
}
```

## Testing Endpoints

### POST /api/ai/test

Test AI integration.

**Request Body:**
```json
{
  "text": "Hello, this is a test message for AI analysis."
}
```

### POST /api/notifications/test/:type

Test notification channels.

**Types:** `sms`, `email`, `whatsapp`, `telegram`

### POST /api/twilio/test-call

Test outbound call functionality.

**Request Body:**
```json
{
  "to": "+1234567890"
}
```

## Webhook Endpoints

### POST /api/twilio/voice

Twilio voice webhook for incoming calls.

### POST /api/twilio/gather

Handle call input gathering.

### POST /api/twilio/voicemail

Handle voicemail recording.

### POST /api/twilio/recording

Process call recordings and transcriptions.

## WebSocket Events

Connect to `/ws` for real-time updates.

**Events:**
- `call_update`: Live call status changes
- `call_ended`: Call completion
- `contact_sync`: Contact synchronization status

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid phone number format",
    "details": {
      "field": "phoneNumber",
      "value": "invalid-phone"
    }
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR`: Invalid request data
- `UNAUTHORIZED`: Missing or invalid authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Security Headers

All responses include security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

## Data Encryption

- All data transmitted over HTTPS/TLS 1.3
- Database fields encrypted at rest using AES-256
- API keys and secrets stored in secure environment variables
- Phone numbers and personal data hashed when stored

## GDPR Compliance

- User data can be exported via `/api/user/export`
- Data deletion available via `/api/user/delete`
- Consent tracking for contact synchronization
- Data processing logs maintained for audit