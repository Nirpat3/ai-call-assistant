// Native push notification setup for Capacitor (iOS/Android)
// This module is only active when running as a native app via Capacitor.
// In the browser PWA context, the service worker handles push instead.

import { Capacitor } from '@capacitor/core';

let initialized = false;

export async function initNativePush(): Promise<void> {
  if (initialized) return;
  if (!Capacitor.isNativePlatform()) return; // Skip in browser

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Request permission
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== 'granted') {
      console.warn('[NativePush] Permission not granted');
      return;
    }

    // Register with APNs / FCM
    await PushNotifications.register();

    // Handle registration success — send token to server
    PushNotifications.addListener('registration', async (token) => {
      console.log('[NativePush] Registered with token:', token.value.substring(0, 20) + '...');

      // Send FCM/APN token to our server
      try {
        await fetch('/api/push-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: {
              endpoint: `native://${Capacitor.getPlatform()}/${token.value}`,
              keys: {
                p256dh: token.value, // Native token stored as p256dh
                auth: Capacitor.getPlatform(), // Platform identifier
              },
            },
          }),
        });
      } catch (err) {
        console.error('[NativePush] Failed to send token to server:', err);
      }
    });

    // Handle registration error
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[NativePush] Registration error:', error);
    });

    // Handle received notification (app in foreground)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[NativePush] Received in foreground:', notification);
      // Show local notification or update UI
    });

    // Handle notification tap (app opened from notification)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[NativePush] Action performed:', action);
      const data = action.notification.data;

      if (data?.url) {
        // Navigate to the specified URL
        window.location.href = data.url;
      } else if (data?.callFrom) {
        // Missed call — go to call log
        window.location.href = `/call-log?callback=${encodeURIComponent(data.callFrom)}`;
      }
    });

    initialized = true;
    console.log('[NativePush] Initialized for', Capacitor.getPlatform());
  } catch (error) {
    console.error('[NativePush] Init failed:', error);
  }
}
