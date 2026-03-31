# Developer Training Guide

## Step-by-Step Development Training

### Phase 1: Understanding the Architecture

#### 1. Project Structure Analysis (30 minutes)

**Learning Objectives:**
- Understand the full-stack architecture
- Identify key components and their relationships
- Learn the data flow between frontend and backend

**Hands-On Exercise:**
```bash
# 1. Explore the project structure
find . -type f -name "*.ts" -o -name "*.tsx" | head -20

# 2. Examine the database schema
cat shared/schema.ts

# 3. Review API endpoints
grep -n "app\." server/routes.ts | head -10
```

**Key Files to Study:**
- `shared/schema.ts` - Database models and types
- `server/routes.ts` - API endpoint definitions
- `server/storage.ts` - Database operations
- `client/src/App.tsx` - Frontend routing
- `client/src/pages/dashboard.tsx` - Main dashboard

#### 2. Database Schema Deep Dive (45 minutes)

**Tables Overview:**
```sql
-- Core entities
users           -- User authentication
calls           -- Call records and metadata
voicemails      -- Voicemail recordings and transcriptions
contacts        -- Contact information from mobile sync
contact_routes  -- Call routing rules per contact
call_routes     -- General call routing rules
notifications   -- Multi-channel notification logs
ai_config       -- AI assistant configuration
device_syncs    -- Mobile device sync tracking
```

**Hands-On Exercise:**
```bash
# Connect to database and explore
npm run db:push
# Review schema in your database client
```

### Phase 2: Backend Development (2 hours)

#### 1. API Endpoint Development (60 minutes)

**Exercise: Create a New Endpoint**

Create a contact statistics endpoint:

```typescript
// Add to server/routes.ts
app.get('/api/contacts/stats', async (req, res) => {
  try {
    const contacts = await storage.getContacts();
    const stats = {
      total: contacts.length,
      vip: contacts.filter(c => c.isVip).length,
      withRoutes: contacts.filter(c => 
        contactRoutes.some(r => r.contactId === c.id)
      ).length,
      syncSources: contacts.reduce((acc, c) => {
        acc[c.syncSource || 'manual'] = (acc[c.syncSource || 'manual'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get contact stats' });
  }
});
```

**Testing Your Endpoint:**
```bash
curl http://localhost:5000/api/contacts/stats
```

#### 2. Database Operations (60 minutes)

**Exercise: Add New Storage Method**

Add contact search functionality:

```typescript
// Add to server/storage.ts in DatabaseStorage class
async searchContacts(query: string): Promise<Contact[]> {
  const searchTerm = `%${query.toLowerCase()}%`;
  
  return await db.select()
    .from(contacts)
    .where(
      or(
        ilike(contacts.firstName, searchTerm),
        ilike(contacts.lastName, searchTerm),
        ilike(contacts.company, searchTerm),
        ilike(contacts.email, searchTerm)
      )
    )
    .limit(50);
}
```

**Add to IStorage interface:**
```typescript
searchContacts(query: string): Promise<Contact[]>;
```

### Phase 3: Frontend Development (2 hours)

#### 1. Component Development (60 minutes)

**Exercise: Create Contact Search Component**

```tsx
// Create client/src/components/ContactSearch.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';

export function ContactSearch() {
  const [query, setQuery] = useState('');
  
  const { data: results, isLoading } = useQuery({
    queryKey: ['/api/contacts/search', query],
    queryFn: () => apiRequest('GET', `/api/contacts/search?q=${query}`),
    enabled: query.length > 2,
  });

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search contacts..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      
      {isLoading && <div>Searching...</div>}
      
      {results && (
        <div className="space-y-2">
          {results.map((contact: any) => (
            <div key={contact.id} className="p-2 border rounded">
              <p className="font-medium">
                {contact.firstName} {contact.lastName}
              </p>
              <p className="text-sm text-gray-600">{contact.company}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 2. State Management (60 minutes)

**Exercise: Implement Contact Management State**

Study the existing patterns in:
- `client/src/components/dashboard/ContactManager.tsx`
- `client/src/hooks/useWebSocket.ts`
- `client/src/lib/queryClient.ts`

**Key Patterns:**
1. **React Query for Server State**
2. **WebSocket for Real-time Updates**
3. **Local State for UI State**

### Phase 4: Mobile Development (1.5 hours)

#### 1. Mobile Optimization (45 minutes)

**Study Mobile-First CSS:**
```css
/* client/src/index.css - Mobile optimization patterns */
@media (max-width: 768px) {
  .mobile-nav { /* Fixed bottom navigation */ }
  .mobile-header { /* Fixed top header */ }
  .mobile-content { /* Safe area content */ }
}

/* Touch targets */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* iOS safe areas */
.safe-area-top { padding-top: env(safe-area-inset-top); }
```

#### 2. Contact Sync Implementation (45 minutes)

**Study the Contact Sync API:**
```typescript
// client/src/lib/contactSync.ts
export class ContactSyncAPI {
  async syncContacts(deviceInfo: DeviceInfo, contacts: MobileContact[]): Promise<SyncResponse>
  async getSyncStatus(deviceId: string): Promise<any>
}
```

**Exercise: Test Contact Sync**
```typescript
// Create a test sync
const syncAPI = new ContactSyncAPI();
const testDevice = {
  deviceId: 'test-device-123',
  deviceType: 'ios',
  deviceName: 'Test iPhone',
  osVersion: '17.0',
  appVersion: '1.0.0'
};

const testContacts = [
  {
    id: 'test-1',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumbers: ['+1234567890'],
    email: 'john@example.com'
  }
];

// Test the sync
syncAPI.syncContacts(testDevice, testContacts)
  .then(result => console.log('Sync result:', result))
  .catch(error => console.error('Sync error:', error));
