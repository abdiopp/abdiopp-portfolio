/* ============================================================================
   world/renderer.ts — the live renderer.

   This is the "pre-rendered clip chain" of the lets-scroll pipeline, replaced by
   a Canvas 2D scene graph with a real 3D camera. Scroll drives one number —
   flight time T — and the camera pose is a pure function of T, so every seam
   between a dive and a connector is frame-identical by construction.

   Painter's algorithm over backface-culled quads, one blurred additive pass for
   the emissive bloom, additive sprites for the animated point lights, and a
   screen-space collision test to keep the in-world signage legible.
   ========================================================================== */

import {
  Builder, FOG, FOG_FAR, FOG_NEAR, FILL, LIGHT, MAT, SKY_LOW, SKY_MID, SKY_TOP,
  TAU, clamp, css, cssa, lerp, mixc,
  type Face, type Label, type RGB, type Vec3,
} from './primitives';
import {
  BUILDERS, PLACES, buildSegments, cameraAt,
  type Camera, type SceneContext, type Segment,
} from './scenes';

export interface WorldFonts {
  /** Family stacks used for in-world signage. Passed in so next/font's hashed
   *  family names reach the canvas, which cannot read a CSS class. */
  display: string;
  mono: string;
}

export interface WorldOptions {
  scenes: { accent: string; scroll?: number; linger?: number }[];
  context: SceneContext;
  fonts: WorldFonts;
}

export interface World {
  render(T: number, time: number, quality?: 'high' | 'low'): Camera | undefined;
  resize(dprCap?: number): void;
  segments: Segment[];
  accentOf(i: number): RGB;
  /** Pose at a flight time, without drawing. Used by the seam-continuity QA. */
  cameraAt(T: number): Camera;
}

interface Star { p: Vec3; m: number; ph: number }
interface DrawRec { q: [number, number, number][]; z: number; f: Face; acc: RGB }
interface Sprite { x: number; y: number; z: number; r: number; c: RGB; a: number }

function makeStars(): Star[] {
  const out: Star[] = [];
  let seed = 1337;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < 220; i++) {
    const a = rnd() * TAU, r = 1600 + rnd() * 1400;
    out.push({
      p: [440 + Math.cos(a) * r, 120 + rnd() * 900, Math.sin(a) * r],
      m: 0.25 + rnd() * 0.75,
      ph: rnd() * TAU,
    });
  }
  return out;
}

