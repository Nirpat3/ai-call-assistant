import { useState, useEffect, useCallback } from 'react';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscriptionData | null>(null);
  const [permission, setPermission] = useState<{
    granted: boolean;
    denied: boolean;
    default: boolean;
  }>({ granted: false, denied: false, default: true });
  const [isLoading, setIsLoading] = useState(false);
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission({
        granted: Notification.permission === 'granted',
        denied: Notification.permission === 'denied',
        default: Notification.permission === 'default',
      });

      // Fetch VAPID key from server + register SW
      initPush();
    }
  }, []);

  const initPush = async () => {
    try {
      // Fetch VAPID public key from server
      const res = await fetch('/api/push/vapid-key');
      const { publicKey, configured } = await res.json();
      setVapidKey(publicKey || null);
      setIsConfigured(configured);

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[Push] Service Worker registered');

      // Check for existing subscription
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        setSubscription({
          endpoint: existing.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(existing.getKey('p256dh')!),
            auth: arrayBufferToBase64(existing.getKey('auth')!),
          },
        });
      }
    } catch (error) {
      console.error('[Push] Init failed:', error);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission({
        granted: result === 'granted',
        denied: result === 'denied',
        default: result === 'default',
      });
      return result === 'granted';
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<PushSubscriptionData | null> => {
    if (!isSupported || !vapidKey) {
      console.warn('[Push] Cannot subscribe — not supported or VAPID key missing');
      return null;
    }

    if (!permission.granted) {
      const granted = await requestPermission();
      if (!granted) return null;
    }

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;

      const pushSub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subData: PushSubscriptionData = {
        endpoint: pushSub.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(pushSub.getKey('p256dh')!),
          auth: arrayBufferToBase64(pushSub.getKey('auth')!),
        },
      };

      // Send to server for persistence
      await fetch('/api/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subData }),
      });

      setSubscription(subData);
      console.log('[Push] Subscribed successfully');
      return subData;
    } catch (error) {
      console.error('[Push] Subscribe failed:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, vapidKey, permission.granted, requestPermission]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!subscription) return;
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const pushSub = await registration.pushManager.getSubscription();
      if (pushSub) await pushSub.unsubscribe();

      await fetch('/api/push-subscription', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  const testNotification = useCallback(async (title?: string, body?: string) => {
    await fetch('/api/test-push-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body }),
    });
  }, []);

  // Auto-subscribe when permission is granted and VAPID key is available
  useEffect(() => {
    if (permission.granted && vapidKey && !subscription && isConfigured) {
      subscribe();
    }
  }, [permission.granted, vapidKey, subscription, isConfigured, subscribe]);

  return {
    isSupported,
    isConfigured,
    subscription,
    permission,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    testNotification,
  };
}

// Utility: ArrayBuffer → base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Utility: URL-safe base64 → Uint8Array (for VAPID applicationServerKey)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
