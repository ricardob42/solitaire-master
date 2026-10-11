<script lang="ts">
  import { RANKS, isRed, rankOf, suitOf } from '../engine/cards';
  import Suit from './Suit.svelte';
  import { settings } from '../state/settings.svelte';

  interface Props {
    card: number;
    x: number;
    y: number;
    z: number;
    up: boolean;
    label: string;
    order?: number; // deal order, drives the staggered deal animation
    dragging?: boolean;
    lifted?: boolean;
    hinted?: boolean;
    shaking?: boolean;
    interactive?: boolean;
  }
  let { card, x, y, z, up, label, order = 0, dragging = false, lifted = false, hinted = false, shaking = false, interactive = false }: Props = $props();

  const suit = $derived(suitOf(card));
  const rank = $derived(rankOf(card));
  const text = $derived(RANKS[rank]);
  const court = $derived(rank >= 10);
  const ace = $derived(rank === 0);
  const rot = $derived(((card * 37) % 9) - 4);
  const emblem = $derived({ classic: 0.5, royal: 0.85, dots: 0, stripe: 0, plaid: 0 }[settings.back]);
</script>

<div
  class="card"
  class:up
  class:dragging
  class:lifted
  class:hinted
  class:shaking
  class:red={isRed(card)}
  style:--x="{x}px"
  style:--y="{y}px"
  style:--z={z + (dragging ? 1000 : lifted ? 500 : 0)}
  style:--d="{order * 26}ms"
  style:--rot="{rot}deg"
  data-card={card}
  role={interactive ? 'button' : undefined}
  aria-label={up ? label : undefined}
  aria-hidden={up ? undefined : 'true'}
  tabindex="-1"
>
  <div class="flip">
    <div class="face">
      <span class="corner tl"><b>{text}</b><i><Suit {suit} /></i></span>
      <span class="corner br"><b>{text}</b><i><Suit {suit} /></i></span>
      <span class="pip" class:ace class:court><Suit {suit} /></span>
    </div>
    <div class="back" style:--emblem={emblem}>
      <div class="art" data-pattern={settings.back}></div>
      <div class="emblem"><Suit suit={0} /></div>
    </div>
  </div>
</div>

