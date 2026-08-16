/* ============================================================================
   flight-engine.ts — scroll → flight time.

   A direct adaptation of the lets-scroll reference scrub engine. The scroll
   mechanics are kept faithfully: an interleaved dive/connector segment chain
   measured in viewport-heights, per-section `scroll` and `linger` pacing, copy
   that peaks mid-scene, reduced-motion fallback and the phone hardening (no jump
   on URL-bar resize, coarser stepping).

   What changed from the reference: there are no video elements to seek. Scroll
   resolves to one continuous flight time T and the renderer draws the camera at
   T, which removes the blob loader, the seek coalescer, the iOS priming and the
   seam crossfade — all of which exist to paper over pre-rendered clips.

   Deliberately framework-agnostic. React owns the markup and passes the nodes
   in; this owns the maths and writes to those nodes directly, because a 60 fps
   render loop must never route through component state.
   ========================================================================== */

import { createWorld, type World, type WorldFonts } from './world/renderer';
import type { SceneContext } from './world/scenes';

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const smooth = (x: number) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

/** Monotone dwell remap: the camera settles mid-scene, exactly where the copy
 *  peaks, and moves quicker near the seams. f(0)=0 and f(1)=1 always, so the
 *  segment boundaries are untouched. */
const lingerEase = (x: number, L: number) => {
  L = clamp(L, 0, 1);
  const c = x - 0.5;
  return (1 - L) * x + L * (4 * c * c * c + 0.5);
};

export interface FlightElements {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  copies: HTMLElement[];
  route: HTMLElement;
  hint: HTMLElement;
  scrollbarFill: HTMLElement;
  track: HTMLElement;
  topbar: HTMLElement;
}

export interface FlightOptions {
  scenes: { accent: string; scroll?: number; linger?: number }[];
  context: SceneContext;
  fonts: WorldFonts;
  /** Fires only when the active scene changes — at most a handful of times per
   *  full scroll, so it is safe to route into React state. */
  onActiveChange?(index: number): void;
}

export interface FlightHandle {
  jumpTo(i: number): void;
  layout(): void;
  world: World;
  destroy(): void;
}

