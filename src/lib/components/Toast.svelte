<script lang="ts">
  import { ui } from '../state/ui.svelte';
</script>

<div class="slot" role="status" aria-live="polite">
  {#if ui.toastMsg}
    {#key ui.toastMsg.id}<div class="toast">{ui.toastMsg.text}</div>{/key}
  {/if}
</div>

<style>
  .slot {
    position: fixed;
    z-index: 80;
    left: 50%;
    bottom: max(26px, env(safe-area-inset-bottom));
    translate: -50% 0;
    width: max-content;
    max-width: calc(100vw - 28px);
    pointer-events: none;
  }
  .toast {
    padding: 11px 20px;
    border-radius: 999px;
    background: var(--panel-raised);
    border: 1px solid var(--brass-line);
    color: var(--ink);
    font-size: 0.92rem;
    font-weight: 500;
    text-align: center;
    box-shadow: 0 16px 32px -12px oklch(0 0 0 / 0.75);
    animation: rise 0.28s var(--ease-spring);
  }
  @media (max-width: 760px) and (min-height: 500px) {
    .slot { bottom: calc(max(8px, env(safe-area-inset-bottom)) + 84px); }
  }
</style>