<style>
  .card {
    position: absolute;
    left: 0;
    top: 0;
    width: var(--cw);
    height: var(--ch);
    z-index: var(--z);
    transform: translate3d(var(--x), var(--y), 0) rotate(0deg);
    transition: transform 0.36s var(--ease-out);
    will-change: transform;
    perspective: 900px;
    --u: calc(var(--cw) / 100);
    --r: calc(var(--cw) * 0.085);
    outline: none;
  }
  .card.dragging {
    transition: none;
  }

  .flip {
    position: absolute;
    inset: 0;
    transform-style: preserve-3d;
    transform: rotateY(180deg);
    transition: transform 0.5s var(--ease-out), scale 0.2s var(--ease-spring), rotate 0.2s var(--ease-spring);
  }
  .card.up .flip {
    transform: rotateY(0deg);
  }
  .card.dragging .flip {
    scale: 1.05;
    rotate: -1.4deg;
  }

  .face,
  .back {
    position: absolute;
    inset: 0;
    border-radius: var(--r);
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    overflow: hidden;
    box-shadow:
      0 0 0 calc(var(--u) * 0.5) oklch(0 0 0 / 0.28),
      0 calc(var(--u) * 1) calc(var(--u) * 0.5) oklch(0 0 0 / 0.22),
      0 calc(var(--u) * 5) calc(var(--u) * 9) calc(var(--u) * -4) oklch(0 0 0 / 0.55);
  }
  .card.dragging .face {
    box-shadow:
      0 0 0 calc(var(--u) * 0.5) oklch(0 0 0 / 0.3),
      0 calc(var(--u) * 18) calc(var(--u) * 20) calc(var(--u) * -8) oklch(0 0 0 / 0.6);
  }

  /* ---------- Face ---------- */
  .face {
    background:
      radial-gradient(120% 90% at 20% 0%, oklch(1 0 0 / 0.7), transparent 60%),
      linear-gradient(165deg, var(--face-a), var(--face-b));
    color: var(--suit-ink);
  }
  .card.red .face {
    color: var(--suit-red);
  }
  .face::after {
    content: '';
    position: absolute;
    inset: calc(var(--u) * 3.2);
    border-radius: calc(var(--r) * 0.6);
    border: calc(var(--u) * 0.45) solid currentColor;
    opacity: 0.1;
    pointer-events: none;
  }

  .corner {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: calc(var(--u) * 0.5);
    width: calc(var(--u) * 20);
    line-height: 1;
  }
  .corner.tl {
    top: calc(var(--u) * 5);
    left: calc(var(--u) * 5);
  }
  .corner.br {
    bottom: calc(var(--u) * 5);
    right: calc(var(--u) * 5);
    transform: rotate(180deg);
  }
  .corner b {
    font-family: var(--font-display);
    font-weight: 640;
    font-size: calc(var(--u) * 24);
    letter-spacing: -0.04em;
    font-variation-settings: 'opsz' 48, 'SOFT' 30, 'WONK' 0;
    font-feature-settings: 'lnum';
  }
  .corner i {
    display: block;
    width: calc(var(--u) * 17);
    height: calc(var(--u) * 17);
  }

  .pip {
    position: absolute;
    left: 50%;
    top: 52%;
    width: calc(var(--u) * 44);
    height: calc(var(--u) * 44);
    translate: -50% -50%;
  }
  .pip.ace {
    width: calc(var(--u) * 58);
    height: calc(var(--u) * 58);
    filter: drop-shadow(0 calc(var(--u) * 1) 0 oklch(0 0 0 / 0.12));
  }
  .pip.court {
    width: calc(var(--u) * 38);
    height: calc(var(--u) * 38);
  }
  .pip.ace::before,
  .pip.court::before {
    content: '';
    position: absolute;
    inset: -28%;
    border-radius: 50%;
    border: calc(var(--u) * 0.9) solid var(--brass-deep);
    opacity: 0.55;
  }
  .pip.court::after {
    content: '';
    position: absolute;
    inset: -42%;
    border-radius: 50%;
    border: calc(var(--u) * 0.45) dashed var(--brass-deep);
    opacity: 0.4;
  }

  /* ---------- Back ---------- */
  .back {
    transform: rotateY(180deg);
    background: linear-gradient(150deg, var(--back-base), var(--back-edge));
  }
  .back::before {
    content: '';
    position: absolute;
    inset: calc(var(--u) * 5);
    border-radius: calc(var(--r) * 0.55);
    border: calc(var(--u) * 0.9) solid var(--brass-line);
    z-index: 2;
  }
  .art {
    position: absolute;
    inset: 0;
  }
  .emblem {
    position: absolute;
    left: 50%;
    top: 50%;
    width: calc(var(--u) * 30);
    height: calc(var(--u) * 30);
    translate: -50% -50%;
    color: var(--brass);
    opacity: var(--emblem);
    z-index: 1;
  }

  /* ---------- States ---------- */
  .card.hinted .face {
    animation: hint-glow 1.1s ease-in-out infinite;
  }
  .card.shaking {
    animation: shake 0.42s var(--ease-out);
  }

  /* A fresh deal: CSS keyframes fly each card from the stock, staggered by --d; face-up cards flip once they land. */
  :global(.board.dealing) .card {
    animation: deal-in 0.55s var(--ease-out) var(--d) backwards;
  }
  :global(.board.dealing) .card.up .flip {
    animation: flip-up 0.5s var(--ease-out) calc(var(--d) + 0.3s) backwards;
  }
  :global(.board.resizing) .card,
  :global(.board.resizing) .flip {
    transition: none;
  }

  @keyframes deal-in {
    from {
      transform: translate3d(var(--sx), var(--sy), 0) rotate(var(--rot));
      opacity: 0.5;
    }
    to {
      transform: translate3d(var(--x), var(--y), 0) rotate(0deg);
      opacity: 1;
    }
  }
  @keyframes flip-up {
    from { transform: rotateY(180deg); }
    to { transform: rotateY(0deg); }
  }
  @keyframes hint-glow {
    0%, 100% { box-shadow: 0 0 0 calc(var(--u) * 1.2) var(--brass), 0 0 calc(var(--u) * 6) var(--brass); }
    50% { box-shadow: 0 0 0 calc(var(--u) * 2.4) var(--brass-bright), 0 0 calc(var(--u) * 16) var(--brass); }
  }
  @keyframes shake {
    0%, 100% { translate: 0 0; }
    20% { translate: calc(var(--u) * -4) 0; }
    40% { translate: calc(var(--u) * 4) 0; }
    60% { translate: calc(var(--u) * -3) 0; }
    80% { translate: calc(var(--u) * 2) 0; }
  }
</style>
