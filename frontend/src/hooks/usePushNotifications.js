import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '@/App';

// VAPID keys would normally be generated server-side, but for simplicity we'll use a basic approach
const applicationServerKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        
        // Check if already subscribed
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        } catch (error) {
          console.error('Error checking subscription:', error);
        }
      }
      setLoading(false);
    };

    checkSupport();
  }, []);

  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers not supported');
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      throw error;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Push notifications not supported');
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Push notifications not supported');
    }

    setLoading(true);
    try {
      // Request permission first
      const permissionResult = await requestPermission();
      if (permissionResult !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Register service worker
      const registration = await registerServiceWorker();

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(applicationServerKey)
      });

      // Send subscription to backend
      await axios.post(`${API}/notifications/subscribe`, {
        subscription: subscription.toJSON()
      });

      setIsSubscribed(true);
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isSupported, requestPermission, registerServiceWorker]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Notify backend
        await axios.post(`${API}/notifications/unsubscribe`, {
          endpoint: subscription.endpoint
        });
      }
      
      setIsSubscribed(false);
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Show a local notification (for testing or immediate feedback)
  const showLocalNotification = useCallback(async (title, options = {}) => {
    if (permission !== 'granted') {
      const result = await requestPermission();
      if (result !== 'granted') return;
    }

    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      ...options
    });
  }, [permission, requestPermission]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
    requestPermission,
    showLocalNotification
  };
};

export default usePushNotifications;
