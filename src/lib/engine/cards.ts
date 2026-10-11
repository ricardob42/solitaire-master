import type { Card } from './types';

export const SUIT_KEYS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export const suitOf = (c: Card): number => Math.floor(c / 13);
export const rankOf = (c: Card): number => c % 13;
export const isRed = (c: Card): boolean => {
  const s = suitOf(c);
  return s === 1 || s === 2;
};
export const rankLabel = (c: Card): string => RANKS[rankOf(c)];
