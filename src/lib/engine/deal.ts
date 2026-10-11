import type { Board, Card, Slot } from './types';
import { rankOf } from './cards';

export function newDeck(): Card[] {
  return Array.from({ length: 52 }, (_, i) => i);
}

export function shuffle(deck: Card[], rng: () => number = Math.random): Card[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** 32-bit FNV-1a fold of a string into a seed. */
export function seedFromString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const dateKey = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function previousDateKey(d = new Date()): string {
  const p = new Date(d);
  p.setDate(p.getDate() - 1);
  return dateKey(p);
}

/** Same seed string as the previous version, so existing daily deals are unchanged. */
export function dailyDeck(key = dateKey()): Card[] {
  return shuffle(newDeck(), mulberry32(seedFromString('solitaire-daily-' + key)));
}

/** Klondike deal: column i receives i + 1 cards (only the last face up); the remaining 24 form the stock. */
export function dealBoard(deck: Card[]): Board {
  let p = 0;
  const tab: Slot[][] = [];
  for (let i = 0; i < 7; i++) {
    const col: Slot[] = [];
    for (let j = 0; j <= i; j++) col.push({ card: deck[p++], up: j === i });
    tab.push(col);
  }
  return { stock: deck.slice(p), waste: [], found: [[], [], [], []], tab, score: 0 };
}

/** Structural difficulty 1..5 of a fresh layout: buried aces and kings, repeated opening ranks. */
export function rateDifficulty(deck: Card[]): number {
  const { tab } = dealBoard(deck);
  let aces = 0;
  let kings = 0;
  for (const col of tab) {
    for (let j = 0; j < col.length - 1; j++) {
      const r = rankOf(col[j].card);
      if (r === 0) aces++;
      else if (r === 12) kings++;
    }
  }
  const seen = new Set<number>();
  let dup = 0;
  for (const col of tab) {
    const r = rankOf(col[col.length - 1].card);
    if (seen.has(r)) dup++;
    seen.add(r);
  }
  return Math.max(1, Math.min(5, Math.round(1 + aces * 0.5 + kings * 0.22 + dup * 0.3)));
}
