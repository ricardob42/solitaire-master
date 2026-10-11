let lock: WakeLockSentinel | null = null;

/** Keeps the screen on while a game is in progress. Re-call after the page becomes visible again. */
export async function keepAwake(on: boolean): Promise<void> {
  if (!('wakeLock' in navigator)) return;
  if (!on) {
    await lock?.release();
    lock = null;
    return;
  }
  if (lock || document.visibilityState !== 'visible') return;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => (lock = null));
  } catch {
    // Refused (for example battery saver): playing is unaffected.
  }
}
