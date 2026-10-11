<script lang="ts">
  import { game } from '../state/game.svelte';
  import { stats } from '../state/stats.svelte';
  import { ui } from '../state/ui.svelte';
  import { t, LOCALES } from '../i18n/index.svelte';
  import { settings } from '../state/settings.svelte';
  import { decodeAction } from '../engine/actions';
  import { dealBoard, dateKey } from '../engine/deal';
  import { applyAction, pickUp } from '../engine/rules';
  import { rankLabel, suitOf } from '../engine/cards';
  import type { PileRef } from '../engine/types';
  import { fmtTime } from './format';
  import Modal from './Modal.svelte';
  import Icon from './Icon.svelte';
  import Suit from './Suit.svelte';

  const GLYPH = ['♠\uFE0E', '♥\uFE0E', '♦\uFE0E', '♣\uFE0E'];

  // ---------- Record ----------
  const dash = '—';
  const rate = $derived(stats.winRate === null ? dash : `${stats.winRate}%`);

  // ---------- Daily calendar: the last 28 days ----------
  const days = $derived.by(() => {
    const today = new Date();
    const list: { key: string; done: boolean; today: boolean; label: string }[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      list.push({
        key,
        done: stats.dailyLog.includes(key),
        today: i === 0,
        label: d.toLocaleDateString(LOCALES[settings.lang], { month: 'short', day: 'numeric' })
      });
    }
    return list;
  });

  // ---------- Sparkline of recent winning scores ----------
  const spark = $derived.by(() => {
    const scores = stats.history.map((h) => h.s);
    if (!scores.length) return null;
    const W = 300, H = 64, pad = 9;
    let min = Math.min(...scores);
    let max = Math.max(...scores);
    if (max === min) {
      min = Math.max(0, min - 20);
      max += 20;
    }
    const pts = scores.map((s, i) => [
      scores.length === 1 ? W / 2 : pad + (W - 2 * pad) * (i / (scores.length - 1)),
      H - pad - (H - 2 * pad) * ((s - min) / (max - min))
    ]);
    const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `M${pts[0][0].toFixed(1)},${H - 2} ${pts.map((p) => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')} L${pts[pts.length - 1][0].toFixed(1)},${H - 2} Z`;
    return { line, area, pts: pts.length <= 14 ? pts : [], scores };
  });
  const chips = $derived(stats.history.slice(-5).reverse());

  // ---------- Move history (replayed once to describe every action) ----------
  type Dot = 'draw' | 'recycle' | 'foundation' | 'move';
  const log = $derived.by(() => {
    const { deck, draw, actions } = game.rec;
    let board = dealBoard(deck);
    const side = (p: PileRef) =>
      p.k === 'w' ? t('log.waste') : p.k === 'f' ? t('log.foundation', { s: GLYPH[p.i] }) : t('log.column', { n: p.i + 1 });
    const out: { text: string; dot: Dot }[] = [];
    for (const raw of actions) {
      const a = decodeAction(raw);
      if (!a) break;
      if (a.t === 'draw') {
        const recycle = board.stock.length === 0;
        out.push({
          dot: recycle ? 'recycle' : 'draw',
          text: recycle ? t('log.recycle') : t(draw === 3 ? 'log.draw3' : 'log.draw1')
        });
      } else {
        const cards = pickUp(board, a.from, a.n);
        const what = a.n > 1 ? t('log.cards', { n: a.n }) : cards ? rankLabel(cards[0]) + GLYPH[suitOf(cards[0])] : '';
        out.push({ dot: a.to.k === 'f' ? 'foundation' : 'move', text: `${side(a.from)} → ${side(a.to)} · ${what}` });
      }
      board = applyAction(board, a, draw) ?? board;
    }
    return out;
  });

  let preview = $state<number | null>(null);
  const total = $derived(game.rec.actions.length);
  const pos = $derived(preview ?? game.rec.cursor);
  const canScrub = $derived(!game.busy);

  let listEl = $state<HTMLDivElement>();
  $effect(() => {
    void log.length;
    if (ui.modal === 'stats' && listEl) listEl.scrollTop = listEl.scrollHeight;
  });

  // ---------- Reset needs a second tap ----------
  let armed = $state(false);
  let armTimer = 0;
  function reset() {
    if (!armed) {
      armed = true;
      armTimer = window.setTimeout(() => (armed = false), 3000);
      return;
    }
    clearTimeout(armTimer);
    armed = false;
    stats.reset();
    ui.toast(t('toast.statsReset'));
  }
  function close() {
    armed = false;
    ui.close();
  }
