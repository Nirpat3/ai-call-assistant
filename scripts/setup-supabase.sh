#!/bin/bash
# Migrate from Neon to Supabase
#
# 1. Create a Supabase project at https://supabase.com/dashboard
# 2. Get your connection string from Settings → Database → Connection string (URI)
# 3. Replace DATABASE_URL in your .env (or Replit Secrets)
#
# The connection string format:
#   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
#
# For Replit: Add as a Secret named DATABASE_URL
# For local: Add to .env file

echo "=== Supabase Migration Guide ==="
echo ""
echo "1. Go to https://supabase.com/dashboard and create a new project"
echo "   - Name: ai-call-assistant"
echo "   - Region: pick closest to your users"
echo "   - Generate a strong database password"
echo ""
echo "2. Once created, go to Settings → Database → Connection string"
echo "   Copy the URI (Transaction pooler mode for serverless)"
echo ""
echo "3. Update your DATABASE_URL:"
echo "   - Replit: Secrets → DATABASE_URL → paste new URI"
echo "   - Local:  Edit .env → DATABASE_URL=postgresql://..."
echo ""
echo "4. Push schema to Supabase:"
echo "   npm run db:push"
echo ""
echo "5. (Optional) Enable Supabase Realtime for push notification fallback:"
echo "   Supabase Dashboard → Database → Replication → Enable for 'persisted_notifications' table"
echo ""
echo "6. Verify:"
echo "   npm run dev"
echo "   # Check that calls, contacts, notifications work"
echo ""

# If DATABASE_URL is set, test the connection
if [ -n "$DATABASE_URL" ]; then
  echo "Testing current DATABASE_URL connection..."
  node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.query('SELECT NOW() as time, current_database() as db')
      .then(r => { console.log('Connected:', r.rows[0]); pool.end(); })
      .catch(e => { console.error('Failed:', e.message); pool.end(); });
  " 2>/dev/null || echo "Connection test requires pg module — run from project root with: node -e '...'"
fi
