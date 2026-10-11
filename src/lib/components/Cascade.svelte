<script lang="ts">
  import { ui } from '../state/ui.svelte';
  import { RANKS } from '../engine/cards';

  let canvas: HTMLCanvasElement;

  const finish = () => {
    ui.cascade = false;
    ui.open('victory');
  };

  /** The classic victory: cards launch from the foundations and bounce off the floor, leaving trails. */
  function run(cv: HTMLCanvasElement, done: () => void): () => void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    cv.width = Math.floor(W * dpr);
    cv.height = Math.floor(H * dpr);
    cv.style.width = W + 'px';
    cv.style.height = H + 'px';
    const g = cv.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    const slots = [0, 1, 2, 3].map((i) => document.querySelector<HTMLElement>(`[data-slot="f${i}"]`)!.getBoundingClientRect());
    const cw = slots[0].width;
    const ch = slots[0].height;
    const glyphs = ['♠', '♥', '♦', '♣'];
    const font = getComputedStyle(document.documentElement).getPropertyValue('--font-display');

    interface Flyer { x: number; y: number; vx: number; vy: number; suit: number; rank: string }
    const flyers: (Flyer | null)[] = [];
    let launched = 0;
    let raf = 0;
    let last = 0;

    const launch = () => {
      if (launched >= 52) return;
      const o = slots[launched % 4];
      flyers.push({
        x: o.left,
        y: o.top,
        vx: (Math.random() < 0.5 ? -1 : 1) * (2.1 + Math.random() * 2.7),
        vy: -Math.random() * 2.5,
        suit: launched % 4,
        rank: RANKS[(launched + 1) % 13]
      });
      launched++;
    };

    const draw = (f: Flyer) => {
      const r = Math.max(3, cw * 0.09);
      g.save();
      g.beginPath();
      g.roundRect(f.x, f.y, cw, ch, r);
      g.fillStyle = '#fbf6e8';
      g.shadowColor = 'rgba(0,0,0,.35)';
      g.shadowBlur = 8;
      g.shadowOffsetY = 3;
      g.fill();
      g.shadowColor = 'transparent';
      g.strokeStyle = 'rgba(30,40,35,.4)';
      g.stroke();
      g.fillStyle = f.suit === 1 || f.suit === 2 ? '#c4352b' : '#1c2030';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `700 ${Math.round(ch * 0.3)}px system-ui, sans-serif`;
      g.fillText(glyphs[f.suit], f.x + cw / 2, f.y + ch * 0.56);
      g.textAlign = 'left';
      g.font = `700 ${Math.round(ch * 0.17)}px ${font}`;
      g.fillText(f.rank, f.x + cw * 0.09, f.y + ch * 0.15);
      g.restore();
    };

    const step = (ts: number) => {
      if (!last) last = ts;
      const dt = Math.min(2.4, (ts - last) / 16.666);
      last = ts;
      let alive = false;
      flyers.forEach((f, i) => {
        if (!f) return;
        f.vy += 0.46 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.y + ch > H) {
          f.y = H - ch;
          f.vy = -Math.abs(f.vy) * 0.78;
          if (Math.abs(f.vy) < 2.1) f.vy = -2.1 - Math.random() * 1.2; // keep bouncing
        }
        if (f.x < -cw - 8 || f.x > W + 8) {
          flyers[i] = null;
          return;
        }
        alive = true;
        draw(f);
      });
      if (launched >= 52 && !alive) return done();
      raf = requestAnimationFrame(step);
    };

    const launcher = setInterval(launch, 115);
    const cap = setTimeout(done, 6000); // the dialog always arrives
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(launcher);
      clearTimeout(cap);
      g.clearRect(0, 0, W, H);
    };
  }

  $effect(() => {
    if (!ui.cascade) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    return run(canvas, finish);
  });
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && ui.cascade && finish()} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<canvas bind:this={canvas} class:active={ui.cascade} onclick={finish} aria-hidden="true"></canvas>

<style>
  canvas {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: none;
  }
  canvas.active {
    display: block;
    cursor: pointer;
  }
</style>
