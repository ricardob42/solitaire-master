/** Cards are integers 0..51: suit * 13 + rank (suit 0..3 = spades, hearts, diamonds, clubs; rank 0 = Ace). */
export type Card = number;

/** s = stock, w = waste, t = tableau column, f = foundation. */
export type PileKind = 's' | 'w' | 't' | 'f';
export interface PileRef {
  k: PileKind;
  i: number;
}

export interface Slot {
  card: Card;
  up: boolean;
}

export interface Board {
  stock: Card[]; // top of the stock is the last element
  waste: Card[]; // top of the waste is the last element
  found: Card[][]; // one pile per suit
  tab: Slot[][]; // seven columns, bottom of the column first
  score: number;
}

export type Draw = 1 | 3;

export type Action =
  | { t: 'draw' }
  | { t: 'move'; from: PileRef; to: PileRef; n: number };

/** The persisted game: everything else is derived by replaying `actions` over `deck`. */
export interface GameRecord {
  deck: Card[]; // initial shuffled order
  draw: Draw;
  daily: boolean;
  difficulty: number; // 1..5
  actions: string[]; // encoded, see actions.ts
  cursor: number; // number of actions currently applied (undo moves it back)
  penalty: number; // accumulated undo penalty, 1 point each
  elapsed: number; // ms of play time
}
