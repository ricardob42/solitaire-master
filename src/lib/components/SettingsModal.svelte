<script lang="ts">
  import { game } from '../state/game.svelte';
  import { settings, THEMES, BACKS, LANGS, LANG_NAMES } from '../state/settings.svelte';
  import { stats } from '../state/stats.svelte';
  import { ui } from '../state/ui.svelte';
  import { t, LOCALES, type Key } from '../i18n/index.svelte';
  import { dailyDeck, rateDifficulty } from '../engine/deal';
  import { sfx } from '../audio';
  import { share, isTouch } from '../share';
  import { install } from '../pwa';
  import Modal from './Modal.svelte';
  import Icon from './Icon.svelte';
  import Stars from './Stars.svelte';
  import Suit from './Suit.svelte';

  const dailyStars = rateDifficulty(dailyDeck());
  const fsSupported = !!document.documentElement.requestFullscreen && document.fullscreenEnabled;
  let fullscreen = $state(!!document.fullscreenElement);

  const dailyStatus = $derived(
    stats.dailyDone
      ? t('set.doneScore', { n: stats.daily?.score ?? 0 })
      : game.rec.daily
        ? t('set.inProgress')
        : t('set.notStarted')
  );
  const dateText = $derived(
    new Date().toLocaleDateString(LOCALES[settings.lang], { weekday: 'long', month: 'long', day: 'numeric' })
  );

  const pick = <T,>(apply: (v: T) => void, v: T) => {
    apply(v);
    sfx.place();
  };

  function playDaily() {
    ui.close();
    game.newGame(true);
  }

  async function shareGame() {
    const r = await share({ title: t('brand.name'), url: game.shareLink() }, isTouch());
    if (r === 'copied') ui.toast(t('toast.shareCopied'));
    else if (r === 'shared') ui.toast(t('toast.shared'));
    else if (r === 'failed') ui.toast(t('toast.shareErr'));
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      ui.toast(t('toast.fsErr'));
    }
  }
</script>

<svelte:document onfullscreenchange={() => (fullscreen = !!document.fullscreenElement)} />