</script>

<Modal open={ui.modal === 'stats'} onclose={close} label={t('stats.title')}>
  <span class="sheet-emblem"><Suit suit={0} /></span>
  <h2 class="sheet-title">{t('stats.title')}</h2>
  <p class="sheet-sub">{t('stats.sub')}</p>

  <div class="grid">
    <div class="cell"><span class="l">{t('stats.games')}</span><span class="n">{stats.games}</span></div>
    <div class="cell"><span class="l">{t('stats.wins')}</span><span class="n">{stats.wins}</span></div>
    <div class="cell wide"><span class="l">{t('stats.rate')}</span><span class="n">{rate}</span></div>
    <div class="cell"><span class="l">{t('stats.best')}</span><span class="n">{stats.highScore}</span></div>
    <div class="cell"><span class="l">{t('stats.bestTime')}</span><span class="n">{stats.bestTime ? fmtTime(stats.bestTime) : dash}</span></div>
    <div class="cell wide"><span class="l">{t('stats.fewest')}</span><span class="n">{stats.bestMoves || dash}</span></div>
    <div class="cell flame"><span class="l">{t('stats.streak')}</span><span class="n"><Icon name="flame" size={17} />{stats.streak.current}</span></div>
    <div class="cell flame"><span class="l">{t('stats.streakBest')}</span><span class="n"><Icon name="flame" size={17} />{stats.streak.best}</span></div>
  </div>

  <section class="sheet-section">
    <h3 class="sheet-h">{t('stats.daily28')}</h3>
    <div class="calendar">
      {#each days as d (d.key)}
        <span class="day" class:done={d.done} class:today={d.today} title={d.label} role="img" aria-label={`${d.label}${d.done ? ' ✓' : ''}`}></span>
      {/each}
    </div>
  </section>

  <section class="sheet-section">
    <h3 class="sheet-h">{t('stats.recent')}</h3>
    <div class="panel spark">
      {#if spark}
        <svg viewBox="0 0 300 64" preserveAspectRatio="none" role="img" aria-label={t('stats.sparkAria', { n: spark.scores.length, a: spark.scores[0], b: spark.scores[spark.scores.length - 1] })}>
          <defs>
            <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="var(--brass)" stop-opacity="0.45" />
              <stop offset="1" stop-color="var(--brass)" stop-opacity="0.03" />
            </linearGradient>
          </defs>
          <path d={spark.area} fill="url(#spark-fill)" />
          <polyline points={spark.line} fill="none" stroke="var(--brass-bright)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          {#each spark.pts as p, i}
            <circle cx={p[0]} cy={p[1]} r="2.6" fill="var(--brass-bright)"><title>{spark.scores[i]} {t('stats.pts')}</title></circle>
          {/each}
        </svg>
      {:else}
        <p class="empty">{t('stats.sparkEmpty')}</p>
      {/if}
    </div>
    {#if chips.length}
      <div class="chips">
        {#each chips as c}<span><b>{c.s}</b> {t('stats.pts')} · {fmtTime(c.t)}</span>{/each}
      </div>
    {/if}
  </section>

  <section class="sheet-section">
    <h3 class="sheet-h">{t('stats.logH')}</h3>
    <p class="cap">{t('stats.logScrub')}</p>
    <div class="slider-row">
      <input
        type="range"
        min="0"
        max={total}
        value={pos}
        disabled={!canScrub || total === 0}
        style:--pct="{total ? (pos / total) * 100 : 100}%"
        aria-label={t('stats.sliderAria')}
        oninput={(e) => (preview = +e.currentTarget.value)}
        onchange={(e) => {
          const v = +e.currentTarget.value;
          preview = null;
          game.jump(v);
        }}
      />
      <span class="pos">{total ? t('stats.sliderPos', { a: pos, b: total }) : dash}</span>
    </div>
    <div class="log" bind:this={listEl} aria-label={t('aria.logList')}>
      {#if !log.length}
        <p class="empty">{t('stats.logEmpty')}</p>
      {:else}
        {#each log as e, i}
          <button
            class="entry"
            class:undone={i >= game.rec.cursor}
            class:current={i === game.rec.cursor - 1}
            disabled={!canScrub}
            onclick={() => game.jump(i)}
            aria-label={t('log.scrubAria', { n: i + 1, m: e.text })}
          >
            <span class="no">{i + 1}</span><span class="dot {e.dot}"></span><span class="tx">{e.text}</span>
          </button>
        {/each}
      {/if}
    </div>
  </section>

  <div class="sheet-actions">
    <button class="btn primary" onclick={close}>{t('set.close')}</button>
    <button class="btn" class:armed onclick={reset}>{armed ? t('stats.resetConfirm') : t('stats.reset')}</button>
  </div>
</Modal>

<style>
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    padding: 13px 6px;
    border-radius: 14px;
    border: 1px solid var(--line);
    background: oklch(0 0 0 / 0.16);
  }
  .cell.wide { grid-column: 1 / -1; }
  .l {
    font: 600 9.5px/1 var(--font-ui);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }
  .n {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font: 600 1.45rem/1 var(--font-mono);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.03em;
  }
  .flame .n { color: var(--brass); }

  .calendar {
    display: grid;
    grid-template-columns: repeat(14, 1fr);
    gap: 5px;
  }
  .day {
    aspect-ratio: 1;
    border-radius: 5px;
    background: oklch(1 0 0 / 0.06);
    border: 1px solid oklch(1 0 0 / 0.05);
  }
  .day.done {
    background: linear-gradient(150deg, var(--brass-bright), var(--brass-deep));
    border-color: transparent;
  }
  .day.today {
    outline: 1.5px solid var(--ink-dim);
    outline-offset: 1px;
  }

  .spark { padding: 8px; }
  .spark svg { display: block; width: 100%; height: 64px; }
  .empty {
    margin: 0;
    padding: 14px 4px;
    text-align: center;
    color: var(--ink-faint);
    font-size: 0.88rem;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 9px;
  }
  .chips span {
    padding: 3px 10px;
    border-radius: 999px;
    border: 1px solid var(--line);
    font: 500 11.5px/1.5 var(--font-mono);
    color: var(--ink-dim);
  }
  .chips b { color: var(--brass-bright); font-weight: 600; }

  .cap { margin: -2px 0 10px; color: var(--ink-faint); font-size: 0.85rem; }
  .slider-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .pos { min-width: 5.5em; text-align: right; font: 500 12px/1 var(--font-mono); color: var(--ink-dim); }
  input[type='range'] {
    flex: 1;
    height: 22px;
    appearance: none;
    background: transparent;
    cursor: pointer;
  }
  input[type='range']::-webkit-slider-runnable-track {
    height: 5px;
    border-radius: 99px;
    background: linear-gradient(90deg, var(--brass) var(--pct), oklch(1 0 0 / 0.12) var(--pct));
  }
  input[type='range']::-moz-range-track {
    height: 5px;
    border-radius: 99px;
    background: linear-gradient(90deg, var(--brass) var(--pct), oklch(1 0 0 / 0.12) var(--pct));
  }
  input[type='range']::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    margin-top: -7.5px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, var(--brass-bright), var(--brass-deep));
    border: 0;
    box-shadow: 0 2px 8px oklch(0 0 0 / 0.5);
  }
  input[type='range']::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, var(--brass-bright), var(--brass-deep));
    border: 0;
  }
  input[type='range']:disabled { opacity: 0.4; cursor: default; }

  .log {
    max-height: 170px;
    overflow-y: auto;
    padding: 4px;
    border-radius: 14px;
    border: 1px solid var(--line);
    background: oklch(0 0 0 / 0.16);
    scrollbar-width: thin;
  }
  .entry {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 7px 10px;
    border: 0;
    border-radius: 9px;
    background: none;
    text-align: left;
    font-size: 0.86rem;
    color: var(--ink);
  }
  .entry:hover:not(:disabled) { background: oklch(1 0 0 / 0.07); }
  .entry:disabled { cursor: default; }
  .entry.undone { opacity: 0.38; }
  .entry.current { background: oklch(0.82 0.125 85 / 0.12); }
  .no { min-width: 2.2em; font: 500 11px/1 var(--font-mono); color: var(--ink-faint); }
  .dot { flex: none; width: 7px; height: 7px; border-radius: 50%; background: var(--ink-faint); }
  .dot.foundation { background: var(--brass); }
  .dot.move { background: oklch(0.75 0.1 200); }
  .dot.draw { background: oklch(0.7 0.02 var(--hue)); }
  .dot.recycle { background: oklch(0.72 0.14 25); }
  .tx { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .btn.armed { border-color: oklch(0.72 0.15 25); color: oklch(0.85 0.1 25); }
</style>
