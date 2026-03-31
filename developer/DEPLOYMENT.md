# Deployment Guide

## Overview

This guide covers deploying the AI Call Assistant to production environments, including cloud platforms, security configurations, and monitoring setup.

## Production Environment Setup

### Environment Variables

**Required Production Variables:**
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Security
ENCRYPTION_KEY=your-256-bit-encryption-key
JWT_SECRET=your-jwt-secret-key
SESSION_SECRET=your-session-secret

# External Services (Optional)
OPENAI_API_KEY=sk-your-openai-key
TWILIO_ACCOUNT_SID=ACyour-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1your-twilio-number

# Notification Services (Optional)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
SENDGRID_API_KEY=your-sendgrid-key

# Production Settings
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Security Configuration

**SSL/TLS Setup:**
```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.3 TLSv1.2;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## Cloud Platform Deployment

### Replit Deployment

**Automatic Deployment:**
The application is automatically deployable on Replit with zero configuration.

```bash
# The application is ready for deployment
# Click the "Deploy" button in your Replit interface
```

**Features Available:**
- Automatic HTTPS
- Custom domain support
- Environment variable management
- Database hosting
- Auto-scaling

### AWS Deployment

**EC2 Instance Setup:**
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Setup application
git clone your-repo
cd ai-call-assistant
npm install
npm run build

# Setup environment
sudo cp .env.example .env.production
sudo nano .env.production

# Setup systemd service
sudo cp deployment/ai-call-assistant.service /etc/systemd/system/
sudo systemctl enable ai-call-assistant
sudo systemctl start ai-call-assistant
```

**SystemD Service File:**
```ini
# /etc/systemd/system/ai-call-assistant.service
[Unit]
Description=AI Call Assistant
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/ai-call-assistant
Environment=NODE_ENV=production
EnvironmentFile=/home/ubuntu/ai-call-assistant/.env.production
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Google Cloud Platform

**App Engine Deployment:**
```yaml
# app.yaml
runtime: nodejs18

env_variables:
  NODE_ENV: production
  DATABASE_URL: your-database-url

automatic_scaling:
  min_instances: 1
  max_instances: 10
  target_cpu_utilization: 0.6

handlers:
- url: /.*
  script: auto
```

**Cloud Run Deployment:**
```bash
# Build Docker image
docker build -t gcr.io/PROJECT-ID/ai-call-assistant .

# Deploy to Cloud Run
gcloud run deploy ai-call-assistant \
  --image gcr.io/PROJECT-ID/ai-call-assistant \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start application
CMD ["npm", "start"]
```

**Docker Compose for Development:**
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/ai_call_assistant
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: ai_call_assistant
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

## Database Management

### Production Database Setup

**PostgreSQL Configuration:**
```sql
-- Create production database
CREATE DATABASE ai_call_assistant_prod;
CREATE USER ai_app WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE ai_call_assistant_prod TO ai_app;

-- Enable required extensions
\c ai_call_assistant_prod;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

**Database Migration:**
```bash
# Run database migrations
npm run db:push

# Verify database schema
npm run db:studio
```

### Backup Strategy

**Automated Backups:**
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

pg_dump $DATABASE_URL > /backups/$BACKUP_FILE
gzip /backups/$BACKUP_FILE

# Upload to cloud storage
aws s3 cp /backups/${BACKUP_FILE}.gz s3://your-backup-bucket/

# Cleanup old backups (keep 30 days)
find /backups -name "backup_*.sql.gz" -mtime +30 -delete
```

## Monitoring and Logging

### Application Monitoring

**Health Check Endpoint:**
```typescript
// Add to server/routes.ts
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await db.select().from(users).limit(1);
    
    // Check external services
    const checks = {
      database: 'healthy',
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
      twilio: process.env.TWILIO_ACCOUNT_SID ? 'configured' : 'not_configured',
      timestamp: new Date().toISOString()
    };
    
    res.json({ status: 'healthy', checks });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

**Performance Monitoring:**
```typescript
// Performance monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  next();
});
```

### Log Management

**Structured Logging:**
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ai-call-assistant' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

## Security Hardening

### Server Security

**Firewall Configuration:**
```bash
# UFW firewall setup
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

**Fail2Ban Configuration:**
```ini
# /etc/fail2ban/jail.d/ai-call-assistant.conf
[ai-call-assistant]
enabled = true
port = 80,443
filter = ai-call-assistant
logpath = /var/log/ai-call-assistant/access.log
maxretry = 5
bantime = 3600
```

### Database Security

**Connection Security:**
```bash
# PostgreSQL security settings
sudo nano /etc/postgresql/15/main/postgresql.conf

