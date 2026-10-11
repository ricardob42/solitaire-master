import type { Board, Card, Draw, PileRef } from './types';
import { rankOf, suitOf } from './cards';
import { applyAction, canPlace, pickUp, validSequence } from './rules';

export interface Candidate {
  from: PileRef;
  to: PileRef;
  n: number;
  cards: Card[];
  reveal: boolean; // uncovers a face-down card
  empties: boolean; // empties the source column
}

/**
 * Every legal card move, mirroring exactly what a drag would accept.
 * Foundation pulls are excluded: taking a card back from a foundation never creates progress.
 */
export function enumerateMoves(b: Board): Candidate[] {
  const out: Candidate[] = [];

  for (let c = 0; c < 7; c++) {
    const col = b.tab[c];
    if (!col.length) continue;
    const top = col[col.length - 1];
    if (top.up && canPlace(b, [top.card], { k: 'f', i: suitOf(top.card) })) {
      out.push({
        from: { k: 't', i: c },
        to: { k: 'f', i: suitOf(top.card) },
        n: 1,
        cards: [top.card],
        reveal: col.length > 1 && !col[col.length - 2].up,
        empties: col.length === 1
      });
    }
  }

  const w = b.waste[b.waste.length - 1];
  if (w !== undefined && canPlace(b, [w], { k: 'f', i: suitOf(w) })) {
    out.push({ from: { k: 'w', i: 0 }, to: { k: 'f', i: suitOf(w) }, n: 1, cards: [w], reveal: false, empties: false });
  }

  for (let c = 0; c < 7; c++) {
    const col = b.tab[c];
    for (let k = 0; k < col.length; k++) {
      if (!col[k].up) continue;
      const cards = col.slice(k).map((s) => s.card);
      if (!validSequence(cards)) continue;
      for (let j = 0; j < 7; j++) {
        if (j !== c && canPlace(b, cards, { k: 't', i: j })) {
          out.push({
            from: { k: 't', i: c },
            to: { k: 't', i: j },
            n: cards.length,
            cards,
            reveal: k > 0 && !col[k - 1].up,
            empties: k === 0
          });
        }
      }
    }
  }

  if (w !== undefined) {
    for (let j = 0; j < 7; j++) {
      if (canPlace(b, [w], { k: 't', i: j })) {
        out.push({ from: { k: 'w', i: 0 }, to: { k: 't', i: j }, n: 1, cards: [w], reveal: false, empties: false });
      }
    }
  }
  return out;
}

/**
 * Late in the game, racing cards home matters more than reshuffling the tableau.
 * The bias only re-ranks near ties; the bands stay ordered: foundation > reveal > waste > build.
 */
function endgameBias(b: Board) {
  const placed = b.found.reduce((n, f) => n + f.length, 0);
  const deckLeft = b.stock.length + b.waste.length;
  const fp = Math.max(0, placed / 52 - 0.35) / 0.65;
  const dry = Math.max(0, (16 - deckLeft) / 16);
  const w = Math.min(1, fp * 0.65 + dry * 0.35);
  return { foundation: Math.round(w * 30), reveal: Math.round(w * 10), build: -Math.round(w * 12) };
}

export function scoreMove(b: Board, m: Candidate): number {
  const bias = endgameBias(b);
  if (m.to.k === 'f') {
    let s = 100 + bias.foundation;
    if (m.reveal) s += 25;
    if (m.empties) s += 10;
    if (m.from.k === 'w') s += 2;
    return s;
  }
  if (m.reveal) return 80 + bias.reveal + (m.empties ? 6 : 0);
  if (m.from.k === 'w') return 55;
  let s = 30 + bias.build + (m.empties ? 6 : 0);
  // Relocating a whole King column is legal but strategically void.
  if (m.empties && rankOf(m.cards[0]) === 12) s -= 20;
  return s;
}

export type HintReason = 'foundation' | 'reveal' | 'waste' | 'build' | 'draw';

export interface Hint {
  move: Candidate | null; // null = draw from the stock
  why: HintReason;
}

export function reasonOf(m: Candidate): HintReason {
  if (m.to.k === 'f') return 'foundation';
  if (m.reveal) return 'reveal';
  if (m.from.k === 'w') return 'waste';
  return 'build';
}

export function bestOf(b: Board, list: Candidate[]): Candidate | null {
  let best: Candidate | null = null;
  let bestScore = -Infinity;
  for (const m of list) {
    const s = scoreMove(b, m);
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
  }
  return best;
}

export function findHint(b: Board): Hint | null {
  const best = bestOf(b, enumerateMoves(b));
  if (best) return { move: best, why: reasonOf(best) };
  if (b.stock.length || b.waste.length) return { move: null, why: 'draw' };
  return null;
}

/** Best destination for the `n` top cards of `from` (double-tap / Enter). */
export function smartTarget(b: Board, from: PileRef, n: number): Candidate | null {
  return bestOf(
    b,
    enumerateMoves(b).filter((m) => m.from.k === from.k && m.from.i === from.i && m.n === n)
  );
}

/**
 * Stuck = nothing can be played now, and nothing becomes playable by cycling the
 * whole stock/waste once. Cycling is simulated, so draw-3 ordering is respected.
 */
export function isStuck(b: Board, draw: Draw): boolean {
  let cur: Board | null = b;
  const limit = (b.stock.length + b.waste.length) * 2 + 2;
  for (let i = 0; i < limit && cur; i++) {
    if (enumerateMoves(cur).length) return false;
    if (!cur.stock.length && !cur.waste.length) return true;
    cur = applyAction(cur, { t: 'draw' }, draw);
  }
  return true;
}

/** Next card to send home during auto-finish: any tableau top that fits a foundation. */
export function nextAutoMove(b: Board): { from: PileRef; to: PileRef } | null {
  for (let c = 0; c < 7; c++) {
    const col = b.tab[c];
    const top = col[col.length - 1];
    if (!top) continue;
    const to: PileRef = { k: 'f', i: suitOf(top.card) };
    if (pickUp(b, { k: 't', i: c }, 1) && canPlace(b, [top.card], to)) return { from: { k: 't', i: c }, to };
  }
  return null;
}

/** Auto-finish is available once nothing is hidden: empty stock/waste and no face-down cards. */
export function canAutoFinish(b: Board): boolean {
  if (b.stock.length || b.waste.length) return false;
  return b.tab.every((col) => col.every((s) => s.up));
}
