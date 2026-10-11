import { settings, type Lang } from '../state/settings.svelte';
import en from './en';
import es from './es';
import pt from './pt';
import fr from './fr';
import de from './de';
import it from './it';

const dictionaries: Record<Lang, Record<keyof typeof en, string>> = { en, es, pt, fr, de, it };

export type Key = keyof typeof en;

/** Locale used for date formatting. */
export const LOCALES: Record<Lang, string> = { en: 'en', es: 'es', pt: 'pt', fr: 'fr', de: 'de', it: 'it' };

/** Reactive: reads settings.lang, so any template or $derived that calls it updates on language change. */
export function t(key: Key, vars?: Record<string, string | number>): string {
  let s = dictionaries[settings.lang][key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