# Enable SSL
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'

# Restrict connections
listen_addresses = 'localhost'
```

## Performance Optimization

### Application Optimization

**Production Build:**
```bash
# Optimize build for production
npm run build

# Enable compression
npm install compression
```

**Caching Strategy:**
```typescript
import compression from 'compression';
import { createClient } from 'redis';

// Enable compression
app.use(compression());

// Redis caching
const redis = createClient({ url: process.env.REDIS_URL });

app.use('/api/contacts', async (req, res, next) => {
  const cacheKey = `contacts:${req.user.id}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  
  next();
});
```

### Database Optimization

**Index Creation:**
```sql
-- Add indexes for better performance
CREATE INDEX idx_contacts_phone ON contacts USING gin(phone_numbers);
CREATE INDEX idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_contact_routes_contact_id ON contact_routes(contact_id);
```

## CDN and Static Assets

### CloudFlare Setup

**DNS Configuration:**
```
Type: A
Name: @
Content: your-server-ip
Proxy: Enabled

Type: CNAME
Name: www
Content: yourdomain.com
Proxy: Enabled
```

**Security Settings:**
- SSL/TLS: Full (strict)
- Security Level: Medium
- Bot Fight Mode: Enabled
- Rate Limiting: 100 requests per minute

### Static Asset Optimization

**Asset Compression:**
```bash
# Compress static assets
gzip -k -9 dist/assets/*.js
gzip -k -9 dist/assets/*.css
```

## Backup and Recovery

### Automated Backup Script

```bash
#!/bin/bash
# production-backup.sh

# Database backup
pg_dump $DATABASE_URL | gzip > "/backups/db_$(date +%Y%m%d_%H%M%S).sql.gz"

# Application backup
tar -czf "/backups/app_$(date +%Y%m%d_%H%M%S).tar.gz" \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='logs' \
  /path/to/ai-call-assistant

# Upload to cloud storage
aws s3 sync /backups s3://your-backup-bucket/backups/

# Cleanup old backups
find /backups -name "*.gz" -mtime +7 -delete
```

### Disaster Recovery Plan

**Recovery Steps:**
1. Provision new server infrastructure
2. Restore latest database backup
3. Deploy latest application code
4. Update DNS records
5. Verify all systems operational

**Recovery Time Objectives:**
- Database restore: < 30 minutes
- Application deployment: < 15 minutes
- DNS propagation: < 5 minutes
- Total recovery time: < 1 hour

## Mobile App Distribution

### iOS App Store

**Production Build:**
```bash
# Build for iOS production
npx cap sync ios
npx cap open ios

# In Xcode:
# 1. Set scheme to "Release"
# 2. Archive the app
# 3. Upload to App Store Connect
```

### Google Play Store

**Production Build:**
```bash
# Build for Android production
npx cap sync android
npx cap open android

# In Android Studio:
# 1. Build > Generate Signed Bundle/APK
# 2. Upload to Play Console
```

## Monitoring and Alerting

### Uptime Monitoring

**Health Check Monitoring:**
```bash
# Setup monitoring script
#!/bin/bash
ENDPOINT="https://yourdomain.com/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $ENDPOINT)

if [ $RESPONSE != "200" ]; then
  # Send alert
  curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID" \
    -d "text=🚨 AI Call Assistant is down! HTTP $RESPONSE"
fi
```

### Performance Alerts

**CPU and Memory Monitoring:**
```bash
# System monitoring script
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.2f", $3/$2 * 100.0)}')

if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
  echo "High CPU usage: $CPU_USAGE%"
fi

if (( $(echo "$MEMORY_USAGE > 85" | bc -l) )); then
  echo "High memory usage: $MEMORY_USAGE%"
fi
```

## Scaling Considerations

### Horizontal Scaling

**Load Balancer Configuration:**
```nginx
upstream ai_call_assistant {
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
}

server {
    location / {
        proxy_pass http://ai_call_assistant;
    }
}
```

### Database Scaling

**Read Replicas:**
```typescript
// Database connection with read replicas
const primaryDb = drizzle(primaryPool, { schema });
const replicaDb = drizzle(replicaPool, { schema });

// Use replica for read operations
const getContacts = () => replicaDb.select().from(contacts);

// Use primary for write operations
const createContact = (data) => primaryDb.insert(contacts).values(data);
```

This comprehensive deployment guide provides everything needed to successfully deploy, monitor, and maintain the AI Call Assistant in production environments with enterprise-level security and performance.