<Modal open={ui.modal === 'settings'} onclose={() => ui.close()} label={t('set.title')}>
  <span class="sheet-emblem"><Suit suit={0} /></span>
  <h2 class="sheet-title">{t('set.title')}</h2>
  <p class="sheet-sub">{t('set.sub')}</p>

  <section>
    <h3 class="sheet-h">{t('set.daily')}</h3>
    <div class="panel daily">
      <div class="info">
        <span class="date">{dateText}</span>
        <span class="status" class:done={stats.dailyDone}>{dailyStatus}</span>
        <Stars n={dailyStars} />
      </div>
      {#if stats.streak.current > 0}
        <span class="streak" title={t('aria.streak', { n: stats.streak.current })}><Icon name="flame" size={14} />{stats.streak.current}</span>
      {/if}
      <button class="btn primary" disabled={stats.dailyDone} onclick={playDaily}>
        {stats.dailyDone ? t('set.completed') : t('set.play')}
      </button>
    </div>
  </section>

  <section class="sheet-section">
    <h3 class="sheet-h">{t('set.drawMode')}</h3>
    <div class="choice-row" role="group" aria-label={t('aria.chooseDraw')}>
      <button class="choice" aria-pressed={settings.draw === 1} onclick={() => { pick((v) => settings.setDraw(v), 1 as const); ui.toast(t('toast.draw1')); }}>
        {t('set.draw1')}<small>{t('set.draw1Sub')}</small>
      </button>
      <button class="choice" aria-pressed={settings.draw === 3} onclick={() => { pick((v) => settings.setDraw(v), 3 as const); ui.toast(t('toast.draw3')); }}>
        {t('set.draw3')}<small>{t('set.draw3Sub')}</small>
      </button>
    </div>
    <p class="note">{t('set.drawNote')}</p>
  </section>

  <section class="sheet-section">
    <h3 class="sheet-h">{t('set.felt')}</h3>
    <div class="choice-row cols-5" role="group" aria-label={t('aria.chooseFelt')}>
      {#each THEMES as theme}
        <button class="choice" aria-pressed={settings.theme === theme} onclick={() => pick((v) => settings.setTheme(v), theme)}>
          <span class="felt-swatch" data-theme={theme}></span>
          {t(`theme.${theme}` as Key)}
        </button>
      {/each}
    </div>
  </section>

  <section class="sheet-section">
    <h3 class="sheet-h">{t('set.cardBack')}</h3>
    <div class="choice-row cols-5" role="group" aria-label={t('aria.chooseBack')}>
      {#each BACKS as back}
        <button class="choice" aria-pressed={settings.back === back} onclick={() => pick((v) => settings.setBack(v), back)}>
          <span class="back-swatch"><span class="art" data-pattern={back}></span></span>
          {t(`back.${back}` as Key)}
        </button>
      {/each}
    </div>
  </section>

  <section class="sheet-section">
    <h3 class="sheet-h">{t('set.sound')}</h3>
    <div class="panel row">
      <Icon name={settings.muted || settings.volume === 0 ? 'mute' : 'sound'} />
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        value={settings.volume}
        style:--pct="{settings.volume}%"
        aria-label={t('aria.volume')}
        oninput={(e) => settings.setVolume(+e.currentTarget.value)}
        onchange={() => !settings.muted && settings.volume > 0 && sfx.place()}
      />
      <span class="vol">{settings.volume}%</span>
    </div>
  </section>

  <section class="sheet-section">
    <div class="panel row">
      <div>
        <h3 class="sheet-h tight">{t('set.awake')}</h3>
        <p>{t('set.awakeDesc')}</p>
      </div>
      <button class="switch" role="switch" aria-checked={settings.awake} aria-label={t('set.awake')} onclick={() => settings.setAwake(!settings.awake)}></button>
    </div>
  </section>

  {#if fsSupported}
    <section class="sheet-section">
      <h3 class="sheet-h">{t('set.fullscreen')}</h3>
      <div class="panel row">
        <p>{t('set.fullscreenDesc')}</p>
        <button class="btn primary" onclick={toggleFullscreen} aria-pressed={fullscreen}>
          <Icon name="expand" size={16} />{fullscreen ? t('set.fsExit') : t('set.fsEnter')}
        </button>
      </div>
    </section>
  {/if}

  <section class="sheet-section">
    <h3 class="sheet-h">{t('set.language')}</h3>
    <div class="choice-row cols-3" role="group" aria-label={t('aria.chooseLang')}>
      {#each LANGS as l}
        <button class="choice" aria-pressed={settings.lang === l} onclick={() => pick((v) => settings.setLang(v), l)}>{LANG_NAMES[l]}</button>
      {/each}
    </div>
  </section>

  <section class="sheet-section">
    <h3 class="sheet-h">{t('set.share')}</h3>
    <div class="panel row">
      <p>{t('set.shareDesc')}</p>
      <button class="btn primary" onclick={shareGame}><Icon name="link" size={16} />{t('set.shareBtn')}</button>
    </div>
  </section>

  {#if ui.installable}
    <section class="sheet-section">
      <h3 class="sheet-h">{t('set.install')}</h3>
      <div class="panel row">
        <p>{t('set.installDesc')}</p>
        <button class="btn primary" onclick={install}><Icon name="download" size={16} />{t('set.installBtn')}</button>
      </div>
    </section>
  {/if}

  <p class="version">Solitaire Master <b>v{__APP_VERSION__}</b></p>
  <div class="sheet-actions tight"><button class="btn primary" onclick={() => ui.close()}>{t('set.close')}</button></div>
</Modal>

<style>
  .daily {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .date {
    font-family: var(--font-display);
    font-weight: 560;
    font-size: 1.02rem;
    text-transform: capitalize;
    font-variation-settings: 'opsz' 36, 'SOFT' 100;
  }
  .status {
    font-size: 0.85rem;
    color: var(--ink-dim);
  }
  .status.done {
    color: var(--brass);
  }
  .streak {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--brass-line);
    background: oklch(0.82 0.125 85 / 0.12);
    color: var(--brass-bright);
    font: 700 13px/1 var(--font-mono);
  }
  .note {
    margin: 10px 2px 0;
    color: var(--ink-faint);
    font-size: 0.82rem;
    line-height: 1.4;
  }

  .felt-swatch {
    display: block;
    width: 100%;
    height: 34px;
    border-radius: 9px;
    border: 1px solid oklch(1 0 0 / 0.14);
    background: radial-gradient(
      120% 140% at 30% 15%,
      oklch(0.46 var(--chroma) var(--hue)),
      oklch(0.31 calc(var(--chroma) * 0.9) var(--hue)) 55%,
      oklch(0.135 calc(var(--chroma) * 0.6) var(--hue))
    );
  }
  .back-swatch {
    position: relative;
    display: block;
    width: 38px;
    height: 54px;
    border-radius: 6px;
    overflow: hidden;
    --u: 0.38px;
    background: linear-gradient(150deg, var(--back-base), var(--back-edge));
    border: 1px solid oklch(1 0 0 / 0.16);
  }
  .back-swatch::before {
    content: '';
    position: absolute;
    inset: 3px;
    border: 1px solid var(--brass-line);
    border-radius: 3px;
    z-index: 1;
  }
  .back-swatch .art {
    position: absolute;
    inset: 0;
  }

  .row > :global(svg) {
    flex: none;
    color: var(--ink-dim);
  }
  .sheet-h.tight {
    margin-bottom: 5px;
  }
  .vol {
    min-width: 3em;
    text-align: right;
    font: 500 13px/1 var(--font-mono);
    color: var(--ink-dim);
  }
  input[type='range'] {
    flex: 1;
    height: 22px;
    appearance: none;
    background: transparent;
    cursor: pointer;
  }
  input[type='range']::-webkit-slider-runnable-track {
    height: 5px;
    border-radius: 99px;
    background: linear-gradient(90deg, var(--brass) var(--pct), oklch(1 0 0 / 0.12) var(--pct));
  }
  input[type='range']::-moz-range-track {
    height: 5px;
    border-radius: 99px;
    background: linear-gradient(90deg, var(--brass) var(--pct), oklch(1 0 0 / 0.12) var(--pct));
  }
  input[type='range']::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    margin-top: -7.5px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, var(--brass-bright), var(--brass-deep));
    border: 0;
    box-shadow: 0 2px 8px oklch(0 0 0 / 0.5);
  }
  input[type='range']::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, var(--brass-bright), var(--brass-deep));
    border: 0;
  }

  .switch {
    position: relative;
    flex: none;
    width: 46px;
    height: 27px;
    border-radius: 99px;
    border: 1px solid var(--line);
    background: oklch(1 0 0 / 0.1);
    transition: background 0.2s;
  }
  .switch::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 21px;
    height: 21px;
    border-radius: 50%;
    background: var(--ink-dim);
    transition: transform 0.25s var(--ease-spring), background 0.2s;
  }
  .switch[aria-checked='true'] {
    background: oklch(0.82 0.125 85 / 0.35);
    border-color: var(--brass);
  }
  .switch[aria-checked='true']::after {
    transform: translateX(19px);
    background: var(--brass-bright);
  }

  .version {
    margin: 22px 0 0;
    text-align: center;
    font: 500 12px/1 var(--font-mono);
    color: var(--ink-faint);
  }
  .version b { color: var(--brass); font-weight: 600; }
  .sheet-actions.tight { margin-top: 14px; }
</style>
