<script lang="ts">
  import type { Card as CardId, PileRef } from '../engine/types';
  import { RANKS, suitOf, rankOf } from '../engine/cards';
  import { samePile } from '../engine/actions';
  import { canPlace, pickUp } from '../engine/rules';
  import { computeMetrics, dropTarget, pileOrigin, placeCards, type Placed } from '../layout';
  import { game } from '../state/game.svelte';
  import { ui } from '../state/ui.svelte';
  import { t, type Key } from '../i18n/index.svelte';
  import { sfx, haptic } from '../audio';
  import Card from './Card.svelte';
  import Suit from './Suit.svelte';
  import Icon from './Icon.svelte';

  const DRAG_THRESHOLD = 7;
  const DOUBLE_TAP_MS = 320;
  const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;

  let box: HTMLDivElement;
  let W = $state(0);
  let H = $state(0);
  let resizing = $state(false);
  let resizeTimer = 0;

  const m = $derived(computeMetrics(W || 360, H || 600));
  const placed = $derived(placeCards(game.board, m, game.rec.draw));
  const stockAt = $derived(pileOrigin(m, { k: 's', i: 0 }));
  const tableauSlots = [0, 1, 2, 3, 4, 5, 6];

  // Deal order (row by row, like a real deal) drives the stagger of the deal animation.
  const dealOrder = $derived.by(() => {
    const order = new Map<CardId, number>();
    let step = 0;
    for (let row = 0; row < 7; row++) {
      for (let col = row; col < 7; col++) order.set(game.rec.deck[(col * (col + 1)) / 2 + row], step++);
    }
    return order;
  });

  // While the viewport changes, cards snap instead of sliding.
  $effect(() => {
    void W;
    void H;
    resizing = true;
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => (resizing = false), 140);
  });

  // ---------- Drag & tap ----------
  interface Drag {
    from: PileRef;
    n: number;
    cards: CardId[];
    rel: number[]; // vertical offset of each carried card relative to the grabbed one
    gx: number;
    gy: number;
    px: number;
    py: number;
    targets: PileRef[];
  }
  interface Pending {
    pointerId: number;
    kind: 'stock' | 'card';
    startX: number;
    startY: number;
    from: PileRef;
    n: number;
    cards: CardId[];
    card: CardId;
    gx: number;
    gy: number;
    rel: number[];
  }
  let drag = $state.raw<Drag | null>(null);
  let pending: Pending | null = null;
  let lastTap: { card: CardId; at: number } | null = null;
  let origin = { left: 0, top: 0 };

  const local = (e: PointerEvent) => ({ x: e.clientX - origin.left, y: e.clientY - origin.top });

  function onPointerDown(e: PointerEvent) {
    if (pending || game.busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
    sfx.unlock();
    const target = e.target as HTMLElement;
    const rect = box.getBoundingClientRect();
    origin = { left: rect.left, top: rect.top };
    const { x, y } = local(e);

    const cardEl = target.closest<HTMLElement>('[data-card]');
    const slotEl = target.closest<HTMLElement>('[data-slot]');
    const base = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, gx: 0, gy: 0, rel: [] as number[], cards: [] as CardId[], n: 0 };

    if (slotEl?.dataset.slot === 's' || (cardEl && placed[+cardEl.dataset.card!].pile.k === 's')) {
      pending = { ...base, kind: 'stock', from: { k: 's', i: 0 }, card: -1 };
    } else if (cardEl) {
      const p = placed[+cardEl.dataset.card!];
      let n = 1;
      if (p.pile.k === 't') {
        if (!p.up) return;
        n = game.board.tab[p.pile.i].length - p.idx;
      } else if (p.pile.k === 'w' && p.idx !== game.board.waste.length - 1) return;
      else if (p.pile.k === 'f' && p.idx !== game.board.found[p.pile.i].length - 1) return;
      const cards = pickUp(game.board, p.pile, n);
      if (!cards) return;
      pending = { ...base, kind: 'card', from: p.pile, n, cards, card: p.card, gx: x - p.x, gy: y - p.y, rel: cards.map((c) => placed[c].y - p.y) };
    } else {
      return;
    }
    box.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (!pending || e.pointerId !== pending.pointerId || pending.kind !== 'card') return;
    const { x, y } = local(e);
    if (!drag) {
      if (Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY) < DRAG_THRESHOLD) return;
      ui.clearHint();
      const targets: PileRef[] = [];
      for (let i = 0; i < 4; i++) targets.push({ k: 'f', i });
      for (let i = 0; i < 7; i++) targets.push({ k: 't', i });
      drag = {
        from: pending.from,
        n: pending.n,
        cards: pending.cards,
        rel: pending.rel,
        gx: pending.gx,
        gy: pending.gy,
        px: x,
        py: y,
        targets: targets.filter((p) => !samePile(p, pending!.from) && canPlace(game.board, pending!.cards, p))
      };
    } else {
      drag = { ...drag, px: x, py: y };
    }
    e.preventDefault();
  }

  function onPointerUp(e: PointerEvent) {
    if (!pending || e.pointerId !== pending.pointerId) return;
    const p = pending;
    pending = null;
    if (box.hasPointerCapture(e.pointerId)) box.releasePointerCapture(e.pointerId);

    if (drag) {
      const d = drag;
      drag = null;
      const target = dropTarget(m, d.px, d.py);
      if (target && !samePile(target, d.from) && !game.move(d.from, target, d.n)) {
        sfx.invalid();
        haptic([20, 30, 20]);
      }
      return;
    }
    if (p.kind === 'stock') {
      game.draw();
      return;
    }
    const now = performance.now();
    if (lastTap && lastTap.card === p.card && now - lastTap.at < DOUBLE_TAP_MS) {
      lastTap = null;
      game.smartMove(p.from, p.n);
    } else {
      lastTap = { card: p.card, at: now };
    }
  }

  function cancelDrag() {
    pending = null;
    drag = null;
  }

  // ---------- Keyboard: arrows move focus, Enter plays the focused card, Space draws ----------
  const TOP_ROW = ['s', 'w', 'f0', 'f1', 'f2', 'f3'];
  const refKey = (p: PileRef) => (p.k === 't' ? `t${p.i}` : p.k === 'f' ? `f${p.i}` : p.k);
  const refOf = (key: string): PileRef => ({ k: key[0] as PileRef['k'], i: key.length > 1 ? Number(key[1]) : 0 });
  const DOWN_OF: Record<string, number> = { s: 0, w: 1, f0: 3, f1: 4, f2: 5, f3: 6 };
  const UP_OF = ['s', 'w', 'w', 'f0', 'f1', 'f2', 'f3'];

  function firstUp(col: number): number {
    const i = game.board.tab[col].findIndex((s) => s.up);
    return i < 0 ? 0 : i;
  }

  function focusPile(key: string, idx = Infinity) {
    const ref = refOf(key);
    let el: HTMLElement | null = null;
    if (ref.k === 't') {
      const col = game.board.tab[ref.i];
      if (col.length) {
        const at = Math.min(Math.max(idx, firstUp(ref.i)), col.length - 1);
        el = box.querySelector(`[data-card="${col[at].card}"]`);
      }
    } else if (ref.k === 'w' && game.board.waste.length) {
      el = box.querySelector(`[data-card="${game.board.waste[game.board.waste.length - 1]}"]`);
    } else if (ref.k === 'f' && game.board.found[ref.i].length) {
      const f = game.board.found[ref.i];
      el = box.querySelector(`[data-card="${f[f.length - 1]}"]`);
    }
    (el ?? box.querySelector<HTMLElement>(`[data-slot="${key}"]`))?.focus();
  }

  function currentKey(): { key: string; idx: number } | null {
    const a = document.activeElement as HTMLElement | null;
    if (!a || !box.contains(a)) return null;
    if (a.dataset.card !== undefined) {
      const p = placed[+a.dataset.card];
      return { key: refKey(p.pile), idx: p.idx };
    }
    if (a.dataset.slot) return { key: a.dataset.slot, idx: Infinity };
    return null;
  }

  function onKeyDown(e: KeyboardEvent) {
    const cur = currentKey();
    if (e.key === 'Escape') return void (document.activeElement as HTMLElement | null)?.blur();
    if (!cur) {
      if (e.target === box && e.key.startsWith('Arrow')) {
        e.preventDefault();
        focusPile('s');
      }
      return;
    }
    const top = TOP_ROW.indexOf(cur.key);
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowLeft': {
        const d = e.key === 'ArrowRight' ? 1 : -1;
        if (top >= 0) focusPile(TOP_ROW[Math.min(5, Math.max(0, top + d))]);
        else focusPile(`t${Math.min(6, Math.max(0, Number(cur.key[1]) + d))}`, cur.idx);
        break;
      }
      case 'ArrowDown':
        if (top >= 0) focusPile(`t${DOWN_OF[cur.key]}`, 0);
        else focusPile(cur.key, cur.idx + 1);
        break;
      case 'ArrowUp': {
        if (top >= 0) break;
        const col = Number(cur.key[1]);
        if (cur.idx > firstUp(col)) focusPile(cur.key, cur.idx - 1);
        else focusPile(UP_OF[col]);
        break;
      }
      case 'Enter':
      case ' ': {
        const ref = refOf(cur.key);
        if (ref.k === 's') game.draw();
        else if (ref.k !== 'f' || game.board.found[ref.i].length) {
          const n = ref.k === 't' ? game.board.tab[ref.i].length - cur.idx : 1;
          if (ref.k !== 'f' && n > 0 && Number.isFinite(cur.idx)) game.smartMove(ref, n, true);
          else if (ref.k === 'w') game.smartMove(ref, 1, true);
        }
        break;
      }
      default:
        return;
    }
    e.preventDefault();
  }

  // ---------- Labels ----------
  const rankName = (c: CardId) => RANKS[rankOf(c)];
  function labelOf(p: Placed): string {
    const vars = { rank: rankName(p.card), suit: t(`suit.${SUITS[suitOf(p.card)]}` as Key) };
    if (p.pile.k === 't') return t('aria.cardCol', { ...vars, n: p.pile.i + 1 });
    if (p.pile.k === 'f') return t('aria.cardFound', vars);
    return t('aria.cardWaste', vars);
  }

  const hintCards = $derived(new Set(ui.hint?.move?.cards ?? []));
  const hintDest = $derived<PileRef | null>(ui.hint ? (ui.hint.move ? ui.hint.move.to : { k: 's', i: 0 }) : null);
  const isDest = (p: PileRef) => !!hintDest && samePile(hintDest, p);
  const isDrop = (p: PileRef) => !!drag && drag.targets.some((x) => samePile(x, p));
  const stockLabel = $derived(
    game.board.stock.length
      ? t('aria.stockN', { n: game.board.stock.length })
      : game.board.waste.length
        ? t('aria.stockRecycle')
        : t('aria.stockEmpty')
  );
