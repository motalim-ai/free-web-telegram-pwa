import { useEffect, useState } from 'react';
import { inTelegram, tg } from './telegram';

// "Install the app", wherever the store is open:
//  - Chrome/Android/desktop: a one-tap install through `beforeinstallprompt`.
//  - iPhone/iPad browsers have no such event, so shoppers get the Share → Add to Home Screen steps.
//  - Inside Telegram (8.0+): Telegram's own home-screen shortcut, which reopens the store inside Telegram.

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

// Listen from the very first moment: the browser may fire this before React has drawn anything.
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferred = event as InstallPromptEvent;
  notify();
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  notify();
});

// Inside Telegram: ask once whether the shortcut is already on the home screen.
let telegramShortcut: 'unsupported' | 'unknown' | 'added' | 'missed' = 'unsupported';
if (inTelegram && tg?.isVersionAtLeast('8.0') && tg.checkHomeScreenStatus) {
  tg.checkHomeScreenStatus((status) => {
    telegramShortcut = status;
    notify();
  });
  tg.onEvent?.('homeScreenAdded', () => {
    telegramShortcut = 'added';
    notify();
  });
}

export const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    // Some in-app browsers refuse service workers; the store simply works without one.
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

/** Whether to offer installing, and how: 'prompt' (one tap), 'ios' (show the steps) or 'telegram' (Telegram's shortcut). */
export function useInstall() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    listeners.add(listener);
    return () => void listeners.delete(listener);
  }, []);

  const mode: 'prompt' | 'ios' | 'telegram' | null = inTelegram
    ? telegramShortcut === 'missed' || telegramShortcut === 'unknown'
      ? 'telegram'
      : null
    : isInstalled()
      ? null
      : deferred
        ? 'prompt'
        : isIOS
          ? 'ios'
          : null;

  async function install() {
    if (mode === 'telegram') {
      tg?.addToHomeScreen?.();
      return true;
    }
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    notify();
    return outcome === 'accepted';
  }

  return { mode, install };
}

/** Online/offline, kept current. */
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