export function mountFlight(el: FlightElements, opts: FlightOptions): FlightHandle {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const smallMQ = window.matchMedia('(max-width: 860px)');
  const isMobile = () => coarse || smallMQ.matches;

  const N = opts.scenes.length;
  const world = createWorld(el.canvas, {
    scenes: opts.scenes, context: opts.context, fonts: opts.fonts,
  });
  const SEGS = world.segments;
  const NSEG = SEGS.length;

  let vh = window.innerHeight;
  let totalPx = 0;
  let laidOutW = window.innerWidth;
  let activeIndex = -1;
  let ticking = false;
  let targetT = 0, curT = 0, live = true, everRead = false;
  let raf = 0;
  let alive = true;

  function resizeCanvas() {
    el.canvas.style.width = window.innerWidth + 'px';
    el.canvas.style.height = window.innerHeight + 'px';
    world.resize(isMobile() ? 1.75 : 2);
  }

  function layout() {
    vh = window.innerHeight;
    laidOutW = window.innerWidth;
    let off = 0;
    SEGS.forEach(s => { s.start = off * vh; off += s.w; s.end = off * vh; });
    totalPx = off * vh;
    el.track.style.height = (totalPx + vh) + 'px';   // +1vh so the last dive completes
    resizeCanvas();
    read(true);
  }

  function jumpTo(i: number) {
    const seg = SEGS[i * 2];   // dive i lives at segment index 2i
    window.scrollTo({
      top: seg.start + (seg.end - seg.start) * 0.5,
      behavior: reduce ? 'auto' : 'smooth',
    });
  }

  function read(snap: boolean) {
    const y = window.scrollY || window.pageYOffset;

    let ci = 0;
    for (let i = 0; i < NSEG; i++) if (y >= SEGS[i].start) ci = i;
    const s = SEGS[ci];
    const local = clamp((y - s.start) / (s.end - s.start), 0, 1);
    targetT = ci + (s.linger ? lingerEase(local, s.linger) : local);
    if (snap || !everRead || reduce) curT = targetT;
    everRead = true;

    // The stage hands over to the page content in the final viewport-height.
    const past = clamp((y - totalPx) / (vh * 0.7), 0, 1);
    el.stage.style.opacity = String(1 - past);
    el.container.classList.toggle('is-landed', past > 0.98);
    live = past < 0.995;

    // Copy: scene 0 greets on landing, the last holds its CTA, the rest peak in
    // the middle of their own dive.
    for (let i = 0; i < N; i++) {
      const seg = SEGS[i * 2];
      const pr = clamp((y - seg.start) / (seg.end - seg.start), 0, 1);
      const before = y < seg.start, after = y > seg.end;
      let op: number;
      if (i === 0) op = after ? 0 : smooth(1 - pr / 0.62);
      else if (i === N - 1) op = before ? 0 : smooth(pr / 0.4) * (1 - past);
      else op = (before || after) ? 0 : smooth(1 - Math.abs(pr - 0.5) / 0.5);
      const c = el.copies[i];
      if (!c) continue;
      c.style.opacity = String(op);
      c.style.transform = reduce ? 'none' : `translateY(${((0.5 - pr) * 3.2).toFixed(2)}vh)`;
      c.style.pointerEvents = op > 0.5 ? 'auto' : 'none';
      c.setAttribute('aria-hidden', op > 0.05 ? 'false' : 'true');
    }

    // Which scene are we "at"? A connector belongs to whichever end is closer.
    const near = clamp(s.kind === 'dive' ? s.si : (local > 0.5 ? s.si + 1 : s.si), 0, N - 1);
    if (near !== activeIndex) {
      activeIndex = near;
      document.documentElement.style.setProperty('--accent', opts.scenes[near].accent);
      opts.onActiveChange?.(near);
    }

    el.scrollbarFill.style.transform = `scaleX(${clamp(y / totalPx, 0, 1).toFixed(4)})`;
    el.hint.style.opacity = String(clamp(1 - y / (0.55 * vh), 0, 1));
    el.route.style.opacity = String(1 - past);
    el.route.style.pointerEvents = past > 0.5 ? 'none' : 'auto';
    el.topbar.classList.toggle('is-solid', y > totalPx * 0.02);
    ticking = false;
  }

  /* ---- render loop --------------------------------------------------- */
  // Quality falls back once, not per-frame, so it cannot oscillate.
  let quality: 'high' | 'low' = 'high';
  let slowFrames = 0, lastFrame = 0;

  function frame(now: number) {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (!live) return;

    // camera lag — the same 0.17 follow the reference engine uses on seeks
    curT += (targetT - curT) * (reduce ? 1 : 0.17);
    if (Math.abs(targetT - curT) < 0.00005) curT = targetT;

    const t0 = performance.now();
    world.render(curT, reduce ? 0 : now, quality);
    const dt = performance.now() - t0;

    if (quality === 'high' && lastFrame) {
      if (dt > 20) { if (++slowFrames > 45) { quality = 'low'; world.resize(1.35); } }
      else if (slowFrames > 0) slowFrames--;
    }
    lastFrame = now;
  }

  /* ---- events -------------------------------------------------------- */
  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(() => read(false)); }
  };
  // Mobile browsers fire `resize` on every URL-bar slide. Re-running layout()
  // there rebuilds the track height and yanks the scroll position, so on touch we
  // only relayout when the width actually changed. Rotation still arrives through
  // orientationchange.
  const onResize = () => {
    if (coarse && window.innerWidth === laidOutW) { resizeCanvas(); return; }
    layout();
  };
  let rotateTimer = 0;
  const onOrient = () => { rotateTimer = window.setTimeout(layout, 120); };
  const onLoad = () => layout();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onOrient);
  window.addEventListener('load', onLoad);

  layout();
  // Touch every island once before the first paint. The rasterizer and the web
  // fonts each cost a one-off on their first use; paying it here keeps it out of
  // the middle of somebody's scroll.
  for (let i = 0; i < N; i++) world.render(i * 2 + 0.5, 0, 'high');
  world.render(curT, 0, 'high');

  raf = requestAnimationFrame(frame);

  return {
    jumpTo,
    layout,
    world,
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(rotateTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onOrient);
      window.removeEventListener('load', onLoad);
    },
  };
}
