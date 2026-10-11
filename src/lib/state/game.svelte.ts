import type { Action, Board, Card, GameRecord, PileRef } from '../engine/types';
import { encodeAction } from '../engine/actions';
import { dailyDeck, dealBoard, newDeck, rateDifficulty, shuffle } from '../engine/deal';
import { applyAction, isPermutation, isWon, pickUp, replay } from '../engine/rules';
import { canAutoFinish, findHint, isStuck, nextAutoMove, smartTarget } from '../engine/moves';
import { decodeShare, encodeShare } from '../engine/share';
import { sfx, haptic } from '../audio';
import { t } from '../i18n/index.svelte';
import { settings } from './settings.svelte';
import { stats } from './stats.svelte';
import { ui } from './ui.svelte';
import { store, clampInt } from './storage';

const GAME_KEY = 'solitaire_game_v2';
const DEAL_LOCK_MS = 1100;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** card -> "pile:index", used to find which cards changed place between two boards. */
function locate(b: Board): Map<Card, string> {
  const m = new Map<Card, string>();
  b.stock.forEach((c, i) => m.set(c, `s:${i}`));
  b.waste.forEach((c, i) => m.set(c, `w:${i}`));
  b.found.forEach((f, p) => f.forEach((c, i) => m.set(c, `f${p}:${i}`)));
  b.tab.forEach((col, p) => col.forEach((s, i) => m.set(s.card, `t${p}:${i}`)));
  return m;
}

function movedCards(a: Board, b: Board): Set<Card> {
  const before = locate(a);
  const out = new Set<Card>();
  for (const [card, where] of locate(b)) if (before.get(card) !== where) out.add(card);
  return out;
}

function freshRecord(daily: boolean): GameRecord {
  const deck = daily ? dailyDeck() : shuffle(newDeck());
  return {
    deck,
    draw: settings.draw,
    daily,
    difficulty: rateDifficulty(deck),
    actions: [],
    cursor: 0,
    penalty: 0,
    elapsed: 0
  };
}

/** Validates a stored record: the entire timeline must replay legally, so redo can never fail later. */
function loadSaved(): { rec: GameRecord; board: Board } | null {
  const r = store.json(GAME_KEY) as Partial<GameRecord> | null;
  if (!r || !isPermutation(r.deck)) return null;
  if (r.draw !== 1 && r.draw !== 3) return null;
  if (!Array.isArray(r.actions) || !r.actions.every((a) => typeof a === 'string')) return null;
  if (!replay(r.deck, r.draw, r.actions)) return null;
  const cursor = clampInt(r.cursor, 0, r.actions.length, r.actions.length);
  const board = replay(r.deck, r.draw, r.actions, cursor);
  if (!board) return null;
  return {
    board,
    rec: {
      deck: r.deck,
      draw: r.draw,
      daily: r.daily === true,
      difficulty: clampInt(r.difficulty, 1, 5, rateDifficulty(r.deck)),
      actions: r.actions,
      cursor,
      penalty: clampInt(r.penalty, 0, 100000, 0),
      elapsed: clampInt(r.elapsed, 0, 2_592_000_000, 0)
    }
  };
}

interface Incoming {
  action: string | null;
  token: string | null;
}

