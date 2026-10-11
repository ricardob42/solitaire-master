<script lang="ts">
  import { onMount } from 'svelte';
  import { game } from './lib/state/game.svelte';
  import { settings, THEME_COLOR } from './lib/state/settings.svelte';
  import { ui } from './lib/state/ui.svelte';
  import { t } from './lib/i18n/index.svelte';
  import { setupPwa } from './lib/pwa';
  import { keepAwake } from './lib/wakelock';
  import { sfx } from './lib/audio';
  import Header from './lib/components/Header.svelte';
  import Board from './lib/components/Board.svelte';
  import HintDock from './lib/components/HintDock.svelte';
  import Toast from './lib/components/Toast.svelte';
  import Cascade from './lib/components/Cascade.svelte';
  import UpdateBanner from './lib/components/UpdateBanner.svelte';
  import VictoryModal from './lib/components/VictoryModal.svelte';
  import StatsModal from './lib/components/StatsModal.svelte';
  import SettingsModal from './lib/components/SettingsModal.svelte';
  import ImportModal from './lib/components/ImportModal.svelte';

  onMount(() => {
    game.init();
    setupPwa();
    // The first pointer or key press unlocks audio for the rest of the session.
    for (const type of ['pointerdown', 'keydown'] as const) {
      window.addEventListener(type, () => sfx.unlock(), { once: true, capture: true });
    }
  });

  // Theme, language and browser chrome colour follow the settings.
  $effect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.lang = settings.lang;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[settings.theme]);
  });

  $effect(() => {
    void keepAwake(settings.awake && !game.finished);
  });

  function onVisibility() {
    if (document.visibilityState === 'hidden') {
      game.pause();
    } else {
      game.resume();
      void keepAwake(settings.awake && !game.finished);
    }
  }

  function onKey(e: KeyboardEvent) {
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (mod && key === 'z') {
      e.preventDefault();
      if (e.shiftKey) game.redo();
      else game.undo();
    } else if (mod && key === 'y') {
      e.preventDefault();
      game.redo();
    } else if (!mod && key === 'h' && !ui.modal && !ui.cascade) {
      game.hint();
    }
  }
</script>

<svelte:document onvisibilitychange={onVisibility} />
<svelte:window onkeydown={onKey} onpagehide={() => game.pause()} />

<div class="felt" aria-hidden="true"></div>

<div class="app">
  <Header />
  <div class="progress" aria-hidden="true"><i style:transform="scaleX({game.progress})"></i></div>
  <Board />
</div>

<HintDock />
<Toast />
<UpdateBanner />
<Cascade />
<VictoryModal />
<StatsModal />
<SettingsModal />
<ImportModal />

<p class="sr-only">{t('sr.help')}</p>

<style>
  .felt {
    position: fixed;
    inset: 0;
    z-index: 0;
    background: radial-gradient(130% 85% at 50% 0%, var(--felt-hi) 0%, var(--felt-mid) 42%, var(--felt-lo) 74%, var(--felt-deep) 100%);
    transition: background 0.5s;
  }
  .felt::before {
    content: '';
    position: absolute;
    inset: 0;
    opacity: 0.55;
    mix-blend-mode: soft-light;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  .felt::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(120% 100% at 50% 40%, transparent 55%, oklch(0 0 0 / 0.5));
  }

  .app {
    position: relative;
    z-index: 1;
    height: 100dvh;
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
  }
  .progress {
    height: 2px;
    background: oklch(1 0 0 / 0.07);
    box-shadow: 0 1px 0 var(--brass-line);
  }
  .progress i {
    display: block;
    height: 100%;
    transform-origin: left;
    background: linear-gradient(90deg, var(--brass-deep), var(--brass-bright));
    transition: transform 0.6s var(--ease-out);
  }

  /* Room for the bottom action dock on phones in portrait */
  @media (max-width: 760px) and (min-height: 500px) {
    .app {
      padding-bottom: calc(66px + env(safe-area-inset-bottom));
      height: 100dvh;
    }
  }
</style>
