import webpush from 'web-push';
import { db } from './db';
import { pushSubscriptions, persistedNotifications } from '@shared/schema';
import { eq } from 'drizzle-orm';

// VAPID keys for Web Push Protocol
// Generate once: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@aicallassistant.com';

let pushConfigured = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  pushConfigured = true;
  console.log('[Push] Web Push configured with VAPID keys');
} else {
  console.warn('[Push] VAPID keys not set — push notifications disabled. Run: npx web-push generate-vapid-keys');
}

export function isPushConfigured(): boolean {
  return pushConfigured;
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

// Save a push subscription to the database
export async function savePushSubscription(
  userId: number | null,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string
): Promise<void> {
  try {
    // Upsert — update if endpoint exists, insert if new
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(pushSubscriptions)
        .set({
          userId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent,
          lastUsedAt: new Date(),
        })
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    } else {
      await db.insert(pushSubscriptions).values({
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
      });
    }
    console.log(`[Push] Subscription saved for user ${userId}`);
  } catch (error) {
    console.error('[Push] Failed to save subscription:', error);
    throw error;
  }
}

// Remove a push subscription
export async function removePushSubscription(endpoint: string): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
  console.log(`[Push] Subscription removed: ${endpoint.substring(0, 50)}...`);
}

// Get all subscriptions (optionally filtered by userId)
export async function getSubscriptions(userId?: number) {
  if (userId) {
    return db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }
  return db.select().from(pushSubscriptions);
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  requireInteraction?: boolean;
}

// Send push notification to a specific subscription
async function sendToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<boolean> {
  if (!pushConfigured) {
    console.warn('[Push] Cannot send — VAPID keys not configured');
    return false;
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    // Update last used timestamp
    await db
      .update(pushSubscriptions)
      .set({ lastUsedAt: new Date() })
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    return true;
  } catch (error: any) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription expired or invalid — remove it
      console.log(`[Push] Removing expired subscription: ${subscription.endpoint.substring(0, 50)}...`);
      await removePushSubscription(subscription.endpoint);
    } else {
      console.error(`[Push] Failed to send to ${subscription.endpoint.substring(0, 50)}:`, error.message);
    }
    return false;
  }
}

// Send push notification to a specific user (all their devices)
export async function sendPushToUser(userId: number, payload: PushPayload): Promise<number> {
  const subs = await getSubscriptions(userId);
  let sent = 0;

  for (const sub of subs) {
    const ok = await sendToSubscription(sub, payload);
    if (ok) sent++;
  }

  console.log(`[Push] Sent to ${sent}/${subs.length} devices for user ${userId}`);
  return sent;
}

// Send push notification to ALL subscribed devices (broadcast)
export async function sendPushBroadcast(payload: PushPayload): Promise<number> {
  const subs = await getSubscriptions();
  let sent = 0;

  for (const sub of subs) {
    const ok = await sendToSubscription(sub, payload);
    if (ok) sent++;
  }

  console.log(`[Push] Broadcast sent to ${sent}/${subs.length} devices`);
  return sent;
}

// Persist a notification to the database + send push
export async function createAndPushNotification(
  userId: number | null,
  notification: {
    type: string;
    title: string;
    body?: string;
    data?: Record<string, any>;
    organizationId?: string;
  }
): Promise<void> {
  // Persist to DB
  try {
    await db.insert(persistedNotifications).values({
      userId,
      organizationId: notification.organizationId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      pushSent: false,
    });
  } catch (error) {
    console.error('[Push] Failed to persist notification:', error);
  }

  // Send push to all devices (broadcast if no userId, user-specific otherwise)
  const payload: PushPayload = {
    title: notification.title,
    body: notification.body || '',
    icon: '/generated-icon.png',
    badge: '/generated-icon.png',
    tag: `${notification.type}-${Date.now()}`,
    data: {
      ...notification.data,
      url: notification.data?.url || '/call-log',
      timestamp: Date.now(),
      type: notification.type,
    },
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    requireInteraction: notification.type === 'missed_call',
  };

  if (notification.type === 'missed_call') {
    payload.actions = [
      { action: 'callback', title: 'Call Back' },
      { action: 'open', title: 'View' },
    ];
  }

  if (userId) {
    await sendPushToUser(userId, payload);
  } else {
    await sendPushBroadcast(payload);
  }
}

// Specific: missed call push notification
export async function sendMissedCallPush(
  callFrom: string,
  callTo: string,
  callSid: string,
  callerName?: string,
  userId?: number | null
): Promise<void> {
  const displayName = callerName || callFrom;
  const time = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  await createAndPushNotification(userId ?? null, {
    type: 'missed_call',
    title: `Missed Call from ${displayName}`,
    body: `Called at ${time} — tap to call back`,
    data: {
      callSid,
      callFrom,
      callTo,
      callerName: displayName,
      url: '/call-log',
    },
  });
}

// Specific: voicemail push notification
export async function sendVoicemailPush(
  callFrom: string,
  duration: number,
  transcription?: string,
  userId?: number | null
): Promise<void> {
  const durationStr = duration > 60 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : `${duration}s`;
  const body = transcription
    ? `${durationStr} — "${transcription.substring(0, 80)}${transcription.length > 80 ? '...' : ''}"`
    : `${durationStr} voicemail received`;

  await createAndPushNotification(userId ?? null, {
    type: 'voicemail',
    title: `New Voicemail from ${callFrom}`,
    body,
    data: {
      callFrom,
      duration,
      url: '/voicemail',
    },
  });
}
