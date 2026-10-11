import type { GameRecord } from './types';
import { decodeAction } from './actions';
import { isPermutation, replay } from './rules';
import { rateDifficulty } from './deal';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Share token: <deck:52 chars><draw:1|3><d|n>.<elapsed seconds, base36>.<action>.<action>...
 * Only the applied actions (up to the cursor) are shared. '>' is written as '-' to stay URL friendly.
 */
export function encodeShare(r: GameRecord): string {
  const head = r.deck.map((c) => ALPHABET[c]).join('') + r.draw + (r.daily ? 'd' : 'n');
  const elapsed = Math.floor(r.elapsed / 1000).toString(36);
  const actions = r.actions.slice(0, r.cursor).map((a) => a.replace('>', '-'));
  return [head, elapsed, ...actions].join('.');
}

export function decodeShare(token: string): GameRecord | null {
  const [head, elapsed, ...rest] = token.split('.');
  if (!head || head.length !== 54 || elapsed === undefined) return null;

  const deck = [...head.slice(0, 52)].map((ch) => ALPHABET.indexOf(ch));
  if (!isPermutation(deck)) return null;
  const draw = head[52] === '3' ? 3 : head[52] === '1' ? 1 : null;
  if (!draw || (head[53] !== 'd' && head[53] !== 'n')) return null;

  const actions = rest.map((a) => a.replace('-', '>'));
  if (actions.length > 5000 || actions.some((a) => !decodeAction(a))) return null;
  if (!replay(deck, draw, actions)) return null;

  const seconds = parseInt(elapsed, 36);
  return {
    deck,
    draw,
    daily: head[53] === 'd',
    difficulty: rateDifficulty(deck),
    actions,
    cursor: actions.length,
    penalty: 0,
    elapsed: Number.isFinite(seconds) ? Math.min(seconds, 2_592_000) * 1000 : 0
  };
}
