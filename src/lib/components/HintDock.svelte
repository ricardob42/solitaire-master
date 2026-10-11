<script lang="ts">
  import { game } from '../state/game.svelte';
  import { ui } from '../state/ui.svelte';
  import { t } from '../i18n/index.svelte';
  import { rankLabel, suitOf } from '../engine/cards';
  import Icon from './Icon.svelte';
  import Suit from './Suit.svelte';

  const GLYPH = ['♠\uFE0E', '♥\uFE0E', '♦\uFE0E', '♣\uFE0E'];

  /** What to play and why: kept on screen long enough to be read, unlike a toast. */
  const bubble = $derived.by(() => {
    const h = ui.hint;
    if (!h) return null;
    if (!h.move) {
      return { title: t('hint.drawTitle'), why: game.board.stock.length ? t('hint.whyDraw') : t('hint.whyRecycle'), suit: -1 };
    }
    const m = h.move;
    const first = m.cards[0];
    const dest = m.to.k === 'f' ? t('hint.toFoundation') : t('hint.toColumn', { n: m.to.i + 1 });
    const why = {
      foundation: t('hint.whyFoundation'),
      reveal: t('hint.whyReveal'),
      waste: t('hint.whyWaste'),
      build: t('hint.whyBuild'),
      draw: t('hint.whyDraw')
    }[h.why];
    return { title: `${rankLabel(first)}${GLYPH[suitOf(first)]}${m.n > 1 ? ` +${m.n - 1}` : ''} ${dest}`, why, suit: suitOf(first) };
  });
</script>

<button class="fab" class:stuck={game.stuck} onclick={() => game.hint()} disabled={game.busy} title={game.stuck ? t('title.fabStuck') : t('title.fab')} aria-label={t('aria.fab')}>
  <Icon name="bulb" size={23} />
</button>

{#if bubble}
  {#key ui.hint?.id}
    <div class="bubble" role="status">
      <span class="move">
        {#if bubble.suit >= 0}<i class="s" class:red={bubble.suit === 1 || bubble.suit === 2}><Suit suit={bubble.suit} /></i>{:else}<i class="s"><Icon name="recycle" size={15} /></i>{/if}
        {bubble.title}
      </span>
      <span class="why">{bubble.why}</span>
    </div>
  {/key}
{/if}

<style>
  .fab {
    position: fixed;
    z-index: 35;
    right: max(18px, env(safe-area-inset-right));
    bottom: max(18px, env(safe-area-inset-bottom));
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: 1px solid oklch(1 0 0 / 0.35);
    color: oklch(0.22 0.04 80);
    background: radial-gradient(circle at 32% 26%, var(--brass-bright), var(--brass) 55%, var(--brass-deep));
    box-shadow: 0 10px 24px -8px oklch(0 0 0 / 0.7), 0 0 0 4px oklch(0.82 0.125 85 / 0.14);
    transition: transform 0.2s var(--ease-spring), opacity 0.2s;
  }
  .fab:hover:not(:disabled) { transform: scale(1.07) rotate(-6deg); }
  .fab:active:not(:disabled) { transform: scale(0.94); }
  .fab:disabled { opacity: 0.4; }
  .fab.stuck {
    background: radial-gradient(circle at 32% 26%, oklch(0.85 0.1 30), oklch(0.62 0.17 27));
    animation: stuck-pulse 1.4s ease-in-out infinite;
  }
  @keyframes stuck-pulse {
    0%, 100% { box-shadow: 0 10px 24px -8px oklch(0 0 0 / 0.7), 0 0 0 4px oklch(0.62 0.17 27 / 0.3); }
    50% { box-shadow: 0 10px 24px -8px oklch(0 0 0 / 0.7), 0 0 0 12px oklch(0.62 0.17 27 / 0); }
  }

  .bubble {
    position: fixed;
    z-index: 36;
    right: max(18px, env(safe-area-inset-right));
    bottom: calc(max(18px, env(safe-area-inset-bottom)) + 68px);
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: min(300px, calc(100vw - 36px));
    padding: 12px 16px;
    border-radius: 16px;
    background: var(--panel-raised);
    border: 1px solid var(--brass-line);
    box-shadow: 0 18px 36px -14px oklch(0 0 0 / 0.75);
    animation: rise 0.3s var(--ease-spring);
  }
  .move {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.02rem;
    color: var(--brass-bright);
    font-variation-settings: 'opsz' 36, 'SOFT' 100;
  }
  .s {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    padding: 2px;
    border-radius: 6px;
    background: var(--face-a);
    color: var(--suit-ink);
  }
  .s.red { color: var(--suit-red); }
  .why { font-size: 0.85rem; line-height: 1.4; color: var(--ink-dim); }

  /* Phones already have a hint button: in the dock (portrait) or the header (landscape) */
  @media (max-height: 499px) {
    .fab { display: none; }
  }
  @media (max-width: 760px) and (min-height: 500px) {
    .fab { display: none; }
    .bubble {
      right: 12px;
      left: 12px;
      width: auto;
      bottom: calc(max(8px, env(safe-area-inset-bottom)) + 74px);
    }
  }
</style>