export function createWorld(canvas: HTMLCanvasElement, opts: WorldOptions): World {
  const ctx = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;
  const segs = buildSegments(opts.scenes);
  const FONT_DISPLAY = opts.fonts.display;
  const FONT_MONO = opts.fonts.mono;

  const islands = BUILDERS.map((fn, i) => {
    const b = new Builder(opts.scenes[i] ? opts.scenes[i].accent : '#22D3EE');
    fn(b, opts.context);
    const off = PLACES[i].at;
    // bake the island's world offset once, so the hot loop never re-adds it
    b.faces.forEach(f => {
      f.pts = f.pts.map(p => [p[0] + off[0], p[1], p[2] + off[1]] as Vec3);
      f.mid = [f.mid[0] + off[0], f.mid[1], f.mid[2] + off[1]];
    });
    b.labels.forEach(l => { l.p = [l.p[0] + off[0], l.p[1], l.p[2] + off[1]]; });
    b.emitters.forEach(e => {
      const shift = (p: Vec3): Vec3 => [p[0] + off[0], p[1], p[2] + off[1]];
      if (e.kind === 'flow') { e.from = shift(e.from); e.to = shift(e.to); }
      else { e.center = shift(e.center); }
    });
    return b;
  });

  const stars = makeStars();

  let W = 0, H = 0, DPR = 1, focal = 800;
  const glow = document.createElement('canvas');
  const gctx = glow.getContext('2d') as CanvasRenderingContext2D;
  const GDIV = 4;
  let canFilter = true;
  try { gctx.filter = 'blur(2px)'; canFilter = gctx.filter !== 'none'; } catch { canFilter = false; }

  function resize(dprCap = 2) {
    DPR = Math.min(dprCap, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(W * DPR));
    canvas.height = Math.max(1, Math.round(H * DPR));
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    glow.width = Math.max(1, Math.round(canvas.width / GDIV));
    glow.height = Math.max(1, Math.round(canvas.height / GDIV));
    // Widen the field of view a little on narrow/portrait viewports so a phone
    // still frames the whole diorama instead of cropping into its middle.
    const ar = W / Math.max(1, H);
    const fov = ar < 0.85 ? 1.20 : ar < 1.25 ? 1.06 : 0.94;
    focal = (H / 2) / Math.tan(fov / 2);
  }

  // scratch, reused every frame — no per-frame allocation in the hot path
  const draw: DrawRec[] = [];
  const sprites: Sprite[] = [];

  function render(T: number, time: number, quality: 'high' | 'low' = 'high'): Camera | undefined {
    if (!W || !H) return undefined;
    const cam = cameraAt(segs, clamp(T, 0, segs.length - 0.0001));
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const F: Vec3 = [sy * cp, -sp, cy * cp];
    const R: Vec3 = [cy, 0, -sy];
    const U: Vec3 = [sp * sy, cp, sp * cy];
    const eye: Vec3 = [cam.tx - F[0] * cam.d, cam.ty - F[1] * cam.d, cam.tz - F[2] * cam.d];
    const accent = islands[cam.si].accent;
    const hw = W / 2, hh = H / 2;
    const NEAR = 1.2;
    const lite = quality === 'low';

    /** Project a world point → [sx, sy, depth], or null when behind the camera. */
    function px(p: Vec3): [number, number, number] | null {
      const dx = p[0] - eye[0], dy = p[1] - eye[1], dz = p[2] - eye[2];
      const z = dx * F[0] + dy * F[1] + dz * F[2];
      if (z < NEAR) return null;
      const f = focal / z;
      return [
        hw + (dx * R[0] + dy * R[1] + dz * R[2]) * f,
        hh - (dx * U[0] + dy * U[1] + dz * U[2]) * f,
        z,
      ];
    }

    /* ---- sky ---- */
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, css(SKY_TOP));
    g.addColorStop(0.55, css(SKY_MID));
    g.addColorStop(1, css(mixc(SKY_LOW, accent, 0.10)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const rg = ctx.createRadialGradient(W * 0.62, H * 0.30, 0, W * 0.62, H * 0.30, Math.max(W, H) * 0.75);
    rg.addColorStop(0, cssa(accent, 0.10));
    rg.addColorStop(0.45, cssa(accent, 0.03));
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

    /* ---- stars ---- */
    ctx.fillStyle = '#ffffff';
    for (const s of stars) {
      const q = px(s.p);
      if (!q) continue;
      if (q[0] < -20 || q[0] > W + 20 || q[1] < -20 || q[1] > H + 20) continue;
      ctx.globalAlpha = s.m * (0.35 + 0.4 * (0.5 + 0.5 * Math.sin(time * 0.0009 + s.ph))) * 0.8;
      ctx.fillRect(q[0], q[1], 1.4, 1.4);
    }
    ctx.globalAlpha = 1;

    /* ---- the ground grid, far below the islands ---- */
    function seg(a: Vec3, b: Vec3) {
      // clip the segment to the near plane, then draw
      let za = (a[0] - eye[0]) * F[0] + (a[1] - eye[1]) * F[1] + (a[2] - eye[2]) * F[2];
      let zb = (b[0] - eye[0]) * F[0] + (b[1] - eye[1]) * F[1] + (b[2] - eye[2]) * F[2];
      if (za < NEAR && zb < NEAR) return;
      let A = a, B = b;
      if (za < NEAR) {
        const t = (NEAR - za) / (zb - za);
        A = [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
      } else if (zb < NEAR) {
        const t = (NEAR - zb) / (za - zb);
        B = [lerp(b[0], a[0], t), lerp(b[1], a[1], t), lerp(b[2], a[2], t)];
      }
      const p = px(A), q = px(B);
      if (!p || !q) return;
      const dm = (p[2] + q[2]) * 0.5;
      const al = clamp(1 - (dm - 120) / 900, 0, 1) * 0.16;
      if (al < 0.012) return;
      ctx.strokeStyle = cssa(accent, al);
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    }
    if (!lite) {
      ctx.lineWidth = 1;
      const GY = -46, STEP = 60;
      const x0 = Math.round((eye[0] - 700) / STEP) * STEP, x1 = eye[0] + 700;
      const z0 = Math.round((eye[2] - 700) / STEP) * STEP, z1 = eye[2] + 700;
      for (let x = x0; x <= x1; x += STEP) seg([x, GY, z0], [x, GY, z1]);
      for (let z = z0; z <= z1; z += STEP) seg([x0, GY, z], [x1, GY, z]);
    }

    /* ---- collect geometry from the islands near the camera ---- */
    let drawN = 0;
    const lo = Math.max(0, cam.si - 1), hi = Math.min(islands.length - 1, cam.si + 1);
    for (let k = lo; k <= hi; k++) {
      const isl = islands[k], fs = isl.faces;
      for (const f of fs) {
        if (!f.noCull) {
          // backface cull
          if ((f.mid[0] - eye[0]) * f.n[0] +
              (f.mid[1] - eye[1]) * f.n[1] +
              (f.mid[2] - eye[2]) * f.n[2] >= 0) continue;
        }
        const P = f.pts;
        const a = px(P[0]); if (!a) continue;
        const b2 = px(P[1]); if (!b2) continue;
        const c2 = px(P[2]); if (!c2) continue;
        const d2 = px(P[3]); if (!d2) continue;
        // cheap screen-space reject
        const minx = Math.min(a[0], b2[0], c2[0], d2[0]); if (minx > W + 40) continue;
        const maxx = Math.max(a[0], b2[0], c2[0], d2[0]); if (maxx < -40) continue;
        const miny = Math.min(a[1], b2[1], c2[1], d2[1]); if (miny > H + 40) continue;
        const maxy = Math.max(a[1], b2[1], c2[1], d2[1]); if (maxy < -40) continue;
        // sub-pixel reject — a huge win when a whole island is far away
        if (maxx - minx < 0.7 && maxy - miny < 0.7) continue;

        const depth = (a[2] + b2[2] + c2[2] + d2[2]) * 0.25;
        const rec = draw[drawN] || (draw[drawN] = { q: [], z: 0, f, acc: isl.accent } as DrawRec);
        rec.q[0] = a; rec.q[1] = b2; rec.q[2] = c2; rec.q[3] = d2;
        rec.z = depth; rec.f = f; rec.acc = isl.accent;
        drawN++;
      }
    }

    // painter's algorithm
    const list = draw.slice(0, drawN);
    list.sort((p, q) => q.z - p.z);

    /* ---- fill ---- */
    if (canFilter) gctx.clearRect(0, 0, glow.width, glow.height);
    const gs = DPR / GDIV;
    let glowUsed = false;

    for (const r of list) {
      const f = r.f, q = r.q;
      let col: RGB;

      if (f.emit > 0) {
        let e = f.emit;
        if (f.pulse >= 0) e *= 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(time * 0.001 * f.speed + f.pulse));
        // Keep emissives *coloured*: pushing them far toward white is what turns
        // a neon panel into a blown-out grey rectangle.
        col = mixc(mixc(FOG, f.c, 0.40), mixc(f.c, MAT.white, 0.30), clamp(e, 0, 1));
      } else {
        const lam = Math.max(0, f.n[0] * LIGHT[0] + f.n[1] * LIGHT[1] + f.n[2] * LIGHT[2]);
        const fil = Math.max(0, f.n[0] * FILL[0] + f.n[1] * FILL[1] + f.n[2] * FILL[2]);
        const k = 0.30 + 0.78 * lam;
        col = [f.c[0] * k, f.c[1] * k, f.c[2] * k];
        col = mixc(col, r.acc, fil * 0.22);
      }
      // distance fog
      const fg = clamp((r.z - FOG_NEAR) / (FOG_FAR - FOG_NEAR), 0, 1);
      if (fg > 0) col = mixc(col, FOG, fg * (f.emit > 0 ? 0.55 : 0.88));

      ctx.beginPath();
      ctx.moveTo(q[0][0], q[0][1]);
      ctx.lineTo(q[1][0], q[1][1]);
      ctx.lineTo(q[2][0], q[2][1]);
      ctx.lineTo(q[3][0], q[3][1]);
      ctx.closePath();
      ctx.globalAlpha = f.alpha;
      ctx.fillStyle = css(col);
      ctx.fill();

      if (f.emit > 0.35 && canFilter && fg < 0.9) {
        glowUsed = true;
        gctx.beginPath();
        gctx.moveTo(q[0][0] * gs, q[0][1] * gs);
        gctx.lineTo(q[1][0] * gs, q[1][1] * gs);
        gctx.lineTo(q[2][0] * gs, q[2][1] * gs);
        gctx.lineTo(q[3][0] * gs, q[3][1] * gs);
        gctx.closePath();
        gctx.globalAlpha = (1 - fg) * 0.85 * f.alpha;
        gctx.fillStyle = css(col);
        gctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    /* ---- bloom: one blurred composite of the emissive pass only ---- */
    if (glowUsed && canFilter) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = `blur(${lite ? 5 : 7}px)`;
      ctx.globalAlpha = lite ? 0.34 : 0.42;
      ctx.drawImage(glow, 0, 0, W, H);
      ctx.filter = 'none';
      ctx.restore();
    }

    /* ---- animated point lights ---- */
    let spriteN = 0;
    function addSprite(x: number, y: number, z: number, r: number, color: RGB, mul: number) {
      const p = px([x, y, z]);
      if (!p) return;
      if (p[0] < -60 || p[0] > W + 60 || p[1] < -60 || p[1] > H + 60) return;
      const s = sprites[spriteN] || (sprites[spriteN] = {} as Sprite);
      s.x = p[0]; s.y = p[1]; s.z = p[2];
      s.r = Math.max(0.6, (r * focal) / p[2]);
      s.c = color;
      s.a = clamp(mul, 0, 1) * clamp(1 - (p[2] - FOG_NEAR) / (FOG_FAR - FOG_NEAR), 0, 1);
      spriteN++;
    }
    for (let k = lo; k <= hi; k++) {
      for (const e of islands[k].emitters) {
        if (e.kind === 'flow') {
          for (let j = 0; j < e.n; j++) {
            const u = ((time * 0.001 * e.speed) + j / e.n + e.phase) % 1;
            addSprite(lerp(e.from[0], e.to[0], u), lerp(e.from[1], e.to[1], u),
              lerp(e.from[2], e.to[2], u), e.r, e.color, Math.sin(u * Math.PI));
          }
        } else if (e.kind === 'orbit') {
          for (let j = 0; j < e.n; j++) {
            const a = time * 0.001 * e.speed + (j / e.n) * TAU;
            addSprite(e.center[0] + Math.cos(a) * e.radius,
              e.center[1] + Math.sin(a * 2 + j) * (e.tiltY || 1.6),
              e.center[2] + Math.sin(a) * e.radius, e.r, e.color, 1);
          }
        } else {
          for (let j = 0; j < e.n; j++) {
            const u = ((time * 0.001 * e.speed) + j / e.n) % 1;
            const a = j * 2.399963;
            addSprite(e.center[0] + Math.cos(a) * e.spread * (0.35 + (j % 5) / 6),
              e.center[1] + u * e.rise,
              e.center[2] + Math.sin(a) * e.spread * (0.35 + (j % 7) / 8),
              e.r, e.color, Math.sin(u * Math.PI) * 0.8);
          }
        }
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < spriteN; i++) {
      const s = sprites[i];
      if (s.a < 0.03 || s.r > 90) continue;
      const rr = s.r * 3.2;
      const gg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rr);
      gg.addColorStop(0, cssa(mixc(s.c, MAT.white, 0.6), 0.95 * s.a));
      gg.addColorStop(0.28, cssa(s.c, 0.55 * s.a));
      gg.addColorStop(1, cssa(s.c, 0));
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(s.x, s.y, rr, 0, TAU); ctx.fill();
    }
    ctx.restore();

    /* ---- in-world labels -------------------------------------------------
       Signage is the one thing a painter's-algorithm renderer can't depth-test
       cheaply, so it is disciplined instead: size is clamped to a legible band
       rather than following 1/z all the way in, labels fade out once the camera
       is inside their scene (they've done their job by then), neighbouring
       islands are heavily attenuated, and a screen-space box test drops any
       label that would collide with a nearer one.                          */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cand: { l: Label; p: [number, number, number]; size: number; al: number }[] = [];
    for (let k = lo; k <= hi; k++) {
      const own = k === cam.si;
      for (const l of islands[k].labels) {
        const p = px(l.p);
        if (!p) continue;
        if (p[0] < -160 || p[0] > W + 160 || p[1] < -40 || p[1] > H + 40) continue;
        const size = Math.min(l.size * (focal / p[2]) * 0.5, 21);
        if (size < 7) continue;
        let al = clamp((p[2] - 24) / 36, 0, 1)                      // fade out up close
               * clamp(1 - (p[2] - 140) / (l.max - 140), 0, 1);     // and far away
        if (!own) al *= 0.26;
        if (al < 0.07) continue;
        cand.push({ l, p, size, al });
      }
    }
    cand.sort((a, b) => a.p[2] - b.p[2]);     // nearest label wins a contested slot
    const placed: [number, number, number, number][] = [];
    for (const { l, p, size, al } of cand) {
      const txt = l.upper ? l.text.toUpperCase() : l.text;
      ctx.font = `${l.weight} ${size.toFixed(1)}px ${l.mono ? FONT_MONO : FONT_DISPLAY}`;
      ctx.letterSpacing = `${(l.track * size).toFixed(2)}px`;
      const half = ctx.measureText(txt).width / 2 + 5;
      const box: [number, number, number, number] =
        [p[0] - half, p[1] - size * 0.8, p[0] + half, p[1] + size * 0.8];
      let hit = false;
      for (const q of placed) {
        if (box[0] < q[2] && box[2] > q[0] && box[1] < q[3] && box[3] > q[1]) { hit = true; break; }
      }
      if (hit) continue;
      placed.push(box);
      ctx.globalAlpha = al * 0.55;
      ctx.fillStyle = '#05070F';
      ctx.fillText(txt, p[0], p[1] + Math.max(1, size * 0.08));
      ctx.globalAlpha = al;
      ctx.fillStyle = css(mixc(l.color, MAT.white, 0.5));
      ctx.fillText(txt, p[0], p[1]);
    }
    ctx.globalAlpha = 1;
    ctx.letterSpacing = '0px';

    /* ---- lens grade: vignette ---- */
    const vg = ctx.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.32,
      W / 2, H * 0.5, Math.max(W, H) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    return cam;
  }

  return {
    render,
    resize,
    segments: segs,
    accentOf: (i: number) => islands[i].accent,
    cameraAt: (T: number) => cameraAt(segs, T),
  };
}
