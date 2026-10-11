<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    onclose: () => void;
    label: string;
    children: Snippet;
  }
  let { open, onclose, label, children }: Props = $props();
  let dialog: HTMLDialogElement;

  // Native <dialog>: focus trap, Escape and the backdrop come from the platform.
  $effect(() => {
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });
</script>

<dialog
  bind:this={dialog}
  aria-label={label}
  onclose={onclose}
  onclick={(e) => e.target === dialog && onclose()}
>
  {#if open}
    <div class="card">{@render children()}</div>
  {/if}
</dialog>

<style>
  dialog {
    padding: 0;
    border: 0;
    background: none;
    color: var(--ink);
    max-width: min(460px, calc(100vw - 20px));
    width: 100%;
    max-height: calc(100dvh - 24px);
    overflow: visible;
  }
  dialog::backdrop {
    background: oklch(0.1 0.02 var(--hue) / 0.62);
    backdrop-filter: blur(5px);
    animation: fade 0.25s ease-out;
  }
  dialog[open] {
    animation: sheet-in 0.38s var(--ease-spring);
  }
  .card {
    position: relative;
    max-height: calc(100dvh - 24px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 30px 26px 24px;
    border-radius: 24px;
    background:
      radial-gradient(120% 60% at 50% -10%, oklch(0.82 0.125 85 / 0.1), transparent 60%),
      linear-gradient(180deg, var(--panel-raised), var(--panel));
    border: 1px solid var(--brass-line);
    box-shadow: 0 40px 80px -30px oklch(0 0 0 / 0.8), 0 0 0 1px oklch(0 0 0 / 0.3);
    scrollbar-width: thin;
    scrollbar-color: var(--brass-line) transparent;
  }
  @keyframes fade {
    from { opacity: 0; }
  }
  @keyframes sheet-in {
    from { opacity: 0; transform: translateY(18px) scale(0.96); }
  }
</style>
