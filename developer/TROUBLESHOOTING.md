# Troubleshooting Guide

## Common Issues and Solutions

### Database Issues

#### Database Connection Errors

**Error:** `Connection to database failed`

**Solutions:**
1. Verify DATABASE_URL environment variable
2. Check PostgreSQL service status
3. Test database connectivity

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check service status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### Schema Synchronization Issues

**Error:** `Table does not exist` or schema mismatches

**Solutions:**
```bash
# Push schema changes
npm run db:push

# Reset database (development only)
npm run db:reset

# Verify schema
npm run db:studio
```

#### Contact Sync Errors

**Error:** `Failed to sync contacts from device`

**Solutions:**
1. Check device permissions
2. Verify API endpoint accessibility
3. Review sync data format

```bash
# Test sync endpoint
curl -X POST http://localhost:5000/api/contacts/sync \
  -H "Content-Type: application/json" \
  -d @test-sync-data.json

# Check sync logs
grep "contact sync" logs/combined.log
```

### API Issues

#### 404 Not Found Errors

**Common Causes:**
- Route not registered
- Method mismatch (GET vs POST)
- Incorrect path

**Debug Steps:**
```bash
# List all registered routes
grep -n "app\." server/routes.ts

# Check server logs
tail -f logs/combined.log

# Test specific endpoint
curl -X GET http://localhost:5000/api/contacts
```

#### Rate Limiting Issues

**Error:** `Too many requests`

**Solutions:**
1. Adjust rate limit configuration
2. Implement proper retry logic
3. Use authentication for higher limits

```typescript
// Adjust rate limits in security middleware
export const rateLimiters = {
  general: rateLimit({
    max: 200, // Increase from 100
    windowMs: 1 * 60 * 1000
  })
};
```

#### Authentication Failures

**Error:** `Unauthorized` or token issues

**Solutions:**
1. Verify JWT secret configuration
2. Check token expiration
3. Validate token format

```bash
# Check JWT secret
echo $JWT_SECRET

# Test authentication endpoint
curl -X GET http://localhost:5000/api/auth/user \
  -H "Authorization: Bearer your-token"
```

### Frontend Issues

#### WebSocket Connection Failures

**Error:** WebSocket connection refused

**Solutions:**
1. Verify WebSocket endpoint
2. Check proxy configuration
3. Ensure proper protocol (ws/wss)

```typescript
// Debug WebSocket connection
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}/ws`;
console.log('Connecting to:', wsUrl);
```

#### Component Rendering Issues

**Error:** Components not updating or hydration mismatches

**Solutions:**
1. Check React Query cache invalidation
2. Verify state management
3. Review component dependencies

```typescript
// Force query refetch
queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });

// Check query state
const { data, error, isLoading } = useQuery({
  queryKey: ['/api/contacts'],
  enabled: true // Ensure query is enabled
});
```

#### Mobile Responsiveness Issues

**Common Problems:**
- Layout breaks on mobile
- Touch targets too small
- Viewport issues

**Solutions:**
```css
/* Ensure proper viewport */
<meta name="viewport" content="width=device-width, initial-scale=1">

/* Touch-friendly targets */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* Test responsive breakpoints */
@media (max-width: 768px) {
  /* Mobile styles */
}
```

### External Service Issues

#### OpenAI API Errors

**Error:** `OpenAI API key invalid` or `Rate limit exceeded`

**Solutions:**
1. Verify API key format
2. Check usage limits
3. Implement retry logic

```bash
# Test OpenAI API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check rate limits
curl -I https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

#### Twilio Integration Issues

**Error:** `Twilio webhook authentication failed`

**Solutions:**
1. Verify webhook URL configuration
2. Check account SID and auth token
3. Validate webhook signatures

```bash
# Test Twilio credentials
curl -X GET https://api.twilio.com/2010-04-01/Accounts.json \
  -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN

# Check webhook configuration
curl -X GET https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers.json \
  -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN
```

### Mobile App Issues

#### iOS Build Failures

**Common Errors:**
- Code signing issues
- Missing permissions
- Provisioning profile problems

**Solutions:**
```bash
# Clean and rebuild
npx cap sync ios
npx cap open ios

# In Xcode:
# 1. Clean Build Folder (Cmd+Shift+K)
# 2. Check signing & capabilities
# 3. Verify bundle identifier
```

#### Android Build Failures

**Common Errors:**
- SDK version mismatches
- Gradle issues
- Permission problems

**Solutions:**
```bash
# Clean Android build
cd android
./gradlew clean

# Update dependencies
npx cap sync android

# Check SDK versions
npx cap doctor android
```

#### Contact Access Issues

**Error:** `Permission denied` for contacts

**Solutions:**
1. Check permission declarations
2. Verify runtime permission requests
3. Test on real devices

