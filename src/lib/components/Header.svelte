<script lang="ts">
  import { game } from '../state/game.svelte';
  import { settings, LANG_NAMES } from '../state/settings.svelte';
  import { stats } from '../state/stats.svelte';
  import { ui } from '../state/ui.svelte';
  import { t } from '../i18n/index.svelte';
  import { fmtTime } from './format';
  import Icon from './Icon.svelte';
  import Suit from './Suit.svelte';
  const nextLang = $derived(settings.lang === 'es' ? 'en' : 'es');
</script>

<header class="top">
  <div class="brand">
    <span class="badge"><Suit suit={0} /></span>
    <span class="name">{game.rec.daily ? t('brand.daily') : t('brand.name')}</span>
    {#if game.rec.daily}
      <button class="chip" class:done={stats.dailyDone} onclick={() => ui.open('settings')}>
        {#if stats.dailyDone}<Icon name="check" size={12} />{/if}{t('chip.daily')}
      </button>
    {/if}
  </div>

  <div class="hud" role="group" aria-label={t('hud.score')}>
    <div class="read">
      <span class="l">{t('hud.score')}</span>
      {#key game.score}<span class="v bump">{game.score}</span>{/key}
    </div>
    <div class="read"><span class="l">{t('hud.moves')}</span><span class="v">{game.moves}</span></div>
    <div class="read"><span class="l">{t('hud.time')}</span><span class="v">{fmtTime(game.elapsed)}</span></div>
    <div class="read best"><span class="l">{t('hud.best')}</span><span class="v">{stats.highScore}</span></div>
  </div>

  <div class="tools">
    <button
      class="btn icon lang"
      onclick={() => settings.toggleLang()}
      title={t('btn.langToggle', { lang: LANG_NAMES[nextLang] })}
      aria-label={t('btn.langToggle', { lang: LANG_NAMES[nextLang] })}
    >{nextLang.toUpperCase()}</button>
    <button class="btn icon" onclick={() => ui.open('stats')} title={t('title.statsBtn')} aria-label={t('aria.statsBtn')}>
      <Icon name="stats" />
    </button>
    <button
      class="btn icon"
      onclick={() => settings.toggleMuted()}
      title={t('title.soundBtn')}
      aria-label={settings.muted ? t('aria.unmuteBtn') : t('aria.soundBtn')}
      aria-pressed={settings.muted}
    >
      <Icon name={settings.muted ? 'mute' : 'sound'} />
    </button>
    <button class="btn icon" onclick={() => ui.open('settings')} title={t('title.settingsBtn')} aria-label={t('aria.settingsBtn')} aria-haspopup="dialog">
      <Icon name="settings" />
    </button>
  </div>

  <div class="actions">
    <button class="btn" onclick={() => game.undo()} disabled={!game.canUndo} title={t('title.undoBtn')} aria-label={t('aria.undoBtn')}>
      <Icon name="undo" /><span class="lbl">{t('btn.undo')}</span>
    </button>
    <button class="btn" onclick={() => game.redo()} disabled={!game.canRedo} title={t('title.redoBtn')} aria-label={t('aria.redoBtn')}>
      <Icon name="redo" /><span class="lbl">{t('btn.redo')}</span>
    </button>
    <button class="btn dock-only" onclick={() => game.hint()} disabled={game.busy} class:stuck={game.stuck} aria-label={t('aria.fab')}>
      <Icon name="bulb" /><span class="lbl">{t('btn.hint')}</span>
    </button>
    <button class="btn" class:ready={game.canAuto} onclick={() => game.autoFinish()} disabled={!game.canAuto} title={t('title.autoBtn')} aria-label={t('aria.autoBtn')}>
      <Icon name="bolt" size={16} /><span class="lbl">{t('btn.auto')}</span>
    </button>
    <button class="btn primary" onclick={() => game.newGame()} title={t('title.newBtn')} aria-label={t('aria.newBtn')}>
      <Icon name="plus" /><span class="lbl">{t('btn.new')}</span>
    </button>
  </div>
</header>

<style>
  .top {
    position: relative;
    z-index: 30;
    display: grid;
    grid-template-columns: minmax(0, auto) 1fr auto;
    grid-template-areas: 'brand hud controls';
    align-items: center;
    gap: 10px clamp(12px, 2.4vw, 32px);
    padding: max(10px, env(safe-area-inset-top)) clamp(12px, 2vw, 28px) 10px;
  }
  .brand {
    grid-area: brand;
    display: flex;
    align-items: center;
    gap: 11px;
    min-width: 0;
  }
  .badge {
    flex: none;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    padding: 8px;
    border-radius: 11px;
    color: var(--ink);
    background: linear-gradient(150deg, var(--felt-hi), var(--felt-lo));
    border: 1px solid var(--brass-line);
    box-shadow: 0 0 0 3px oklch(0 0 0 / 0.18), 0 6px 14px -6px oklch(0 0 0 / 0.6);
  }
  .name {
    font-family: var(--font-display);
    font-weight: 620;
    font-size: 1.32rem;
    letter-spacing: -0.015em;
    font-variation-settings: 'opsz' 96, 'SOFT' 100, 'WONK' 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--ink);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 999px;
    border: 1px solid var(--brass-line);
    background: oklch(0.82 0.125 85 / 0.12);
    color: var(--brass);
    font: 700 10.5px/1.4 var(--font-ui);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .chip.done {
    background: var(--brass);
    color: oklch(0.2 0.04 80);
  }

  /* HUD: typographic read-outs separated by hairlines instead of boxed chips */
  .hud {
    grid-area: hud;
    display: flex;
    justify-content: center;
    min-width: 0;
  }
  .read {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    padding: 0 clamp(10px, 1.9vw, 26px);
  }
  .read + .read::before {
    content: '';
    position: absolute;
    left: 0;
    top: 12%;
    bottom: 12%;
    width: 1px;
    background: var(--line);
  }
  .l {
    font: 600 9.5px/1 var(--font-ui);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }
  .v {
    font: 600 clamp(18px, 2.1vw, 23px) / 1.05 var(--font-mono);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .best .v {
    color: var(--brass);
  }
  .v.bump {
    animation: bump 0.42s var(--ease-spring);
  }
  @keyframes bump {
    0% { transform: scale(1); }
    35% { transform: scale(1.22); color: var(--brass-bright); }
    100% { transform: scale(1); }
  }

  .btn.lang {
    font: 700 12px/1 var(--font-ui);
    letter-spacing: 0.06em;
  }

  .tools,
  .actions {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .tools {
    grid-area: controls;
    justify-self: end;
  }
  /* On wide screens tools and actions share the right-hand cell */
  .actions {
    grid-area: controls;
    justify-self: end;
    margin-right: 0;
  }
  .top {
    grid-template-columns: minmax(0, auto) 1fr auto auto;
    grid-template-areas: 'brand hud tools actions';
  }
  .tools { grid-area: tools; }
  .actions { grid-area: actions; }

  .dock-only {
    display: none;
  }
  .btn.ready {
    border-color: var(--brass);
    color: var(--brass-bright);
    animation: ready-pulse 1.6s ease-in-out infinite;
  }
  .btn.stuck {
    border-color: oklch(0.72 0.15 25);
    color: oklch(0.82 0.12 25);
  }
  @keyframes ready-pulse {
    0%, 100% { box-shadow: 0 0 0 0 oklch(0.82 0.125 85 / 0.55); }
    50% { box-shadow: 0 0 0 7px oklch(0.82 0.125 85 / 0); }
  }

  @media (max-width: 1360px) {
    .lbl { display: none; }
    .actions .btn { width: 38px; padding: 0; }
  }
  @media (max-width: 900px) {
    .name { display: none; }
  }

  /* Phones in portrait: brand + tools on top, HUD below, actions become a bottom dock */
  @media (max-width: 760px) and (min-height: 500px) {
    .top {
      grid-template-columns: 1fr auto;
      grid-template-areas: 'brand tools' 'hud hud';
      padding-bottom: 6px;
    }
    .name { display: block; font-size: 1.15rem; }
    .hud { justify-content: space-between; }
    .read { flex: 1; padding: 0 4px; }
    .actions {
      position: fixed;
      z-index: 40;
      left: 0;
      right: 0;
      bottom: 0;
      justify-self: stretch;
      justify-content: space-around;
      gap: 4px;
      padding: 8px 10px max(8px, env(safe-area-inset-bottom));
      background: linear-gradient(180deg, oklch(0 0 0 / 0), var(--felt-deep) 40%);
      border-top: 1px solid var(--line);
      backdrop-filter: blur(10px);
    }
    .actions .btn {
      flex: 1;
      flex-direction: column;
      gap: 3px;
      width: auto;
      max-width: 76px;
      min-height: 50px;
      padding: 6px 2px;
      border-color: transparent;
      background: none;
    }
    .actions .btn.primary {
      background: linear-gradient(180deg, var(--brass-bright), var(--brass-deep));
    }
    .lbl { display: block; font-size: 10.5px; font-weight: 600; letter-spacing: 0.02em; }
    .dock-only { display: inline-flex; }
  }

  /* Short landscape screens: everything on one slim row */
  @media (max-height: 499px) {
    .top { padding-top: max(4px, env(safe-area-inset-top)); padding-bottom: 4px; gap: 6px 14px; }
    .badge { width: 30px; height: 30px; padding: 6px; }
    .name { display: none; }
    .btn, .btn.icon { min-height: 32px; }
    .v { font-size: 17px; }
    .dock-only { display: inline-flex; }
  }
</style>
