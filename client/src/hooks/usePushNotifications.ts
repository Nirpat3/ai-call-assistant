import { useState, useEffect } from 'react';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    default: true
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      // Check current permission status
      const currentPermission = Notification.permission;
      setPermission({
        granted: currentPermission === 'granted',
        denied: currentPermission === 'denied',
        default: currentPermission === 'default'
      });

      // Register service worker
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        
        // Check for existing subscription
        checkExistingSubscription(registration);
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const checkExistingSubscription = async (registration: ServiceWorkerRegistration) => {
    try {
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setSubscription({
          endpoint: existingSubscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(existingSubscription.getKey('p256dh')!),
            auth: arrayBufferToBase64(existingSubscription.getKey('auth')!)
          }
        });
      }
    } catch (error) {
      console.error('Error checking existing subscription:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported on this device');
    }

    setIsLoading(true);

    try {
      const result = await Notification.requestPermission();
      
      setPermission({
        granted: result === 'granted',
        denied: result === 'denied',
        default: result === 'default'
      });

      setIsLoading(false);
      return result === 'granted';
    } catch (error) {
      setIsLoading(false);
      throw new Error('Failed to request notification permission');
    }
  };

  const subscribe = async (): Promise<PushSubscription> => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported');
    }

    if (!permission.granted) {
      const granted = await requestPermission();
      if (!granted) {
        throw new Error('Notification permission denied');
      }
    }

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // VAPID public key (you would generate this on your server)
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI6LeSr-oX7S4wYVNEqB6_m4yDqNFCb6tEMjSLRpMYaklBb5NzWOc6o4bw';
      
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      const subscriptionData = {
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(pushSubscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(pushSubscription.getKey('auth')!)
        }
      };

      setSubscription(subscriptionData);

      // Send subscription to server
      await fetch('/api/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData)
      });

      setIsLoading(false);
      return subscriptionData;
    } catch (error) {
      setIsLoading(false);
      throw new Error('Failed to subscribe to push notifications');
    }
  };

  const unsubscribe = async (): Promise<void> => {
    if (!subscription) {
      return;
    }

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.getSubscription();
      
      if (pushSubscription) {
        await pushSubscription.unsubscribe();
      }

      // Remove subscription from server
      await fetch('/api/push-subscription', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });

      setSubscription(null);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      throw new Error('Failed to unsubscribe from push notifications');
    }
  };

  const testNotification = async (title: string, body: string) => {
    if (!permission.granted) {
      throw new Error('Notification permission not granted');
    }

    try {
      // Send test notification via server
      await fetch('/api/test-push-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body,
          icon: '/generated-icon.png',
          badge: '/generated-icon.png',
          tag: 'test',
          data: {
            url: '/',
            timestamp: Date.now()
          }
        })
      });
    } catch (error) {
      throw new Error('Failed to send test notification');
    }
  };

  return {
    isSupported,
    subscription,
    permission,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    testNotification
  };
}

// Utility functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}