import { store, clampInt } from './storage';
import { dateKey, previousDateKey } from '../engine/deal';

export interface WinEntry {
  d: string; // date
  s: number; // score
  m: number; // moves
  t: number; // ms
}
export interface DailyRecord {
  date: string;
  won: boolean;
  score: number;
  moves: number;
  time: number;
}

const K = {
  stats: 'solitaire_stats',
  high: 'solitaire_high_score',
  history: 'solitaire_history',
  streak: 'solitaire_streak',
  daily: 'solitaire_daily',
  dailyLog: 'solitaire_daily_log'
};
const HISTORY_MAX = 40;
const DAILY_LOG_MAX = 90;
export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 100];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function loadHistory(): WinEntry[] {
  const raw = store.json(K.history);
  if (!Array.isArray(raw)) return [];
  return raw.slice(-HISTORY_MAX).map((e) => ({
    d: typeof e?.d === 'string' ? e.d.slice(0, 10) : '',
    s: clampInt(e?.s, 0, 1_000_000, 0),
    m: clampInt(e?.m, 0, 1_000_000, 0),
    t: clampInt(e?.t, 0, 86_400_000, 0)
  }));
}

function loadDaily(): DailyRecord | null {
  const r = store.json(K.daily) as Partial<DailyRecord> | null;
  if (!r || typeof r.date !== 'string') return null;
  return {
    date: r.date,
    won: r.won === true,
    score: clampInt(r.score, 0, 1_000_000, 0),
    moves: clampInt(r.moves, 0, 1_000_000, 0),
    time: clampInt(r.time, 0, 86_400_000, 0)
  };
}

function loadDailyLog(): string[] {
  const raw = store.json(K.dailyLog);
  return Array.isArray(raw) ? raw.filter((d): d is string => typeof d === 'string' && DATE_RE.test(d)).slice(-DAILY_LOG_MAX) : [];
}

class Stats {
  games = $state(0);
  wins = $state(0);
  bestTime = $state(0);
  bestMoves = $state(0);
  highScore = $state(0);
  history = $state.raw<WinEntry[]>([]);
  streak = $state({ current: 0, best: 0, last: '' });
  daily = $state.raw<DailyRecord | null>(null);
  dailyLog = $state.raw<string[]>([]);

  constructor() {
    const s = store.json(K.stats) as Record<string, unknown> | null;
    this.games = clampInt(s?.games, 0, 1_000_000, 0);
    this.wins = clampInt(s?.wins, 0, 1_000_000, 0);
    this.bestTime = clampInt(s?.bestTime, 0, 86_400_000, 0);
    this.bestMoves = clampInt(s?.bestMoves, 0, 1_000_000, 0);
    this.highScore = clampInt(parseInt(store.get(K.high) ?? '', 10), 0, 1_000_000, 0);
    this.history = loadHistory();
    const st = store.json(K.streak) as Record<string, unknown> | null;
    this.streak = {
      current: clampInt(st?.current, 0, 9999, 0),
      best: clampInt(st?.best, 0, 9999, 0),
      last: typeof st?.last === 'string' && DATE_RE.test(st.last) ? st.last : ''
    };
    this.daily = loadDaily();
    this.dailyLog = loadDailyLog();
  }

  get dailyDone(): boolean {
    return !!this.daily && this.daily.date === dateKey() && this.daily.won;
  }

  get winRate(): number | null {
    return this.games ? Math.round((this.wins / this.games) * 100) : null;
  }

  private saveCore() {
    store.set(K.stats, JSON.stringify({ games: this.games, wins: this.wins, bestTime: this.bestTime, bestMoves: this.bestMoves }));
    store.set(K.high, String(this.highScore));
  }

  recordGame() {
    this.games++;
    this.saveCore();
  }

  /** Registers a finished game. Returns whether it set a new high score and any streak milestone reached. */
  recordWin(score: number, moves: number, ms: number, daily: boolean): { newBest: boolean; milestone: number | null } {
    this.wins++;
    if (!this.bestTime || ms < this.bestTime) this.bestTime = ms;
    if (!this.bestMoves || moves < this.bestMoves) this.bestMoves = moves;
    const newBest = score > this.highScore;
    if (newBest) this.highScore = score;
    this.saveCore();

    this.history = [...this.history, { d: dateKey(), s: score, m: moves, t: ms }].slice(-HISTORY_MAX);
    store.set(K.history, JSON.stringify(this.history));

    let milestone: number | null = null;
    if (daily) {
      const today = dateKey();
      this.daily = { date: today, won: true, score, moves, time: ms };
      store.set(K.daily, JSON.stringify(this.daily));
      if (!this.dailyLog.includes(today)) {
        this.dailyLog = [...this.dailyLog, today].slice(-DAILY_LOG_MAX);
        store.set(K.dailyLog, JSON.stringify(this.dailyLog));
      }
      if (this.streak.last !== today) {
        this.streak.current = this.streak.last === previousDateKey() ? this.streak.current + 1 : 1;
        this.streak.last = today;
        this.streak.best = Math.max(this.streak.best, this.streak.current);
        store.set(K.streak, JSON.stringify(this.streak));
        if (STREAK_MILESTONES.includes(this.streak.current)) milestone = this.streak.current;
      }
    }
    return { newBest, milestone };
  }

  reset() {
    this.games = this.wins = this.bestTime = this.bestMoves = this.highScore = 0;
    this.history = [];
    this.streak = { current: 0, best: 0, last: '' };
    this.dailyLog = [];
    this.saveCore();
    store.remove(K.history);
    store.remove(K.streak);
    store.remove(K.dailyLog);
  }
}

export const stats = new Stats();
