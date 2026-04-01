'use client';

import { useState, useCallback } from 'react';
import { SESSION_HEADER, getSessionId } from '@/lib/session';

export type PushState = 'idle' | 'requesting' | 'subscribed' | 'denied' | 'unsupported';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer as ArrayBuffer;
}

function getPushInitialState(): PushState {
  // BUG FIX: guard against SSR — window/navigator not available server-side
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'idle';
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
  // BUG FIX: Notification may not exist in some environments (e.g. Firefox private)
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') return 'denied';
  return 'idle';
}

export function usePush() {
  const [state, setState] = useState<PushState>(getPushInitialState);

  const subscribe = useCallback(async (remindAt?: Date): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return false;
    }
    if (!VAPID_PUBLIC) {
      console.warn('NEXT_PUBLIC_VAPID_PUBLIC_KEY not set — push notifications disabled');
      return false;
    }

    setState('requesting');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('denied');
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });

      const json = sub.toJSON();
      // BUG FIX: validate keys exist before sending
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        console.error('Push subscription missing required fields');
        setState('idle');
        return false;
      }

      // BUG FIX: include sessionId header + check server response
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [SESSION_HEADER]: getSessionId(),
        },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          remindAt: remindAt?.toISOString(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Push subscribe server error:', err);
        setState('idle');
        return false;
      }

      setState('subscribed');
      return true;
    } catch (err) {
      console.error('Push subscribe error:', err);
      setState('idle');
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) { setState('idle'); return; }
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      // BUG FIX: include sessionId header
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          [SESSION_HEADER]: getSessionId(),
        },
        body: JSON.stringify({ endpoint }),
      });
      setState('idle');
    } catch (err) {
      console.error('Push unsubscribe error:', err);
    }
  }, []);

  return { state, subscribe, unsubscribe };
}
