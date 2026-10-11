<script lang="ts">
  import { t, type Key } from '../i18n/index.svelte';
  let { n }: { n: number } = $props();
</script>

<span class="stars" role="img" aria-label={`${t('set.diff')}: ${n}/5 · ${t(`diff.${n}` as Key)}`}>
  <span class="on">{'★'.repeat(n)}</span><span class="off">{'★'.repeat(5 - n)}</span>
</span>

<style>
  .stars {
    letter-spacing: 0.08em;
    font-size: 0.95em;
  }
  .on { color: var(--brass); }
  .off { color: oklch(1 0 0 / 0.16); }
</style>
