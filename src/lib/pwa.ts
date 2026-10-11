import { registerSW } from 'virtual:pwa-register';
import { ui } from './state/ui.svelte';
import { t } from './i18n/index.svelte';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
let updateSW: ((reload?: boolean) => Promise<void>) | null = null;

/** Service worker registration (managed by vite-plugin-pwa) and the install prompt. */
export function setupPwa(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    ui.installable = true;
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    ui.installable = false;
    ui.toast(t('toast.installed'));
  });

  updateSW = registerSW({
    onNeedRefresh: () => (ui.needRefresh = true),
    onOfflineReady: () => {
      ui.offlineReady = true;
      ui.toast(t('upd.offline'));
    },
    onRegisteredSW: (_url, registration) => {
      // Look for a new version hourly while the app stays open.
      if (registration) setInterval(() => void registration.update(), 60 * 60 * 1000);
    }
  });
}

export async function install(): Promise<void> {
  if (!deferred) return;
  await deferred.prompt();
  await deferred.userChoice;
  deferred = null;
  ui.installable = false;
}

export const applyUpdate = (): void => void updateSW?.(true);
