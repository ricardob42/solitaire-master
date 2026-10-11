import { store, clampInt } from './storage';
import { sfx } from '../audio';

export const LANGS = ['en', 'es', 'pt', 'fr', 'de', 'it'] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano'
};

export const THEMES = ['emerald', 'midnight', 'burgundy', 'graphite', 'lagoon'] as const;
export type Theme = (typeof THEMES)[number];
/** Matches the felt colour so the browser chrome blends with the table. */
export const THEME_COLOR: Record<Theme, string> = {
  emerald: '#0d3b2e',
  midnight: '#16233c',
  burgundy: '#431722',
  graphite: '#282e33',
  lagoon: '#0e3a41'
};

export const BACKS = ['classic', 'royal', 'dots', 'stripe', 'plaid'] as const;
export type Back = (typeof BACKS)[number];

const K = {
  lang: 'solitaire_lang',
  theme: 'solitaire_theme',
  back: 'solitaire_cardback',
  draw: 'solitaire_draw',
  volume: 'solitaire_volume',
  muted: 'solitaire_muted',
  awake: 'solitaire_awake'
};

function pick<T extends string>(list: readonly T[], value: string | null, fallback: T): T {
  return (list as readonly string[]).includes(value ?? '') ? (value as T) : fallback;
}

function detectLang(): Lang {
  const stored = store.get(K.lang);
  if (stored) return pick(LANGS, stored, 'en');
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return pick(LANGS, nav, 'en');
}

class Settings {
  lang = $state<Lang>(detectLang());
  theme = $state<Theme>(pick(THEMES, store.get(K.theme), 'emerald'));
  back = $state<Back>(pick(BACKS, store.get(K.back), 'classic'));
  draw = $state<1 | 3>(store.get(K.draw) === '3' ? 3 : 1);
  volume = $state(clampInt(parseInt(store.get(K.volume) ?? '', 10), 0, 100, 55));
  muted = $state(store.get(K.muted) === '1');
  awake = $state(store.get(K.awake) !== '0');

  constructor() {
    sfx.setMuted(this.muted);
    sfx.setVolume(this.volume);
  }

  setLang(v: Lang) { this.lang = v; store.set(K.lang, v); }
  setTheme(v: Theme) { this.theme = v; store.set(K.theme, v); }
  setBack(v: Back) { this.back = v; store.set(K.back, v); }
  setDraw(v: 1 | 3) { this.draw = v; store.set(K.draw, String(v)); }
  setVolume(v: number) { this.volume = v; sfx.setVolume(v); store.set(K.volume, String(v)); }
  toggleMuted() {
    this.muted = !this.muted;
    sfx.setMuted(this.muted);
    store.set(K.muted, this.muted ? '1' : '0');
  }
  setAwake(v: boolean) { this.awake = v; store.set(K.awake, v ? '1' : '0'); }
}

export const settings = new Settings();