```xml
<!-- Android permissions -->
<uses-permission android:name="android.permission.READ_CONTACTS" />

<!-- iOS Info.plist -->
<key>NSContactsUsageDescription</key>
<string>Access contacts for intelligent call routing</string>
```

### Performance Issues

#### Slow Database Queries

**Symptoms:**
- Long response times
- High CPU usage
- Memory consumption

**Solutions:**
```sql
-- Add database indexes
CREATE INDEX idx_contacts_phone ON contacts USING gin(phone_numbers);
CREATE INDEX idx_calls_created_at ON calls(created_at DESC);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM contacts WHERE phone_numbers @> '["555-0123"]';
```

#### Memory Leaks

**Symptoms:**
- Increasing memory usage
- Browser crashes
- Slow performance

**Solutions:**
```typescript
// Cleanup WebSocket connections
useEffect(() => {
  const ws = new WebSocket(wsUrl);
  
  return () => {
    ws.close(); // Important: cleanup on unmount
  };
}, []);

// Cleanup query subscriptions
useEffect(() => {
  const subscription = queryClient.getQueryCache().subscribe(/* ... */);
  
  return () => {
    subscription(); // Cleanup subscription
  };
}, []);
```

#### Bundle Size Issues

**Solutions:**
```bash
# Analyze bundle size
npm run build -- --analyze

# Implement code splitting
const ContactManager = lazy(() => import('./ContactManager'));

# Optimize images
# Use WebP format
# Implement lazy loading
```

### Security Issues

#### CORS Errors

**Error:** `Access to fetch blocked by CORS policy`

**Solutions:**
```typescript
// Configure CORS properly
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://yourdomain.com'
  ],
  credentials: true
}));
```

#### CSP Violations

**Error:** `Content Security Policy directive violated`

**Solutions:**
```typescript
// Update CSP configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Adjust as needed
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
```

## Development Environment Issues

### Node.js Version Conflicts

**Error:** `Node version not supported`

**Solutions:**
```bash
# Use Node Version Manager
nvm install 18
nvm use 18

# Verify version
node --version # Should be 18.x.x
```

### Package Installation Issues

**Error:** `npm install fails` or dependency conflicts

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Use specific npm version
npm install -g npm@latest
```

### Environment Variable Issues

**Error:** `Environment variable not found`

**Solutions:**
```bash
# Check environment variables
printenv | grep -i database

# Load environment file
source .env

# Verify in application
console.log('DATABASE_URL:', process.env.DATABASE_URL);
```

## Debugging Techniques

### Server-Side Debugging

```typescript
// Add detailed logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'debug.log' })
  ]
});

// Log requests
app.use((req, res, next) => {
  logger.info('Request', {
    method: req.method,
    url: req.url,
    body: req.body,
    headers: req.headers
  });
  next();
});
```

### Client-Side Debugging

```typescript
// React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      {/* Your app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}

// Debug WebSocket events
websocket.addEventListener('message', (event) => {
  console.log('WebSocket message:', JSON.parse(event.data));
});

websocket.addEventListener('error', (error) => {
  console.error('WebSocket error:', error);
});
```

### Database Debugging

```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Monitor active connections
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Check slow queries
SELECT query, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

## Performance Monitoring

### Application Metrics

```typescript
// Performance monitoring
const performanceMetrics = {
  requestCount: 0,
  totalResponseTime: 0,
  errorCount: 0,
  
  recordRequest(responseTime: number, hasError: boolean) {
    this.requestCount++;
    this.totalResponseTime += responseTime;
    if (hasError) this.errorCount++;
  },
  
  getAverageResponseTime() {
    return this.totalResponseTime / this.requestCount;
  },
  
  getErrorRate() {
    return this.errorCount / this.requestCount;
  }
};
```

### Health Check Implementation

```typescript
// Comprehensive health check
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
  };
  
  try {
    // Database check
    await db.select().from(users).limit(1);
    health.checks.database = 'healthy';
  } catch (error) {
    health.checks.database = 'unhealthy';
    health.status = 'unhealthy';
  }
  
  // External services check
  if (process.env.OPENAI_API_KEY) {
    try {
      // Test OpenAI connection
      health.checks.openai = 'configured';
    } catch (error) {
      health.checks.openai = 'error';
    }
  }
  
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

## Getting Help

### Log Analysis

```bash
# Search for specific errors
grep -i "error" logs/combined.log | tail -20

# Filter by timestamp
grep "2024-01-01" logs/combined.log

# Count error types
grep -o "Error: [^,]*" logs/error.log | sort | uniq -c
```

### Performance Profiling

```bash
# Node.js performance profiling
node --inspect server/index.js

# Memory usage analysis
node --inspect --max-old-space-size=4096 server/index.js
```

### Community Resources

- GitHub Issues: Check for similar problems
- Stack Overflow: Search for error messages
- Documentation: Review API documentation
- Discord/Slack: Join developer communities

Remember to include relevant error messages, environment details, and steps to reproduce when seeking help.