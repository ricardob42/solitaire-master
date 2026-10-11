<script lang="ts">
  import { game } from '../state/game.svelte';
  import { stats } from '../state/stats.svelte';
  import { ui } from '../state/ui.svelte';
  import { t, type Key } from '../i18n/index.svelte';
  import { share } from '../share';
  import { fmtTime } from './format';
  import Modal from './Modal.svelte';
  import Icon from './Icon.svelte';
  import Stars from './Stars.svelte';

  const v = $derived(ui.victory);

  // Celebration pieces are plain elements animated by CSS; the random look is generated once per win.
  const palette = ['var(--brass-bright)', '#fff', 'oklch(0.78 0.13 160)', 'var(--brass)', 'oklch(0.9 0.04 120)'];
  const bits = $derived(
    v
      ? Array.from({ length: 30 }, (_, i) => ({
          left: 4 + Math.random() * 92,
          size: 6 + Math.random() * 6,
          dur: 1.7 + Math.random() * 1.7,
          delay: Math.random() * 0.5,
          rot: Math.floor(Math.random() * 360),
          color: palette[i % palette.length],
          round: i % 5 === 3
        }))
      : []
  );

  async function shareResult() {
    if (!v) return;
    const text = t('vic.shareText', { n: v.score, m: v.moves, t: fmtTime(v.time) });
    const r = await share({ title: t('brand.name'), text, url: location.origin + location.pathname }, true);
    if (r === 'shared' || r === 'copied') ui.toast(t('toast.shared'));
    else if (r === 'failed') ui.toast(t('toast.shareErr'));
  }

</script>

<Modal open={ui.modal === 'victory'} onclose={() => ui.close()} label={t('vic.title')}>
  {#if v}
    <div class="confetti" aria-hidden="true">
      {#each bits as b}
        <i
          class:round={b.round}
          style:left="{b.left}%"
          style:width="{b.size}px"
          style:height="{b.round ? b.size : b.size * 1.7}px"
          style:background={b.color}
          style:animation-duration="{b.dur}s"
          style:animation-delay="{b.delay}s"
          style:--rot="{b.rot}deg"
        ></i>
      {/each}
    </div>
    <h2 class="sheet-title">{t('vic.title')}</h2>
    <p class="sheet-sub">{t('vic.sub')}</p>

    <div class="grid">
      <div><span class="l">{t('vic.score')}</span><span class="n">{v.score}</span></div>
      <div><span class="l">{t('vic.moves')}</span><span class="n">{v.moves}</span></div>
      <div><span class="l">{t('vic.time')}</span><span class="n">{fmtTime(v.time)}</span></div>
    </div>

    <p class="best">{v.newBest ? t('vic.newBest') : t('vic.highScore', { n: stats.highScore })}</p>
    {#if v.difficulty > 0}
      <p class="meta">{t('set.diff')}: <Stars n={v.difficulty} /> {t(`diff.${v.difficulty}` as Key)}</p>
    {/if}
    <p class="meta">{t('vic.totalWins', { n: stats.wins })}</p>

    <div class="sheet-actions">
      <button class="btn primary" onclick={() => game.newGame()}>{t('vic.new')}</button>
      <button class="btn" onclick={shareResult}><Icon name="share" size={16} />{t('vic.share')}</button>
      <button class="btn" onclick={() => ui.close()}>{t('set.close')}</button>
    </div>
  {/if}
</Modal>

<style>
  .confetti {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    pointer-events: none;
  }
  .confetti i {
    position: absolute;
    top: -16px;
    border-radius: 2px;
    animation: fall linear infinite;
  }
  .confetti i.round {
    border-radius: 50%;
  }
  @keyframes fall {
    from { transform: translateY(0) rotate(var(--rot)); opacity: 1; }
    to { transform: translateY(520px) rotate(calc(var(--rot) + 540deg)); opacity: 0; }
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
  .grid > div {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    padding: 14px 6px;
    border-radius: 15px;
    border: 1px solid var(--line);
    background: oklch(0 0 0 / 0.18);
  }
  .l {
    font: 600 9.5px/1 var(--font-ui);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }
  .n {
    font: 600 1.55rem/1 var(--font-mono);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.03em;
  }
  .best {
    margin: 18px 0 4px;
    text-align: center;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.15rem;
    color: var(--brass-bright);
    font-variation-settings: 'opsz' 48, 'SOFT' 100;
  }
  .meta {
    margin: 4px 0 0;
    text-align: center;
    color: var(--ink-dim);
    font-size: 0.9rem;
  }
</style>