</script>

<svelte:window onblur={cancelDrag} />
<svelte:document onvisibilitychange={() => document.hidden && cancelDrag()} />

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
  class="board"
  class:dealing={game.dealing}
  class:resizing
  class:dragging={!!drag}
  bind:this={box}
  bind:clientWidth={W}
  bind:clientHeight={H}
  style:--cw="{m.cw}px"
  style:--ch="{m.ch}px"
  style:--sx="{stockAt.x}px"
  style:--sy="{stockAt.y}px"
  role="application"
  aria-label={t('aria.board')}
  tabindex="0"
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={cancelDrag}
  onkeydown={onKeyDown}
  oncontextmenu={(e) => e.preventDefault()}
>
  <!-- Pile slots: drop zones, empty-pile markers, hint targets -->
  {#each [{ k: 's', i: 0 }, { k: 'w', i: 0 }] as const as pile (pile.k)}
    {@const at = pileOrigin(m, pile)}
    <div
      class="slot"
      class:hint-dst={isDest(pile)}
      class:recycle={pile.k === 's' && !game.board.stock.length && game.board.waste.length > 0}
      style:--x="{at.x}px"
      style:--y="{at.y}px"
      data-slot={pile.k}
      role={pile.k === 's' ? 'button' : undefined}
      aria-label={pile.k === 's' ? stockLabel : t('aria.waste', { n: game.board.waste.length })}
      tabindex="-1"
    >
      {#if pile.k === 's' && !game.board.stock.length && game.board.waste.length}
        <span class="recycle-glyph"><Icon name="recycle" size={Math.round(m.cw * 0.36)} /></span>
      {/if}
    </div>
  {/each}

  {#each [0, 1, 2, 3] as i (i)}
    {@const pile = { k: 'f', i } as const}
    {@const at = pileOrigin(m, pile)}
    <div
      class="slot foundation"
      class:hint-dst={isDest(pile)}
      class:drop={isDrop(pile)}
      style:--x="{at.x}px"
      style:--y="{at.y}px"
      data-slot={`f${i}`}
      aria-label={t('aria.foundationN', { suit: t(`suit.${SUITS[i]}` as Key), n: game.board.found[i].length })}
      tabindex="-1"
    >
      <span class="mark" class:red={i === 1 || i === 2}><Suit suit={i} /></span>
      {#if ui.landed[i] > 0}
        {#key ui.landed[i]}<span class="glow"></span>{/key}
      {/if}
    </div>
  {/each}

  {#each tableauSlots as i (i)}
    {@const pile = { k: 't', i } as const}
    {@const at = pileOrigin(m, pile)}
    <div
      class="slot tableau"
      class:hint-dst={isDest(pile)}
      class:drop={isDrop(pile)}
      style:--x="{at.x}px"
      style:--y="{at.y}px"
      data-slot={`t${i}`}
      aria-label={t('aria.col', { n: i + 1 })}
      tabindex="-1"
    >
      <span class="king">K</span>
    </div>
  {/each}

  {#if game.board.stock.length}
    <span class="count" style:--x="{stockAt.x + m.cw}px" style:--y="{stockAt.y}px">{game.board.stock.length}</span>
  {/if}

  <!-- All 52 cards stay mounted for the whole game: a move is only a change of --x/--y, which CSS transitions animate. -->
  {#each placed as p (p.card)}
    {@const dragIndex = drag ? drag.cards.indexOf(p.card) : -1}
    <Card
      card={p.card}
      x={dragIndex >= 0 ? drag!.px - drag!.gx : p.x}
      y={dragIndex >= 0 ? drag!.py - drag!.gy + drag!.rel[dragIndex] : p.y}
      z={p.z}
      up={p.up}
      label={labelOf(p)}
      order={dealOrder.get(p.card) ?? 0}
      dragging={dragIndex >= 0}
      lifted={game.lifted.has(p.card)}
      hinted={hintCards.has(p.card)}
      shaking={ui.shaken?.card === p.card}
      interactive={p.up && p.pile.k !== 's'}
    />
  {/each}

  {#each ui.pops as pop (pop.id)}
    {@const at = pileOrigin(m, pop.pile)}
    <span
      class="pop"
      class:neg={pop.delta < 0}
      style:left="{at.x + m.cw / 2}px"
      style:top="{at.y + Math.min(m.ch * 0.22, 26)}px"
      onanimationend={() => ui.removePop(pop.id)}
    >{pop.delta > 0 ? '+' : ''}{pop.delta}</span>
  {/each}
</div>

<style>
  .board {
    position: relative;
    min-height: 0;
    overflow: hidden;
    touch-action: none;
    outline: none;
    contain: layout paint;
  }

  /* ---------- Slots ---------- */
  .slot {
    position: absolute;
    left: 0;
    top: 0;
    width: var(--cw);
    height: var(--ch);
    transform: translate(var(--x), var(--y));
    border-radius: calc(var(--cw) * 0.085);
    border: 1.5px dashed var(--line);
    background: oklch(0 0 0 / 0.14);
    display: grid;
    place-items: center;
    outline: none;
    transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  }
  .slot:focus-visible {
    border-style: solid;
    border-color: var(--brass-bright);
    box-shadow: 0 0 0 3px oklch(0.92 0.1 92 / 0.45);
  }
  .slot.foundation .mark {
    width: 42%;
    color: var(--brass);
    opacity: 0.3;
  }
  .slot.tableau {
    border-style: solid;
    border-color: oklch(1 0 0 / 0.06);
    background: oklch(0 0 0 / 0.1);
  }
  .king {
    font-family: var(--font-display);
    font-weight: 500;
    font-size: calc(var(--cw) * 0.42);
    font-variation-settings: 'opsz' 144, 'SOFT' 100;
    color: var(--brass);
    opacity: 0.16;
  }
  .recycle-glyph {
    color: var(--brass);
    opacity: 0.8;
    display: grid;
    animation: spin-in 0.5s var(--ease-spring);
  }
  .slot.recycle {
    border-color: var(--brass-line);
    cursor: pointer;
  }
  .slot.drop {
    border-style: solid;
    border-color: var(--brass);
    background: oklch(0.82 0.125 85 / 0.1);
    box-shadow: 0 0 0 1px var(--brass-line), 0 0 22px -4px oklch(0.82 0.125 85 / 0.45);
  }
  .slot.hint-dst {
    border-style: solid;
    border-color: var(--brass-bright);
    animation: dest-pulse 1.1s ease-in-out infinite;
  }
  .glow {
    position: absolute;
    inset: -4px;
    border-radius: inherit;
    pointer-events: none;
    animation: land 0.7s var(--ease-out) forwards;
    z-index: 400;
  }

  .count {
    position: absolute;
    left: 0;
    top: 0;
    transform: translate(calc(var(--x) - 100% + 4px), calc(var(--y) - 6px));
    z-index: 60;
    min-width: 22px;
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--panel);
    border: 1px solid var(--brass-line);
    font: 600 11px/18px var(--font-mono);
    color: var(--brass-bright);
    text-align: center;
    pointer-events: none;
  }

  .pop {
    position: absolute;
    z-index: 900;
    translate: -50% 0;
    font: 700 calc(var(--cw) * 0.24 + 6px) / 1 var(--font-display);
    font-variation-settings: 'opsz' 72, 'SOFT' 100;
    color: var(--brass-bright);
    text-shadow: 0 2px 8px oklch(0 0 0 / 0.6);
    pointer-events: none;
    animation: pop-rise 1.1s var(--ease-out) forwards;
  }
  .pop.neg {
    color: oklch(0.78 0.14 25);
  }

  @keyframes pop-rise {
    0% { opacity: 0; transform: translateY(6px) scale(0.7); }
    18% { opacity: 1; transform: translateY(-4px) scale(1.12); }
    100% { opacity: 0; transform: translateY(-38px) scale(1); }
  }
  @keyframes land {
    0% { box-shadow: 0 0 0 0 oklch(0.92 0.1 92 / 0.9), inset 0 0 0 0 oklch(0.92 0.1 92 / 0.6); opacity: 1; }
    100% { box-shadow: 0 0 0 18px oklch(0.92 0.1 92 / 0), inset 0 0 30px 6px oklch(0.92 0.1 92 / 0); opacity: 0; }
  }
  @keyframes dest-pulse {
    0%, 100% { box-shadow: 0 0 0 0 oklch(0.82 0.125 85 / 0.7); }
    50% { box-shadow: 0 0 0 7px oklch(0.82 0.125 85 / 0); }
  }
  @keyframes spin-in {
    from { transform: rotate(-200deg) scale(0.4); opacity: 0; }
    to { transform: none; opacity: 0.8; }
  }
</style>
