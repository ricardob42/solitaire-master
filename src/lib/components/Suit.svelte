<script lang="ts">
  /** Suit glyph drawn as SVG so it renders identically on every platform. 0 spades, 1 hearts, 2 diamonds, 3 clubs. */
  let { suit }: { suit: number } = $props();
</script>

<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
  {#if suit === 0}
    <path d="M12 2.2c-1.6 3.2-8.6 6.6-8.6 12 0 2.8 2.1 4.8 4.7 4.8 1.4 0 2.6-.6 3.4-1.7-.1 1.9-.8 3.3-2.1 4.4h5.2c-1.3-1.1-2-2.5-2.1-4.4.8 1.1 2 1.7 3.4 1.7 2.6 0 4.7-2 4.7-4.8 0-5.4-7-8.8-8.6-12z" />
  {:else if suit === 1}
    <path d="M12 21.4C5.2 16.6 2.6 13 2.6 9c0-3 2.2-5.2 4.9-5.2 1.7 0 3.4.9 4.5 2.6 1.1-1.7 2.8-2.6 4.5-2.6 2.7 0 4.9 2.2 4.9 5.2 0 4-2.6 7.6-9.4 12.4z" />
  {:else if suit === 2}
    <path d="M12 1.8c1.2 3 6.4 7.6 9.4 10.2-3 2.6-8.2 7.2-9.4 10.2-1.2-3-6.4-7.6-9.4-10.2C5.6 9.4 10.8 4.8 12 1.8z" />
  {:else}
    <circle cx="12" cy="7" r="4.6" />
    <circle cx="6.6" cy="14" r="4.6" />
    <circle cx="17.4" cy="14" r="4.6" />
    <circle cx="12" cy="12.4" r="3.4" />
    <path d="M10.3 12.5h3.4c-.1 3.6.7 6.4 2.4 9.2H7.9c1.7-2.8 2.5-5.6 2.4-9.2z" />
  {/if}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
