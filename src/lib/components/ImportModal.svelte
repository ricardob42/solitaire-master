<script lang="ts">
  import { game } from '../state/game.svelte';
  import { ui } from '../state/ui.svelte';
  import { t } from '../i18n/index.svelte';
  import Modal from './Modal.svelte';
  import Suit from './Suit.svelte';

  function load() {
    const rec = ui.pendingImport;
    ui.pendingImport = null;
    ui.close();
    if (rec) game.loadShared(rec);
  }
  function dismiss() {
    ui.pendingImport = null;
    ui.close();
  }
</script>

<Modal open={ui.modal === 'import'} onclose={dismiss} label={t('imp.title')}>
  <span class="sheet-emblem"><Suit suit={0} /></span>
  <h2 class="sheet-title">{t('imp.title')}</h2>
  <p class="sheet-sub">{t('imp.desc')}</p>
  <div class="sheet-actions">
    <button class="btn primary" onclick={load}>{t('imp.load')}</button>
    <button class="btn" onclick={dismiss}>{t('imp.cancel')}</button>
  </div>
</Modal>
