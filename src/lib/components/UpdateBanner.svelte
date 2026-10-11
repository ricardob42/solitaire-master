<script lang="ts">
  import { ui } from '../state/ui.svelte';
  import { t } from '../i18n/index.svelte';
  import { applyUpdate } from '../pwa';
  import Icon from './Icon.svelte';
</script>

{#if ui.needRefresh}
  <div class="banner" role="alert">
    <Icon name="refresh" size={17} />
    <span>{t('upd.ready')}</span>
    <button class="btn primary" onclick={applyUpdate}>{t('upd.apply')}</button>
    <button class="btn icon dismiss" onclick={() => (ui.needRefresh = false)} aria-label={t('set.close')}>×</button>
  </div>
{/if}

<style>
  .banner {
    position: fixed;
    z-index: 70;
    top: max(12px, env(safe-area-inset-top));
    left: 50%;
    translate: -50% 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 10px 8px 16px;
    border-radius: 999px;
    background: var(--panel-raised);
    border: 1px solid var(--brass);
    box-shadow: 0 16px 32px -12px oklch(0 0 0 / 0.75);
    font-size: 0.9rem;
    max-width: calc(100vw - 20px);
    animation: rise 0.35s var(--ease-spring);
  }
  .banner .btn { min-height: 32px; padding: 0 14px; border-radius: 999px; }
  .dismiss { border: 0; background: none; width: 28px; min-height: 28px !important; font-size: 1.3rem; color: var(--ink-dim); }
</style>
