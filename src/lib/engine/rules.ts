import type { Action, Board, Card, Draw, PileRef } from './types';
import { isRed, rankOf, suitOf } from './cards';
import { decodeAction, samePile } from './actions';
import { dealBoard } from './deal';

/** A run is valid when ranks descend by one and colours alternate. */
export function validSequence(cards: Card[]): boolean {
  for (let i = 0; i < cards.length - 1; i++) {
    if (rankOf(cards[i + 1]) !== rankOf(cards[i]) - 1) return false;
    if (isRed(cards[i]) === isRed(cards[i + 1])) return false;
  }
  return true;
}

/** The `n` top cards of a pile if they can be picked up, otherwise null. */
export function pickUp(b: Board, from: PileRef, n: number): Card[] | null {
  if (n < 1) return null;
  switch (from.k) {
    case 'w':
      return n === 1 && b.waste.length ? [b.waste[b.waste.length - 1]] : null;
    case 'f': {
      const f = b.found[from.i];
      return n === 1 && f && f.length ? [f[f.length - 1]] : null;
    }
    case 't': {
      const col = b.tab[from.i];
      if (!col || n > col.length) return null;
      const run = col.slice(col.length - n);
      if (!run.every((s) => s.up)) return null;
      const cards = run.map((s) => s.card);
      return validSequence(cards) ? cards : null;
    }
    default:
      return null;
  }
}

export function canPlace(b: Board, cards: Card[], to: PileRef): boolean {
  if (to.k === 'f') {
    return cards.length === 1 && suitOf(cards[0]) === to.i && b.found[to.i].length === rankOf(cards[0]);
  }
  if (to.k === 't') {
    const col = b.tab[to.i];
    if (!col) return false;
    if (!col.length) return rankOf(cards[0]) === 12; // only a King enters an empty column
    const top = col[col.length - 1];
    return top.up && rankOf(top.card) === rankOf(cards[0]) + 1 && isRed(top.card) !== isRed(cards[0]);
  }
  return false;
}

const clone = (b: Board): Board => ({
  stock: b.stock.slice(),
  waste: b.waste.slice(),
  found: b.found.map((f) => f.slice()),
  tab: b.tab.map((c) => c.map((s) => ({ ...s }))),
  score: b.score
});

/** Pure state transition. Returns null when the action is illegal. */
export function applyAction(b: Board, a: Action, draw: Draw): Board | null {
  const nb = clone(b);

  if (a.t === 'draw') {
    if (!nb.stock.length) {
      if (!nb.waste.length) return null;
      nb.stock = nb.waste.reverse(); // recycled cards return face down, same draw order
      nb.waste = [];
      nb.score = Math.max(0, nb.score - 5);
      return nb;
    }
    const take = Math.min(draw, nb.stock.length);
    for (let i = 0; i < take; i++) nb.waste.push(nb.stock.pop()!);
    return nb;
  }

  if (samePile(a.from, a.to)) return null;
  const cards = pickUp(nb, a.from, a.n);
  if (!cards || !canPlace(nb, cards, a.to)) return null;

  if (a.from.k === 't') {
    const col = nb.tab[a.from.i];
    col.splice(col.length - a.n, a.n);
    const top = col[col.length - 1];
    if (top && !top.up) {
      top.up = true;
      nb.score += 5; // reveal bonus
    }
  } else if (a.from.k === 'w') {
    nb.waste.pop();
  } else {
    nb.found[a.from.i].pop();
  }

  if (a.to.k === 't') {
    for (const card of cards) nb.tab[a.to.i].push({ card, up: true });
    nb.score += 5;
  } else {
    nb.found[a.to.i].push(cards[0]);
    nb.score += 10;
  }
  return nb;
}

/** Rebuilds the board after the first `upTo` actions. Null if the record is corrupt. */
export function replay(deck: Card[], draw: Draw, actions: string[], upTo = actions.length): Board | null {
  let board = dealBoard(deck);
  for (let i = 0; i < upTo; i++) {
    const a = decodeAction(actions[i]);
    if (!a) return null;
    const next = applyAction(board, a, draw);
    if (!next) return null;
    board = next;
  }
  return board;
}

export const isWon = (b: Board): boolean => b.found.every((f) => f.length === 13);

export const isPermutation = (deck: unknown): deck is Card[] =>
  Array.isArray(deck) &&
  deck.length === 52 &&
  new Set(deck).size === 52 &&
  deck.every((c) => Number.isInteger(c) && c >= 0 && c < 52);
