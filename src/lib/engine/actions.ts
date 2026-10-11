import type { Action, PileRef } from './types';

/**
 * Compact, human-readable action codec used for persistence and share links.
 *   d          draw from stock (or recycle the waste when the stock is empty)
 *   t2>f0      top card of column 3 to foundation 1
 *   w>t4       top waste card to column 5
 *   t1>t6x3    the three top cards of column 2 to column 7
 */
export function encodeAction(a: Action): string {
  if (a.t === 'draw') return 'd';
  return `${encodeRef(a.from)}>${encodeRef(a.to)}${a.n > 1 ? 'x' + a.n : ''}`;
}

export function decodeAction(s: string): Action | null {
  if (s === 'd') return { t: 'draw' };
  const m = /^(w|t[0-6]|f[0-3])>(t[0-6]|f[0-3])(?:x(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  return { t: 'move', from: decodeRef(m[1]), to: decodeRef(m[2]), n: m[3] ? Number(m[3]) : 1 };
}

function encodeRef(p: PileRef): string {
  return p.k === 'w' ? 'w' : p.k + p.i;
}

function decodeRef(s: string): PileRef {
  return s === 'w' ? { k: 'w', i: 0 } : { k: s[0] as 't' | 'f', i: Number(s[1]) };
}

export const samePile = (a: PileRef, b: PileRef): boolean => a.k === b.k && a.i === b.i;