```

### Phase 5: Security Implementation (1 hour)

#### 1. Security Middleware (30 minutes)

**Study Security Implementation:**
```typescript
// server/middleware/security.ts patterns
import { rateLimiters, validators, securityHeaders } from './middleware/security';

// Apply security middleware
app.use(securityHeaders);
app.use('/api/', rateLimiters.general);
app.use('/api/auth/', rateLimiters.auth);
app.use('/api/contacts/sync', rateLimiters.sync);
```

**Exercise: Add Input Validation**
```typescript
// Add validation to your new endpoint
app.post('/api/contacts/bulk',
  validators.contact,
  handleValidationErrors,
  async (req, res) => {
    // Your endpoint logic
  }
);
```

#### 2. Data Encryption (30 minutes)

**Exercise: Encrypt Sensitive Data**
```typescript
import { DataEncryption } from './middleware/security';

// Encrypt phone numbers before storage
const encryptedPhone = DataEncryption.encrypt(phoneNumber);

// Decrypt when needed
const decryptedPhone = DataEncryption.decrypt(encryptedPhone);

// Hash for searching
const phoneHash = DataEncryption.hashPhoneNumber(phoneNumber);
```

### Phase 6: Testing and Debugging (1 hour)

#### 1. API Testing (30 minutes)

**Manual Testing Checklist:**
```bash
# Test contact endpoints
curl -X GET http://localhost:5000/api/contacts
curl -X POST http://localhost:5000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","phoneNumbers":["+1234567890"]}'

# Test contact sync
curl -X POST http://localhost:5000/api/contacts/sync \
  -H "Content-Type: application/json" \
  -d @test-sync-data.json

# Test AI integration
curl -X POST http://localhost:5000/api/ai/test \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello, this is a test message"}'
```

#### 2. Frontend Testing (30 minutes)

**Testing Components:**
1. Open browser dev tools
2. Navigate to dashboard
3. Test contact management features
4. Verify WebSocket connections
5. Test mobile responsiveness

**Common Issues and Solutions:**
- **CORS errors**: Check server configuration
- **WebSocket failures**: Verify port and protocol
- **Database errors**: Check schema and migrations
- **Mobile layout issues**: Test CSS breakpoints

### Phase 7: Deployment and Production (45 minutes)

#### 1. Environment Configuration (20 minutes)

**Production Checklist:**
```bash
# Environment variables required
DATABASE_URL=postgresql://...
ENCRYPTION_KEY=your-secure-key
JWT_SECRET=your-jwt-secret

# Optional for full functionality
OPENAI_API_KEY=sk-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

#### 2. Mobile App Deployment (25 minutes)

**iOS App Store Deployment:**
```bash
# Install Capacitor
npm install @capacitor/ios @capacitor/cli

# Build for production
npm run build

# Add iOS platform
npx cap add ios

# Sync and open in Xcode
npx cap sync ios
npx cap open ios
```

**Android Play Store Deployment:**
```bash
# Add Android platform
npx cap add android

# Sync and open in Android Studio
npx cap sync android
npx cap open android
```

### Advanced Topics

#### 1. Custom AI Training
- Implement custom prompts for industry-specific use cases
- Train models on call transcription data
- Implement feedback loops for continuous improvement

#### 2. Advanced Call Routing
- Implement machine learning-based caller intent detection
- Add sentiment analysis for call prioritization
- Create dynamic routing based on call volume

#### 3. Scalability Considerations
- Database sharding strategies for large contact databases
- CDN implementation for mobile app assets
- Load balancing for high-volume call handling

### Best Practices Checklist

**Code Quality:**
- [ ] TypeScript strict mode enabled
- [ ] Consistent error handling patterns
- [ ] Proper input validation on all endpoints
- [ ] Security headers on all responses
- [ ] Rate limiting on public endpoints

**Database:**
- [ ] Indexes on frequently queried columns
- [ ] Foreign key constraints properly defined
- [ ] Sensitive data encrypted at rest
- [ ] Regular backup procedures

**Frontend:**
- [ ] Mobile-first responsive design
- [ ] Accessibility standards compliance
- [ ] Progressive Web App features
- [ ] Offline functionality where appropriate

**Security:**
- [ ] All inputs validated and sanitized
- [ ] Authentication required for sensitive operations
- [ ] HTTPS enforced in production
- [ ] Security headers properly configured
- [ ] Regular security audits scheduled

### Troubleshooting Guide

**Common Development Issues:**

1. **Database Connection Errors**
   - Verify DATABASE_URL environment variable
   - Check PostgreSQL service status
   - Run `npm run db:push` to sync schema

2. **API Endpoint 404 Errors**
   - Verify route registration in server/routes.ts
   - Check method and path spelling
   - Ensure server restart after changes

3. **Frontend Build Errors**
   - Clear node_modules and reinstall
   - Check for TypeScript type errors
   - Verify import paths

4. **Mobile App Issues**
   - Check Capacitor configuration
   - Verify platform-specific permissions
   - Test on actual devices, not just simulators

### Next Steps for Advanced Development

1. **Contribute to Core Features**
   - Add new AI capabilities
   - Implement advanced call routing
   - Enhance mobile synchronization

2. **Custom Integrations**
   - CRM system integration
   - Custom notification channels
   - Third-party API integrations

3. **Performance Optimization**
   - Database query optimization
   - Frontend bundle size reduction
   - Mobile app performance tuning

### Resources and Documentation

- **API Reference**: `developer/API.md`
- **Security Guide**: `developer/SECURITY.md`
- **Mobile Development**: `developer/MOBILE.md`
- **Deployment Guide**: `developer/DEPLOYMENT.md`