# API Reference

The AI Call Assistant provides a comprehensive REST API for integration with external systems.

## Base URL
```
https://your-domain.com/api
```

## Authentication

All API requests require authentication using JWT tokens.

### Getting an API Token
1. Log in to the dashboard
2. Go to System Settings > Security
3. Generate a new API token
4. Include the token in request headers:

```http
Authorization: Bearer your_jwt_token
```

## Core Endpoints

### Call Management

#### Get Calls
```http
GET /api/calls
```

Query Parameters:
- `page` (number): Page number for pagination
- `limit` (number): Number of results per page
- `status` (string): Filter by call status
- `from_date` (string): Filter calls from date (ISO 8601)
- `to_date` (string): Filter calls to date (ISO 8601)

Response:
```json
{
  "calls": [
    {
      "id": "call_123",
      "caller_number": "+1234567890",
      "duration": 180,
      "status": "completed",
      "ai_handled": true,
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "pages": 25
  }
}
```

#### Get Call Details
```http
GET /api/calls/{call_id}
```

Response:
```json
{
  "id": "call_123",
  "caller_number": "+1234567890",
  "caller_name": "John Doe",
  "duration": 180,
  "status": "completed",
  "ai_handled": true,
  "transcript": "Hello, I'd like to inquire about...",
  "sentiment": "positive",
  "intent": "sales_inquiry",
  "routing_decision": "sales_team",
  "created_at": "2025-01-01T12:00:00Z",
  "recordings": [
    {
      "url": "https://recordings.com/call_123.mp3",
      "duration": 180
    }
  ]
}
```

### Contact Management

#### List Contacts
```http
GET /api/contacts
```

#### Create Contact
```http
POST /api/contacts
```

Request Body:
```json
{
  "name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "is_vip": false,
  "routing_preference": "sales"
}
```

#### Update Contact
```http
PUT /api/contacts/{contact_id}
```

#### Delete Contact
```http
DELETE /api/contacts/{contact_id}
```

### AI Configuration

#### Get AI Config
```http
GET /api/ai-config
```

Response:
```json
{
  "id": 1,
  "greeting": "Hello, this is Maya, your AI assistant...",
  "personality": "professional",
  "confidence_threshold": 0.8,
  "fallback_to_human": true,
  "business_hours": {
    "enabled": true,
    "monday": { "start": "09:00", "end": "17:00" },
    "tuesday": { "start": "09:00", "end": "17:00" }
  }
}
```

#### Update AI Config
```http
PUT /api/ai-config
```

### Analytics

#### Get Dashboard Stats
```http
GET /api/dashboard/stats
```

Response:
```json
{
  "calls_today": 45,
  "ai_handled": 38,
  "automation_rate": 84.4,
  "avg_duration": 125,
  "customer_satisfaction": 4.6
}
```

#### Get Call Analytics
```http
GET /api/analytics/calls
```

Query Parameters:
- `period` (string): Time period (day, week, month, year)
- `from_date` (string): Start date
- `to_date` (string): End date

### Notifications

#### Get Notifications
```http
GET /api/notifications
```

#### Mark as Read
```http
PUT /api/notifications/{notification_id}/read
```

## Webhooks

Configure webhooks to receive real-time notifications about call events.

### Setup
1. Go to System Settings > Integrations
2. Add webhook URL
3. Select events to receive

### Webhook Events

#### Call Started
```json
{
  "event": "call.started",
  "data": {
    "call_id": "call_123",
    "caller_number": "+1234567890",
    "timestamp": "2025-01-01T12:00:00Z"
  }
}
```

#### Call Completed
```json
{
  "event": "call.completed",
  "data": {
    "call_id": "call_123",
    "duration": 180,
    "ai_handled": true,
    "outcome": "resolved",
    "timestamp": "2025-01-01T12:03:00Z"
  }
}
```

## Rate Limiting

API requests are limited to:
- 1000 requests per hour for standard endpoints
- 100 requests per hour for analytics endpoints

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Error Handling

Standard HTTP status codes are used:

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

Error Response Format:
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request is missing required fields",
    "details": {
      "missing_fields": ["name", "phone"]
    }
  }
}
```

## SDK Libraries

Official SDKs available:
- JavaScript/Node.js
- Python
- PHP
- Ruby

Example using Node.js SDK:
```javascript
const AICallAssistant = require('@ai-call-assistant/sdk');

const client = new AICallAssistant({
  apiToken: 'your_token_here',
  baseUrl: 'https://your-domain.com/api'
});

// Get recent calls
const calls = await client.calls.list({
  limit: 10,
  status: 'completed'
});
```

For more examples and detailed endpoint documentation, see the individual endpoint guides.