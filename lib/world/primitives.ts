/* ============================================================================
   world/primitives.ts — math, palette, and the geometry builder.

   The shared "style preamble" of the world lives here: one palette and one
   lighting model reused by every scene, which is what makes six independently
   authored dioramas read as a single place.
   ========================================================================== */

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type RGB = [number, number, number];
export type ColorIn = string | RGB;

/* ------------------------------------------------------------------ math -- */
export const TAU = Math.PI * 2;
export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Slow-in / slow-out with a longer glide in the middle — reads as a camera on
 *  rails rather than a linear parameter sweep. */
export const easeCam = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function norm(v: Vec3): Vec3 {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
}
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* ----------------------------------------------------------------- color -- */
export function rgb(hex: ColorIn): RGB {
  if (Array.isArray(hex)) return hex;
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
export const mixc = (a: RGB, b: RGB, t: number): RGB =>
  [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const css = (c: RGB) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
export const cssa = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/* --------------------------------------------------------------- palette -- */
export const SKY_TOP = rgb('#04060F');
export const SKY_MID = rgb('#080C1B');
export const SKY_LOW = rgb('#0B1226');
export const FOG = rgb('#070B16');
export const LIGHT = norm([-0.42, 0.86, -0.30]);   // key light
export const FILL = norm([0.55, -0.15, 0.82]);     // cool bounce from below/front

export const MAT = {
  deck:    rgb('#141B30'),   // island decking
  deckTop: rgb('#1B2440'),
  rock:    rgb('#0C1122'),   // the underside of an island
  body:    rgb('#1A2237'),   // building bodies
  bodyLo:  rgb('#111828'),
  metal:   rgb('#232C45'),
  dark:    rgb('#0A0E1C'),
  white:   rgb('#DCE6FF'),
  // Anodised aluminium, for hardware that has to read as a *product* rather
  // than as architecture: bright enough to catch the key light against a scene
  // built almost entirely out of navy, but still tinted into the palette.
  alu:     rgb('#6C7691'),
  aluLo:   rgb('#454E68'),
  glass:   rgb('#05070E'),   // display glass, bezels, keycaps
} as const;

export const FOG_NEAR = 90;
export const FOG_FAR = 620;

/* ----------------------------------------------------------------- types -- */
export interface FaceOpts {
  emit?: number;
  /** Phase seed for the emissive pulse; omit for a steady light. */
  pulse?: number;
  speed?: number;
  alpha?: number;
  noCull?: boolean;
  rot?: number;
  tilt?: number;
  top?: boolean;
  bottom?: boolean;
  /** Push this face back by `behind` units for sorting only. See `Face.bias`. */
  behind?: number;
  topColor?: ColorIn;
  bottomColor?: ColorIn;
  topOpts?: FaceOpts;
  bottomOpts?: FaceOpts;
}

export interface Face {
  pts: Vec3[];
  n: Vec3;
  c: RGB;
  mid: Vec3;
  emit: number;
  pulse: number;
  speed: number;
  noCull: boolean;
  alpha: number;
  /** Depth added at sort time only — the renderer's polygon offset.
   *
   *  A painter's algorithm keys every face on its *average* depth, which is
   *  hopeless for a surface with things lying on it: a desk top averages to its
   *  own centre and therefore sorts in front of half the objects standing on
   *  it. Worse, because the camera carries yaw, view depth varies with world x
   *  as well as z — so a full-width keyboard deck (average x = 0) beats every
   *  keycap on its left-hand half, and the keyboard loses a vertical stripe.
   *  No amount of lifting details in y fixes that; the offending term is
   *  horizontal.
   *
   *  Surfaces that exist to be *stood on* — island decking, a desk top, a
   *  laptop's palm rest, the glass behind a screen's UI — therefore declare how
   *  far back to sort, and everything resting on them wins by construction. */
  bias: number;
}

export interface LabelOpts {
  size?: number; color?: ColorIn; weight?: number; track?: number;
  max?: number; upper?: boolean; mono?: boolean;
}

export interface Label {
  p: Vec3; text: string; size: number; color: RGB;
  weight: number; track: number; max: number; upper: boolean; mono: boolean;
}

export interface GlyphOpts {
  /** Height of the mark in world units — it scales with 1/z like real geometry. */
  size?: number;
  color?: ColorIn;
  alpha?: number;
  /** Bloom strength. 0 draws the mark flat, with no halo. */
  emit?: number;
  /** Fully faded beyond this camera distance. */
  max?: number;
  pulse?: number;
  speed?: number;
}

/** A brand mark: SVG path data on a 24x24 grid, billboarded at a world point.
 *  The renderer has no texturing, so a logo cannot be painted onto a face —
 *  it is filled in screen space at the projected anchor instead, exactly like
 *  the in-world signage, and stamped into the same bloom buffer as the
 *  emissive quads so it belongs to the scene's light rather than sitting on
 *  top of it as an overlay. */
export interface Glyph {
  p: Vec3; path: string; size: number; color: RGB;
  alpha: number; emit: number; max: number; pulse: number; speed: number;
}

export interface FlowEmitter {
  kind: 'flow'; from: Vec3; to: Vec3; color: RGB;
  n: number; r: number; speed: number; phase: number;
}
export interface OrbitEmitter {
  kind: 'orbit'; center: Vec3; radius: number; color: RGB;
  n: number; r: number; speed: number; tiltY: number;
}
export interface MotesEmitter {
  kind: 'motes'; center: Vec3; spread: number; color: RGB;
  n: number; r: number; speed: number; rise: number;
}
export type Emitter = FlowEmitter | OrbitEmitter | MotesEmitter;

/* --------------------------------------------------------------- builder -- */
export class Builder {
  accent: RGB;
  faces: Face[] = [];
  labels: Label[] = [];
  emitters: Emitter[] = [];
  glyphs: Glyph[] = [];

  constructor(accent: ColorIn) {
    this.accent = rgb(accent);
  }

  /** Build in a convenient upright frame, then rotate everything that `build`
   *  produced about `pivot` — pitch about the local X axis first, then yaw
   *  about Y.
   *
   *  `prism` only extrudes along Y, so without this there is no way to make a
   *  tilted solid: a laptop lid, a propped-open panel, a leaning sign. Rather
   *  than add a second geometry path with its own bugs, the lid is modelled
   *  *closed* — lying flat over the base, which is where its rounded corners
   *  come out right — and then swung open about the hinge line. Nests: an inner
   *  group's output is just more faces to the outer one. */
  group(pivot: Vec3, yaw: number, pitch: number, build: () => void): this {
    const f0 = this.faces.length, l0 = this.labels.length;
    const e0 = this.emitters.length, g0 = this.glyphs.length;
    build();

    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const rot = (v: Vec3): Vec3 => {
      const y = v[1] * cp - v[2] * sp, z = v[1] * sp + v[2] * cp;
      return [v[0] * cy + z * sy, y, -v[0] * sy + z * cy];
    };
    const at = (p: Vec3): Vec3 => {
      const r = rot([p[0] - pivot[0], p[1] - pivot[1], p[2] - pivot[2]]);
      return [r[0] + pivot[0], r[1] + pivot[1], r[2] + pivot[2]];
    };

    for (let i = f0; i < this.faces.length; i++) {
      const f = this.faces[i];
      f.pts = f.pts.map(at);
      f.mid = at(f.mid);
      f.n = rot(f.n);
    }
    for (let i = l0; i < this.labels.length; i++) this.labels[i].p = at(this.labels[i].p);
    for (let i = g0; i < this.glyphs.length; i++) this.glyphs[i].p = at(this.glyphs[i].p);
    for (let i = e0; i < this.emitters.length; i++) {
      const e = this.emitters[i];
      if (e.kind === 'flow') { e.from = at(e.from); e.to = at(e.to); }
      else e.center = at(e.center);
    }
    return this;
  }

  /** Push one polygon. `center` is the owning solid's centroid, used to orient
   *  the normal outward; pass null for free-floating quads (no culling). */
  quad(pts: Vec3[], color: ColorIn, opts: FaceOpts = {}, center: Vec3 | null): this {
    const a = pts[0], b = pts[1], c = pts[2];
    let n = norm([
      (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
      (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
      (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
    ]);
    let cx = 0, cy = 0, cz = 0;
    for (const p of pts) { cx += p[0]; cy += p[1]; cz += p[2]; }
    cx /= pts.length; cy /= pts.length; cz /= pts.length;

    if (center) {
      const outward: Vec3 = [cx - center[0], cy - center[1], cz - center[2]];
      if (dot(n, outward) < 0) n = [-n[0], -n[1], -n[2]];
    }
    if (!isFinite(n[0])) return this;

    this.faces.push({
      pts, n, c: rgb(color), mid: [cx, cy, cz],
      emit: opts.emit || 0,
      pulse: opts.pulse == null ? -1 : opts.pulse,
      speed: opts.speed || 1.6,
      noCull: !center || !!opts.noCull,
      alpha: opts.alpha == null ? 1 : opts.alpha,
      bias: opts.behind || 0,
    });
    return this;
  }

  /** An extruded polygon: `foot` is a list of [x,z] in world space. */
  prism(foot: Vec2[], y0: number, y1: number, color: ColorIn, opts: FaceOpts = {}): this {
    const n = foot.length;
    let sx = 0, sz = 0;
    for (const p of foot) { sx += p[0]; sz += p[1]; }
    const center: Vec3 = [sx / n, (y0 + y1) / 2, sz / n];

    if (opts.top !== false) {
      this.quad(foot.map(p => [p[0], y1, p[1]] as Vec3),
        opts.topColor || color, opts.topOpts || opts, center);
    }
    if (opts.bottom) {
      this.quad(foot.map(p => [p[0], y0, p[1]] as Vec3).reverse(),
        opts.bottomColor || color, opts.bottomOpts || opts, center);
    }
    if (y1 !== y0) {
      for (let i = 0; i < n; i++) {
        const a = foot[i], b = foot[(i + 1) % n];
        this.quad(
          [[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]],
          color, opts, center);
      }
    }
    return this;
  }

  /** Axis-aligned (or yaw-rotated) box. (x,z) is the footprint centre, y its base. */
  box(x: number, y: number, z: number, w: number, h: number, d: number,
      color: ColorIn, opts: FaceOpts = {}): this {
    return this.prism(rect(x, z, w, d, opts.rot || 0), y, y + h, color, opts);
  }

  /** A single flat panel — screens, signage, holograms. */
  panel(x: number, y: number, z: number, w: number, h: number, yaw: number,
        color: ColorIn, opts: FaceOpts = {}): this {
    const tilt = opts.tilt || 0;
    const rt: Vec3 = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const nm: Vec3 = [Math.sin(yaw), 0, Math.cos(yaw)];
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const up: Vec3 = [nm[0] * -st, ct, nm[2] * -st];
    const fw: Vec3 = [nm[0] * ct, st, nm[2] * ct];
    const at = (u: number, v: number): Vec3 => [
      x + rt[0] * u + up[0] * v + fw[0] * 0.06,
      y + rt[1] * u + up[1] * v + fw[1] * 0.06,
      z + rt[2] * u + up[2] * v + fw[2] * 0.06,
    ];
    return this.quad(
      [at(-w / 2, 0), at(w / 2, 0), at(w / 2, h), at(-w / 2, h)],
      color, { ...opts, noCull: true }, null);
  }

  label(x: number, y: number, z: number, text: string, opts: LabelOpts = {}): this {
    this.labels.push({
      p: [x, y, z], text,
      size: opts.size || 13,
      color: opts.color ? rgb(opts.color) : this.accent,
      weight: opts.weight || 700,
      track: opts.track || 0.08,
      max: opts.max || 560,          // fully faded beyond this camera distance
      upper: opts.upper !== false,
      mono: !!opts.mono,
    });
    return this;
  }

  /** A brand mark from `logos.ts`, anchored at a world point. */
  glyph(x: number, y: number, z: number, path: string, opts: GlyphOpts = {}): this {
    this.glyphs.push({
      p: [x, y, z], path,
      size: opts.size || 3,
      color: opts.color ? rgb(opts.color) : this.accent,
      alpha: opts.alpha == null ? 1 : opts.alpha,
      emit: opts.emit == null ? 0.9 : opts.emit,
      max: opts.max || 420,
      pulse: opts.pulse == null ? -1 : opts.pulse,
      speed: opts.speed || 0.8,
    });
    return this;
  }

  /* Animated point lights: packets on a line, orbiting beacons, rising motes. */
  flow(from: Vec3, to: Vec3, o: Partial<FlowEmitter> & { color?: ColorIn } = {}): this {
    this.emitters.push({
      kind: 'flow', from, to, color: rgb(o.color || this.accent),
      n: o.n || 5, r: o.r || 1.5, speed: o.speed || 0.35, phase: o.phase || 0,
    });
    return this;
  }
  orbit(center: Vec3, radius: number, o: Partial<OrbitEmitter> & { color?: ColorIn } = {}): this {
    this.emitters.push({
      kind: 'orbit', center, radius, color: rgb(o.color || this.accent),
      n: o.n || 1, r: o.r || 2.4, speed: o.speed || 0.5, tiltY: o.tiltY || 0,
    });
    return this;
  }
  motes(center: Vec3, spread: number, o: Partial<MotesEmitter> & { color?: ColorIn } = {}): this {
    this.emitters.push({
      kind: 'motes', center, spread, color: rgb(o.color || this.accent),
      n: o.n || 14, r: o.r || 0.9, speed: o.speed || 0.16, rise: o.rise || 16,
    });
    return this;
  }
}

/* ---------------------------------------------------- footprint helpers -- */

export function rect(cx: number, cz: number, w: number, d: number, rot: number): Vec2[] {
  const hw = w / 2, hd = d / 2;
  const pts: Vec2[] = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
  if (!rot) return pts.map(p => [cx + p[0], cz + p[1]] as Vec2);
  const c = Math.cos(rot), s = Math.sin(rot);
  return pts.map(p => [cx + p[0] * c - p[1] * s, cz + p[0] * s + p[1] * c] as Vec2);
}

/** A rectangle with rounded corners, as a footprint for `prism`.
 *  `seg` segments per corner — 3 is plenty at the scale these are seen, and the
 *  extra side faces are the whole reason a unibody shell reads as milled
 *  aluminium instead of as a cardboard box. */
export function roundRect(cx: number, cz: number, w: number, d: number,
                          r: number, rot = 0, seg = 3): Vec2[] {
  const hw = w / 2, hd = d / 2;
  const rr = Math.min(r, hw, hd);
  const pts: Vec2[] = [];
  // corner centres, counter-clockwise from the -x/-z corner
  const corners: Vec2[] = [
    [-hw + rr, -hd + rr], [hw - rr, -hd + rr], [hw - rr, hd - rr], [-hw + rr, hd - rr],
  ];
  corners.forEach((c, i) => {
    const a0 = Math.PI + (i * Math.PI) / 2;
    for (let k = 0; k <= seg; k++) {
      const a = a0 + (k / seg) * (Math.PI / 2);
      pts.push([c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr]);
    }
  });
  if (!rot) return pts.map(p => [cx + p[0], cz + p[1]] as Vec2);
  const co = Math.cos(rot), si = Math.sin(rot);
  return pts.map(p => [cx + p[0] * co - p[1] * si, cz + p[0] * si + p[1] * co] as Vec2);
}

export function ngon(cx: number, cz: number, r: number, n: number, rot = 0): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rot;
    out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
  }
  return out;
}

/* ------------------------------------------------------- shared pieces -- */

/** Every island stands on the same tapered octagonal deck with a neon rim — the
 *  single strongest cue that these six scenes belong to one world. */
export function island(
  b: Builder, r: number,
  o: { sides?: number; rot?: number; motes?: boolean } = {}
) {
  const sides = o.sides || 8, rot = o.rot ?? 0.39;
  // The decking is the largest horizontal plane in the world and everything in
  // the scene stands on it, so the whole island sorts all the way back — see
  // `Face.bias`. Biasing the island as one object rather than one face keeps
  // its own parts ordered correctly against each other: the rock underside must
  // still not paint over the deck it hangs from.
  const back = r * 1.2;
  // The understructure sorts a further island-radius back again. Its near-side
  // faces are a whole radius closer to the lens than the deck's centroid, so on
  // equal bias they draw last and hang a rock spike over the deck they support.
  const under = back + r;
  b.prism(ngon(0, 0, r, sides, rot), -1.2, 0, MAT.deck,
    { topColor: MAT.deckTop, behind: back });
  b.prism(ngon(0, 0, r - 1.1, sides, rot), -3.4, -1.2, MAT.rock, { top: false, behind: under });
  b.prism(ngon(0, 0, r * 0.72, sides, rot), -9, -3.4, MAT.rock, { top: false, behind: under });
  b.prism(ngon(0, 0, r * 0.34, sides, rot), -17, -9, MAT.rock,
    { top: false, bottom: true, behind: under });
  // rim light — outboard of everything, so it stays in front of the whole island
  b.prism(ngon(0, 0, r + 0.5, sides, rot), -0.55, -0.05, b.accent,
    { top: false, emit: 0.9, pulse: 0.4, speed: 0.7, behind: back - 1 });
  // inner plaza inlay
  b.prism(ngon(0, 0, r * 0.86, sides, rot), 0.01, 0.06, mixc(MAT.deckTop, b.accent, 0.10),
    { behind: back });
  if (o.motes !== false) b.motes([0, 2, 0], r * 0.95, { n: 12, rise: 26, r: 0.75 });
  return b;
}

/** A banded tower — the vocabulary shared by the stack district and the yard. */
export function tower(
  b: Builder, x: number, z: number, w: number, h: number, d: number,
  o: { rot?: number; color?: ColorIn; glow?: ColorIn; bands?: number; cap?: boolean; mast?: number } = {}
) {
  const rot = o.rot || 0;
  const body = o.color ? rgb(o.color) : MAT.body;
  b.box(x, 0, z, w, h, d, body, { rot, topColor: mixc(body, MAT.metal, 0.5) });
  const bands = o.bands == null ? Math.max(2, Math.round(h / 5)) : o.bands;
  for (let i = 1; i <= bands; i++) {
    const y = (h / (bands + 1)) * i;
    b.box(x, y, z, w + 0.35, 0.34, d + 0.35, o.glow ? rgb(o.glow) : b.accent,
      { rot, emit: 0.85, pulse: (i * 0.7 + x * 0.1) % TAU, speed: 0.9 + i * 0.13 });
  }
  if (o.cap !== false) {
    b.box(x, h, z, w * 0.55, 0.5, d * 0.55, MAT.metal, { rot });
    b.box(x, h + 0.5, z, 0.3, o.mast || 2.4, 0.3, MAT.metal, { rot });
    b.box(x, h + 0.5 + (o.mast || 2.4), z, 0.7, 0.7, 0.7, b.accent,
      { emit: 1, pulse: x, speed: 1.5 });
  }
  return b;
}
