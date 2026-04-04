#!/bin/bash
# Generate VAPID keys for Web Push notifications
# Run this once, then add the keys to your .env file

echo "Generating VAPID keys for Web Push..."
KEYS=$(npx web-push generate-vapid-keys --json 2>/dev/null)

PUBLIC_KEY=$(echo "$KEYS" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');console.log(JSON.parse(d).publicKey)")
PRIVATE_KEY=$(echo "$KEYS" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');console.log(JSON.parse(d).privateKey)")

echo ""
echo "Add these to your .env file:"
echo ""
echo "VAPID_PUBLIC_KEY=$PUBLIC_KEY"
echo "VAPID_PRIVATE_KEY=$PRIVATE_KEY"
echo "VAPID_SUBJECT=mailto:your-email@example.com"
echo ""

# Auto-append to .env if it exists
if [ -f .env ]; then
  if ! grep -q "VAPID_PUBLIC_KEY" .env; then
    echo "" >> .env
    echo "# Web Push VAPID keys (generated $(date +%Y-%m-%d))" >> .env
    echo "VAPID_PUBLIC_KEY=$PUBLIC_KEY" >> .env
    echo "VAPID_PRIVATE_KEY=$PRIVATE_KEY" >> .env
    echo "VAPID_SUBJECT=mailto:support@aicallassistant.com" >> .env
    echo "Keys auto-appended to .env"
  else
    echo "VAPID keys already exist in .env — not overwriting"
  fi
else
  echo "No .env file found — create one and add the keys above"
fi