function readIncoming(): Incoming {
  const url = new URL(location.href);
  let token = /[#&]g=([\w.-]+)/.exec(location.hash)?.[1] ?? null;
  // Web Share Target: another app can hand a shared-game link to the installed PWA.
  if (!token) {
    for (const field of ['text', 'url', 'title']) {
      const m = /[#&?~]g=([\w.-]{60,})/.exec(url.searchParams.get(field) ?? '');
      if (m) {
        token = m[1];
        break;
      }
    }
  }
  const incoming = { action: url.searchParams.get('action'), token };
  if (token || incoming.action || url.search || url.hash) history.replaceState(null, '', location.pathname);
  return incoming;
}

class Game {
  rec = $state.raw<GameRecord>(freshRecord(false));
  board = $state.raw<Board>(dealBoard(this.rec.deck));
  startedAt = $state<number | null>(null);
  now = $state(Date.now());
  finished = $state(false);
  auto = $state(false);
  dealing = $state(false);
  dealSeq = $state(0); // increments whenever a whole new layout is dealt: triggers the deal animation
  lifted = $state.raw<Set<Card>>(new Set()); // cards that just changed place: drawn above the rest while they fly
  stuck = $state(false);

  score = $derived(Math.max(0, this.board.score - this.rec.penalty));
  moves = $derived(this.rec.cursor);
  elapsed = $derived(this.rec.elapsed + (this.startedAt !== null ? this.now - this.startedAt : 0));
  busy = $derived(this.auto || this.dealing || this.finished);
  canUndo = $derived(!this.busy && this.rec.cursor > 0);
  canRedo = $derived(!this.busy && this.rec.cursor < this.rec.actions.length);
  canAuto = $derived(!this.busy && canAutoFinish(this.board));
  progress = $derived(this.board.found.reduce((n, f) => n + f.length, 0) / 52);

  private liftTimer = 0;

  /** Restores the saved game (or deals a new one) and handles shortcut / shared-link launches. */
  init() {
    const incoming = readIncoming();
    window.setInterval(() => (this.now = Date.now()), 1000);

    const forceNew = incoming.action === 'new' || (incoming.action === 'daily' && !stats.dailyDone);
    const saved = forceNew ? null : loadSaved();
    if (saved) {
      this.rec = saved.rec;
      this.board = saved.board;
      this.finished = isWon(saved.board);
      this.resume();
      this.refreshStuck();
    } else {
      this.newGame(incoming.action === 'daily');
    }

    if (incoming.token) {
      const rec = decodeShare(incoming.token);
      if (rec) {
        ui.pendingImport = rec;
        ui.open('import');
      } else {
        ui.toast(t('toast.importBad'));
        sfx.invalid();
      }
    }
  }

  // ---------- Lifecycle ----------

  newGame(daily = false) {
    if (this.auto || this.dealing) return;
    if (daily && stats.dailyDone) return;
    this.begin(freshRecord(daily));
    stats.recordGame();
    ui.toast(t(daily ? 'toast.newDaily' : 'toast.newGame'));
  }

  loadShared(rec: GameRecord) {
    const board = replay(rec.deck, rec.draw, rec.actions, rec.cursor);
    if (!board) return;
    this.begin(rec, board);
    ui.toast(t('toast.importLoaded'));
  }

  private begin(rec: GameRecord, board = dealBoard(rec.deck)) {
    ui.cascade = false;
    ui.victory = null;
    ui.clearHint();
    if (ui.modal === 'victory') ui.close();
    this.rec = rec;
    this.board = board;
    this.finished = isWon(board);
    this.startedAt = null;
    this.lifted = new Set();
    this.resume();
    this.dealSeq++;
    this.dealing = true;
    window.setTimeout(() => (this.dealing = false), DEAL_LOCK_MS);
    this.save();
    this.refreshStuck();
    sfx.shuffle();
  }

  // ---------- Timer ----------

  resume() {
    if (!this.finished && this.startedAt === null && document.visibilityState === 'visible') {
      this.now = Date.now();
      this.startedAt = this.now;
    }
  }

  pause() {
    if (this.startedAt !== null) {
      this.rec = { ...this.rec, elapsed: this.elapsed };
      this.startedAt = null;
      this.save();
    }
  }

  private save() {
    store.set(GAME_KEY, JSON.stringify({ ...this.rec, elapsed: this.elapsed }));
  }

  // ---------- Moves ----------

  private commit(a: Action, next: Board) {
    const prev = this.board;
    const actions = this.rec.actions.slice(0, this.rec.cursor); // a new action drops the redo tail
    actions.push(encodeAction(a));
    this.rec = { ...this.rec, actions, cursor: actions.length };
    this.board = next;
    this.lift(movedCards(prev, next));
    ui.clearHint();
    this.save();
    this.refreshStuck();
    if (isWon(next)) this.finish();
  }

  private lift(cards: Set<Card>) {
    this.lifted = cards;
    clearTimeout(this.liftTimer);
    this.liftTimer = window.setTimeout(() => (this.lifted = new Set()), 450);
  }

  draw() {
    if (this.busy) return;
    const a: Action = { t: 'draw' };
    const next = applyAction(this.board, a, this.rec.draw);
    if (!next) {
      sfx.invalid();
      return;
    }
    const recycled = this.board.stock.length === 0;
    const delta = next.score - this.board.score;
    this.commit(a, next);
    if (recycled) {
      ui.pop({ k: 's', i: 0 }, delta);
      sfx.recycle();
      haptic(10);
    } else {
      sfx.flip();
      haptic(8);
    }
  }

  move(from: PileRef, to: PileRef, n: number): boolean {
    if (this.busy) return false;
    const a: Action = { t: 'move', from, to, n };
    const next = applyAction(this.board, a, this.rec.draw);
    if (!next) return false;
    const delta = next.score - this.board.score;
    this.commit(a, next);
    ui.pop(to, delta);
    this.tipOnce();
    if (to.k === 'f') {
      ui.land(to.i);
      sfx.foundation();
      haptic(14);
    } else {
      sfx.place();
      haptic(10);
    }
    return true;
  }

  /** Teaches the double-tap shortcut once, after the player has made a few drags. */
  private tipOnce() {
    if (this.rec.cursor !== 6 || store.get('solitaire_tip')) return;
    store.set('solitaire_tip', '1');
    window.setTimeout(() => ui.toast(t('toast.tip')), 900);
  }

  /** Double-tap / Enter: send the cards to their best legal destination. */
  smartMove(from: PileRef, n: number, announce = false): boolean {
    if (this.busy) return false;
    const target = smartTarget(this.board, from, n);
    if (target) return this.move(target.from, target.to, target.n);
    sfx.invalid();
    haptic([20, 30, 20]);
    const cards = pickUp(this.board, from, n);
    if (cards) ui.shake(cards[0]);
    if (announce) ui.toast(t('toast.noTarget'));
    return false;
  }

  hint() {
    if (this.busy) return;
    const h = findHint(this.board);
    if (!h) {
      ui.toast(t('toast.noMovesHint'));
      sfx.invalid();
      haptic([20, 30, 20]);
      return;
    }
    ui.showHint(h.move, h.why);
    sfx.flip();
  }

  // ---------- Undo / redo / timeline ----------

  /** Moves the cursor anywhere on the timeline. Going back costs 1 point; going forward refunds it. */
  jump(target: number) {
    const { rec } = this;
    if (this.busy || target === rec.cursor || target < 0 || target > rec.actions.length) return;
    const board = replay(rec.deck, rec.draw, rec.actions, target);
    if (!board) return;
    const penalty = target < rec.cursor ? rec.penalty + 1 : Math.max(0, rec.penalty - 1);
    this.lift(movedCards(this.board, board));
    this.rec = { ...rec, cursor: target, penalty };
    this.board = board;
    ui.clearHint();
    this.save();
    this.refreshStuck();
    if (isWon(board)) this.finish();
  }

  undo() {
    if (!this.canUndo) {
      if (!this.busy) ui.toast(t('toast.nothingUndo'));
      return;
    }
    this.jump(this.rec.cursor - 1);
    sfx.undo();
    haptic(15);
  }

  redo() {
    if (!this.canRedo) {
      if (!this.busy) ui.toast(t('toast.nothingRedo'));
      return;
    }
    this.jump(this.rec.cursor + 1);
    sfx.redo();
    haptic(15);
  }

  // ---------- Auto finish ----------

  async autoFinish() {
    if (!this.canAuto) return;
    this.auto = true;
    try {
      for (let guard = 0; guard < 60; guard++) {
        const m = nextAutoMove(this.board);
        if (!m) break;
        const a: Action = { t: 'move', from: m.from, to: m.to, n: 1 };
        const next = applyAction(this.board, a, this.rec.draw);
        if (!next) break;
        const delta = next.score - this.board.score;
        this.commit(a, next);
        ui.pop(m.to, delta);
        ui.land(m.to.i);
        sfx.foundation();
        haptic(10);
        await sleep(130);
      }
    } finally {
      this.auto = false;
    }
  }

  // ---------- Outcome ----------

  private refreshStuck() {
    const stuck = !isWon(this.board) && isStuck(this.board, this.rec.draw);
    if (stuck && !this.stuck) ui.toast(t('toast.noMoves'));
    this.stuck = stuck;
  }

  private finish() {
    if (this.finished) return;
    const time = Math.floor(this.elapsed);
    this.finished = true;
    this.startedAt = null;
    this.rec = { ...this.rec, elapsed: time };
    const score = this.score;
    const { newBest, milestone } = stats.recordWin(score, this.rec.cursor, time, this.rec.daily);
    this.save();
    sfx.victory();
    haptic([30, 60, 30, 60, 90]);
    ui.victory = { score, moves: this.rec.cursor, time, newBest, difficulty: this.rec.daily ? this.rec.difficulty : 0 };
    ui.cascade = true; // the cascade opens the victory dialog when it ends
    if (milestone) window.setTimeout(() => ui.toast(t('toast.streak', { n: milestone })), 2600);
  }

  // ---------- Sharing ----------

  shareLink(): string {
    return `${location.origin}${location.pathname}#g=${encodeShare({ ...this.rec, elapsed: Math.floor(this.elapsed) })}`;
  }
}

export const game = new Game();
