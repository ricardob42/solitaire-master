import type { Board, Card, Draw, PileRef } from './engine/types';

export interface Metrics {
  W: number;
  H: number;
  cw: number;
  ch: number;
  gap: number;
  x0: number; // left edge of the first column
  y0: number; // top of the first row
  tabY: number; // top of the tableau
  fanDown: number;
  fanUp: number;
  wasteFan: number;
}

export interface Placed {
  card: Card;
  x: number;
  y: number;
  z: number;
  up: boolean;
  pile: PileRef;
  idx: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const CARD_RATIO = 1.42;
const MIN_FAN_DOWN = 4;
const MIN_FAN_UP = 12;

/** Card size from the board box: seven columns must fit, and two rows plus some fan must fit the height. */
export function computeMetrics(W: number, H: number): Metrics {
  const pad = clamp(W * 0.02, 6, 28);
  const gap = clamp(W * 0.014, 4, 18);
  const byWidth = (W - 2 * pad - 6 * gap) / 7;
  const byHeight = (H - 16) / (CARD_RATIO * 3.5);
  const cw = Math.floor(clamp(Math.min(byWidth, byHeight), 28, 124));
  const ch = Math.round(cw * CARD_RATIO);
  const rowGap = Math.round(clamp(cw * 0.16, 8, 22));
  const y0 = 10;
  return {
    W,
    H,
    cw,
    ch,
    gap,
    x0: Math.round((W - (7 * cw + 6 * gap)) / 2),
    y0,
    tabY: y0 + ch + rowGap,
    fanDown: Math.max(cw * 0.14, 7),
    fanUp: Math.max(cw * 0.3, 17),
    wasteFan: Math.min(cw * 0.22, 22)
  };
}

export const colX = (m: Metrics, col: number): number => m.x0 + col * (m.cw + m.gap);

/** Top-left of a pile's slot. Stock = column 0, waste = 1, foundations = 3..6. */
export function pileOrigin(m: Metrics, p: PileRef): { x: number; y: number } {
  switch (p.k) {
    case 's':
      return { x: colX(m, 0), y: m.y0 };
    case 'w':
      return { x: colX(m, 1), y: m.y0 };
    case 'f':
      return { x: colX(m, 3 + p.i), y: m.y0 };
    default:
      return { x: colX(m, p.i), y: m.tabY };
  }
}

/** Screen position of every card (indexed by card id) for the current board. */
export function placeCards(b: Board, m: Metrics, draw: Draw): Placed[] {
  const out: Placed[] = new Array(52);

  b.stock.forEach((card, idx) => {
    out[card] = { card, x: colX(m, 0), y: m.y0, z: 10 + idx, up: false, pile: { k: 's', i: 0 }, idx };
  });

  const n = b.waste.length;
  const visible = draw === 3 ? Math.min(3, n) : 1;
  b.waste.forEach((card, idx) => {
    const offset = Math.max(0, idx - (n - visible));
    out[card] = {
      card,
      x: colX(m, 1) + offset * m.wasteFan,
      y: m.y0,
      z: 100 + idx,
      up: true,
      pile: { k: 'w', i: 0 },
      idx
    };
  });

  b.found.forEach((pile, i) => {
    pile.forEach((card, idx) => {
      out[card] = { card, x: colX(m, 3 + i), y: m.y0, z: 100 + idx, up: true, pile: { k: 'f', i }, idx };
    });
  });

  const budget = m.H - m.tabY - 12 - m.ch; // vertical room for the fan of the last card's predecessors
  b.tab.forEach((col, i) => {
    let down = 0;
    let up = 0;
    for (let k = 0; k < col.length - 1; k++) col[k].up ? up++ : down++;
    let fd = m.fanDown;
    let fu = m.fanUp;
    if (down * fd + up * fu > budget) {
      const tryDown = down ? (budget - up * fu) / down : Infinity;
      if (tryDown >= MIN_FAN_DOWN) {
        fd = Math.min(fd, tryDown);
      } else {
        fd = MIN_FAN_DOWN;
        const tryUp = up ? (budget - down * fd) / up : Infinity;
        fu = Math.max(MIN_FAN_UP, Math.min(fu, tryUp));
      }
    }
    let y = m.tabY;
    col.forEach((s, idx) => {
      out[s.card] = { card: s.card, x: colX(m, i), y, z: 10 + idx, up: s.up, pile: { k: 't', i }, idx };
      y += s.up ? fu : fd;
    });
  });

  return out;
}

/** Which pile accepts a drop at (x, y) in board coordinates. Generous zones: the whole column strip counts. */
export function dropTarget(m: Metrics, x: number, y: number): PileRef | null {
  if (y <= m.tabY - m.gap) {
    for (let i = 0; i < 4; i++) {
      const left = colX(m, 3 + i);
      if (x >= left - 10 && x <= left + m.cw + 10 && y >= m.y0 - 10 && y <= m.y0 + m.ch + 14) return { k: 'f', i };
    }
  }
  if (y >= m.tabY - 16) {
    for (let i = 0; i < 7; i++) {
      const left = colX(m, i);
      if (x >= left - m.gap / 2 && x <= left + m.cw + m.gap / 2) return { k: 't', i };
    }
  }
  return null;
}
