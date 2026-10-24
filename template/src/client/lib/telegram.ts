// Thin wrapper over window.Telegram.WebApp. Outside Telegram every helper is a safe no-op.

interface TelegramWebApp {
  initData: string;
  version: string;
  ready(): void;
  expand(): void;
  isVersionAtLeast(version: string): boolean;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  disableVerticalSwipes?(): void;
  openTelegramLink(url: string): void;
  showConfirm?(message: string, callback: (ok: boolean) => void): void;
  openLink(url: string): void;
  // Bot API 8.0: a home-screen shortcut that opens the Mini App straight inside Telegram.
  addToHomeScreen?(): void;
  checkHomeScreenStatus?(callback: (status: 'unsupported' | 'unknown' | 'added' | 'missed') => void): void;
  onEvent?(event: string, handler: () => void): void;
  BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy'): void;
    notificationOccurred(type: 'success' | 'error' | 'warning'): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

export const tg: TelegramWebApp | null = window.Telegram?.WebApp ?? null;

/** True only when the page was opened from the bot (Telegram passes signed initData). */
export const inTelegram = Boolean(tg?.initData);

export function startTelegram(paperColor: string) {
  if (!tg || !inTelegram) return;
  tg.ready();
  tg.expand();
  if (tg.isVersionAtLeast('6.1')) {
    tg.setHeaderColor?.(paperColor);
    tg.setBackgroundColor?.(paperColor);
  }
  // Scrolling a long product list shouldn't swipe the whole app closed.
  if (tg.isVersionAtLeast('7.7')) tg.disableVerticalSwipes?.();
}

export function haptic(kind: 'tap' | 'success' | 'error') {
  if (!inTelegram || !tg?.HapticFeedback || !tg.isVersionAtLeast('6.1')) return;
  if (kind === 'tap') tg.HapticFeedback.impactOccurred('light');
  else tg.HapticFeedback.notificationOccurred(kind);
}

/** Shows Telegram's native back arrow while `active`, calling `onBack` when pressed. */
export function bindBackButton(active: boolean, onBack: () => void) {
  if (!inTelegram || !tg || !tg.isVersionAtLeast('6.1')) return () => {};
  if (!active) {
    tg.BackButton.hide();
    return () => {};
  }
  tg.BackButton.show();
  tg.BackButton.onClick(onBack);
  return () => tg.BackButton.offClick(onBack);
}

/** "Are you sure?" dialog: Telegram's native one inside the app (window.confirm is blocked there on some phones). */
export function confirmAction(message: string): Promise<boolean> {
  if (inTelegram && tg?.showConfirm && tg.isVersionAtLeast('6.2')) {
    return new Promise((resolve) => tg.showConfirm!(message, resolve));
  }
  return Promise.resolve(window.confirm(message));
}

/** Opens a t.me link: inside Telegram without leaving the app, on the website in a new tab. */
export function openTelegramLink(url: string) {
  if (inTelegram && tg) tg.openTelegramLink(url);
  else window.open(url, '_blank', 'noopener');
}
