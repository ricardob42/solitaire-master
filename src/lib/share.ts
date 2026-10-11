export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Native share sheet when `native` is true and available, clipboard otherwise.
 * Dismissing the sheet is reported as 'cancelled' and stays silent.
 */
export async function share(payload: { title: string; text?: string; url: string }, native: boolean): Promise<ShareResult> {
  if (native && navigator.share) {
    try {
      await navigator.share(payload);
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(payload.text ? `${payload.text} ${payload.url}` : payload.url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export const isTouch = (): boolean => window.matchMedia('(pointer: coarse)').matches;
