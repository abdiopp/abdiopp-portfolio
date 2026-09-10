/* ============================================================================
   world/scenes.ts — the six dioramas, the world map they sit on, and the camera
   path that flies between them.

   Segment chain (architecture B — dive + aerial connector):
       dive0, conn0, dive1, conn1, … dive5      → 11 segments for 6 scenes
       dive i : approach(i) → interior(i)          "descend into the scene"
       conn i : interior(i) → approach(i+1)        "pull up, glide over, arrive"
   ========================================================================== */

import {
  Builder, MAT, TAU, clamp, easeCam, island, lerp, mixc, ngon, rect, rgb,
  roundRect, tower,
  type ColorIn, type FaceOpts, type Vec2, type Vec3,
} from './primitives';
import { LOGOS } from './logos';

/** What the scenes need from the content layer. Passed in rather than read off a
 *  global, so the world stays a pure module. */
export interface SceneContext {
  projects: { name: string; short: string }[];
  githubHandle: string;
}

/* ------------------------------------------------- props for the basecamp -- */

/** Deterministic 0–1 from an integer — used to vary token widths on the screen
 *  mock without dragging a PRNG through the builder. */
const rnd = (i: number) => {
  const s = Math.sin(i * 12.9898 + 4.137) * 43758.5453;
  return s - Math.floor(s);
};

/** An open MacBook Pro.
 *
 *  Proportions are the 16-inch chassis — 35.57 x 24.81 x 1.68 cm — scaled to
 *  `w`. What makes it read as *this* machine rather than a generic wedge is a
 *  short list: rounded unibody corners, a lid that is edge-to-edge black glass
 *  with a notch instead of a grey rectangle in a frame, the oversized trackpad,
 *  and a hinge that opens a little past vertical.
 *
 *  The lid is modelled *closed* — lying flat over the base, the one orientation
 *  in which `prism`'s Y extrusion gives it rounded corners on all four sides —
 *  and then swung open about the hinge line by `group`. Everything on the
 *  display is likewise authored flat, in a (u across, v down) display space, so
 *  the screen mock is written as if it were a 2D layout and arrives on a tilted
 *  plane for free.
 */
function macbook(b: Builder, x: number, y: number, z: number, w: number,
                 o: { yaw?: number; lean?: number } = {}) {
  const A = b.accent;
  // Sort-depth budget for the machine's stacked flat surfaces, outermost first.
  // Each step has to exceed the depth spread the camera's yaw induces across
  // the surface below it — roughly a tenth of its width. See `Face.bias`.
  const CHASSIS_BACK = 3.0, WELL_BACK = 1.2;
  const BG_BACK = 2.2, PANE_BACK = 1.4, HILITE_BACK = 0.7;
  const D = w * 0.697;               // 24.81 / 35.57
  const TH = w * 0.047;              // 1.68 / 35.57 — closed thickness
  const rr = w * 0.052;              // unibody corner radius
  const lean = o.lean ?? 0.29;       // how far past vertical the lid opens

  const footH = TH * 0.22;
  const y0 = y + footH;              // underside of the bottom case
  const deck = y0 + TH * 0.90;       // the keyboard deck
  const hz = z + D / 2 - w * 0.012;  // hinge line, just inside the back edge
  const hy = y0 + TH * 0.48;
  const LT = TH * 0.62;              // the lid is thinner than the base

  /** A horizontal quad, wound so its normal points up. */
  const flat = (cx: number, cz: number, ww: number, dd: number, yy: number,
                c: ColorIn, op: FaceOpts = {}) =>
    b.quad(rect(cx, cz, ww, dd, 0).reverse().map(p => [p[0], yy, p[1]] as Vec3), c, op, null);

  /* --- keyboard layout ---
     Widths are the real ones, in standard key units; every row totals 14.5u,
     which is what lines the two edges of the keyboard up. */
  const kw = w * 0.755, kd = D * 0.425;
  const kzBack = z + D * 0.40;
  const ROWS: number[][] = [
    [1.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.25],  // esc · F1–F12 · Touch ID
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],      // ` 1–0 - = delete
    [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],      // tab … \
    [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75],     // caps … return
    [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],        // shift … shift
    [1, 1, 1, 1.25, 5, 1.25, 1, 1, 1, 1],              // fn ctrl opt cmd space cmd opt ◀ ▲▼ ▶
  ];
  const u1 = kw * 0.0620;                              // one key unit
  const rowGap = kd * 0.020;
  const rowH = (kd - rowGap * 7) / 5.62;               // the function row is 0.62 high

  interface Row { row: number[]; c: number; h: number; z0: number; z1: number }
  const rows: Row[] = [];
  {
    let rz = kzBack - rowGap;
    ROWS.forEach((row, ri) => {
      const h = (ri === 0 ? 0.62 : 1) * rowH;
      rows.push({ row, c: rz - h / 2, h, z0: rz - h - rowGap / 2, z1: rz + rowGap / 2 });
      rz -= h + rowGap;
    });
  }
  const tp0 = z - D * 0.442, tp1 = z - D * 0.094;       // the trackpad
  const hgz = z + D / 2 - w * 0.038;                    // the hinge cover

  b.group([x, y, z], o.yaw || 0, 0, () => {
    /* --- feet --- */
    ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as Vec2[]).forEach(s =>
      b.prism(ngon(x + s[0] * w * 0.40, z + s[1] * D * 0.375, w * 0.026, 6),
        y, y + footH, MAT.glass, { top: false, behind: CHASSIS_BACK }));

    /* --- unibody bottom case --- */
    b.prism(roundRect(x, z, w, D, rr), y0, deck, MAT.aluLo, {
      topColor: mixc(MAT.alu, MAT.white, 0.08),
      bottom: true, bottomColor: mixc(MAT.aluLo, MAT.dark, 0.45),
      behind: CHASSIS_BACK,                // the palm rest sorts under its keys
    });

    /* --- keycaps, as one flat quad each ---
       The deck is near edge-on from the interior camera, so extruded keys would
       cost six faces apiece to render a sliver. The well behind them is tinted
       toward the accent and lightly emissive — that halo leaking around the
       keycaps is the backlight, and it is what stops the deck from reading as
       a bare plate. */
    const cap = mixc(MAT.glass, MAT.white, 0.05);
    flat(x, (rows[5].z0 + rows[0].z1) / 2, kw + w * 0.028, rows[0].z1 - rows[5].z0,
      deck + 0.006, mixc(MAT.glass, A, 0.16),
      { emit: 0.30, pulse: 1.4, speed: 0.4, behind: WELL_BACK });
    ([-1, 1] as const).forEach(sd =>                      // speaker grilles
      flat(x + sd * (kw / 2 + w * 0.058), (rows[5].z0 + rows[0].z1) / 2,
        w * 0.076, (rows[0].z1 - rows[5].z0) * 0.98, deck + 0.006,
        mixc(MAT.aluLo, A, 0.12), { emit: 0.16, behind: WELL_BACK }));
    rows.forEach(({ row, c, h }) => {
      const g = (kw - 14.5 * u1) / (row.length + 1);
      let kx = x - kw / 2 + g;
      row.forEach((units, ki) => {
        const kwid = units * u1;
        if (ki === 8 && row.length === 10) {
          // the arrow cluster splits into two half-height keys
          flat(kx + kwid / 2, c + h * 0.22, kwid, h * 0.40, deck + 0.012, cap);
          flat(kx + kwid / 2, c - h * 0.22, kwid, h * 0.40, deck + 0.012, cap);
        } else {
          flat(kx + kwid / 2, c, kwid, h * 0.86, deck + 0.012, cap);
        }
        kx += kwid + g;
      });
    });

    /* --- trackpad and hinge cover --- */
    flat(x, (tp0 + tp1) / 2, w * 0.455, tp1 - tp0, deck + 0.006,
      mixc(MAT.aluLo, MAT.dark, 0.30), { behind: WELL_BACK });
    flat(x, (tp0 + tp1) / 2, w * 0.435, (tp1 - tp0) * 0.95, deck + 0.012,
      mixc(MAT.alu, MAT.dark, 0.42), { emit: 0.06 });
    flat(x, hgz, w * 0.58, w * 0.046, deck + 0.012, MAT.glass);

    /* ================================================================ lid == */
    b.group([x, hy, hz], 0, Math.PI / 2 + lean, () => {
      const lz = hz - D / 2;                       // lid centre, lying closed
      b.prism(roundRect(x, lz, w, D, rr), hy, hy + LT, MAT.aluLo, {
        topColor: MAT.alu,                         // the outer shell
        bottom: true, bottomColor: MAT.glass,      // edge-to-edge display glass
        behind: CHASSIS_BACK,                      // and sorts under the whole UI
      });

      const bx = w * 0.026, bt = D * 0.030, bc = D * 0.072;  // side / top / chin bezel
      const dw = w - bx * 2, dd = D - bt - bc;
      const zTop = lz - D / 2 + bt;
      /** A rectangle in display space: u across (-0.5…0.5), v down (0…1).
       *  Wound normal-down, which is toward the viewer once the lid is open;
       *  `lift` pushes a layer out of the glass toward the camera. */
      const scr = (u0: number, u2: number, v0: number, v2: number, lift: number,
                   c: ColorIn, op: FaceOpts = {}) =>
        b.quad(rect(x + ((u0 + u2) / 2) * dw, zTop + ((v0 + v2) / 2) * dd,
          (u2 - u0) * dw, (v2 - v0) * dd, 0)
          .map(p => [p[0], hy - lift, p[1]] as Vec3), c, op, null);

      const TOK = [
        mixc(A, MAT.white, 0.55),
        mixc(rgb('#B388FF'), MAT.white, 0.14),
        mixc(rgb('#7EE787'), MAT.white, 0.08),
        mixc(rgb('#FFCB6B'), MAT.white, 0.08),
        mixc(A, MAT.white, 0.04),
      ];

      // panes
      scr(-0.5, 0.5, 0, 1, 0.02, rgb('#070C18'),
        { emit: 0.30, pulse: 0.2, speed: 0.3, behind: BG_BACK });
      scr(-0.5, 0.5, 0, 0.050, 0.04, mixc(rgb('#0E1526'), A, 0.12),
        { emit: 0.44, behind: PANE_BACK });
      scr(-0.5, -0.305, 0.050, 0.715, 0.04, rgb('#0A1120'),
        { emit: 0.34, behind: PANE_BACK });
      scr(-0.305, 0.5, 0.050, 0.098, 0.04, rgb('#0B1222'),
        { emit: 0.38, behind: PANE_BACK });
      scr(-0.305, 0.5, 0.715, 1, 0.04, rgb('#04060C'),
        { emit: 0.22, behind: PANE_BACK });
      scr(-0.305, 0.5, 0.715, 0.722, 0.06, A, { emit: 0.7, alpha: 0.5 });

      // menu bar: the Apple mark, then a few menu titles
      b.glyph(x - 0.462 * dw, hy - 0.34, zTop + 0.025 * dd, LOGOS.APPLE,
        { size: dd * 0.038, color: mixc(A, MAT.white, 0.75), emit: 0.5, max: 260 });
      [0.10, 0.075, 0.09, 0.07].reduce((u, wd) => {
        scr(u, u + wd, 0.016, 0.034, 0.08, mixc(A, MAT.white, 0.35), { emit: 0.6, alpha: 0.8 });
        return u + wd + 0.028;
      }, -0.415);

      // the notch, and the camera inside it
      scr(-0.062, 0.062, 0, 0.040, 0.12, MAT.glass);
      scr(-0.010, 0.010, 0.014, 0.026, 0.14, mixc(A, MAT.white, 0.2), { emit: 0.5, alpha: 0.7 });

      // editor tabs — the third one is active
      [0, 1, 2].forEach(t => {
        const u = -0.288 + t * 0.155;
        scr(u, u + 0.135, 0.060, 0.078, 0.32,
          t === 2 ? mixc(A, MAT.white, 0.45) : mixc(A, MAT.dark, 0.55),
          { emit: t === 2 ? 0.8 : 0.4, alpha: t === 2 ? 0.95 : 0.55 });
        if (t === 2) scr(u, u + 0.135, 0.092, 0.098, 0.08, A, { emit: 1 });
      });

      // sidebar file tree
      for (let i = 0; i < 11; i++) {
        const v = 0.082 + i * 0.056;
        const on = i === 5;
        scr(-0.470, -0.470 + 0.09 + rnd(i * 3) * 0.11, v, v + 0.019, 0.32,
          on ? mixc(A, MAT.white, 0.5) : mixc(A, MAT.white, 0.02),
          { emit: on ? 0.85 : 0.42, alpha: on ? 1 : 0.6 });
      }

      // code — a gutter number, an indent, then a few syntax-coloured tokens
      for (let i = 0; i < 15; i++) {
        const v = 0.120 + i * 0.0385;
        if (v > 0.690) break;
        if (i === 6) scr(-0.300, 0.495, v - 0.006, v + 0.023, 0.06, A,
          { emit: 0.45, alpha: 0.10, behind: HILITE_BACK });
        scr(-0.288, -0.266, v, v + 0.016, 0.08, mixc(A, MAT.white, 0.1),
          { emit: 0.35, alpha: 0.45 });
        let u = -0.246 + [0, 0.032, 0.064, 0.096][Math.floor(rnd(i) * 4)];
        const n = 2 + Math.floor(rnd(i + 40) * 3);
        for (let t = 0; t < n; t++) {
          const wd = 0.045 + rnd(i * 7 + t * 13) * 0.155;
          if (u + wd > 0.470) break;
          scr(u, u + wd, v, v + 0.016, 0.08, TOK[Math.floor(rnd(i * 5 + t * 3 + 1) * TOK.length)],
            { emit: 0.78, alpha: 0.92 });
          u += wd + 0.021;
        }
        if (i === 6) scr(u, u + 0.008, v - 0.004, v + 0.021, 0.10, mixc(A, MAT.white, 0.8),
          { emit: 1, pulse: 0, speed: 2.6 });
      }

      // terminal pane
      for (let i = 0; i < 4; i++) {
        const v = 0.752 + i * 0.048;
        scr(-0.288, -0.288 + 0.07 + rnd(i + 90) * 0.36, v, v + 0.015, 0.32,
          mixc(A, MAT.white, i === 3 ? 0.45 : 0.12), { emit: 0.72, alpha: 0.85 });
      }
      scr(-0.288, -0.272, 0.944, 0.966, 0.08, mixc(A, MAT.white, 0.7),
        { emit: 1, pulse: 0, speed: 2.4 });
    });
  });

}

/** A five-star office chair, rolled clear of the desk. */
function chair(b: Builder, x: number, z: number, yaw: number) {
  const A = b.accent;
  b.group([x, 0, z], yaw, 0, () => {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.32;
      b.box(x + Math.cos(a) * 1.75, 0.22, z + Math.sin(a) * 1.75, 3.5, 0.10, 0.66,
        MAT.bodyLo, { rot: a });
      b.prism(ngon(x + Math.cos(a) * 3.3, z + Math.sin(a) * 3.3, 0.10, 6), 0, 0.5, MAT.dark);
    }
    b.box(x, 0.5, z, 0.75, 2.9, 0.75, MAT.metal);
    b.prism(roundRect(x, z, 4.8, 4.5, 0.95), 3.4, 4.05, MAT.bodyLo,
      { topColor: mixc(MAT.bodyLo, A, 0.10) });
    b.group([x, 3.7, z + 2.05], 0, 0.19, () => {
      // A mesh back, not a slab: two posts and a thin panel between them, so the
      // chair reads as furniture in the corner of frame rather than as a second
      // display parked behind the desk.
      ([-1, 1] as const).forEach(sd =>
        b.prism(roundRect(x + sd * 1.95, z + 2.15, 0.55, 0.5, 0.24), 3.7, 9.4, MAT.bodyLo,
          { topColor: MAT.metal }));
      b.prism(roundRect(x, z + 2.15, 4.4, 0.30, 0.15), 4.5, 9.1,
        mixc(MAT.dark, A, 0.05));
      b.prism(roundRect(x, z + 2.15, 4.4, 0.42, 0.20), 8.9, 9.4, MAT.bodyLo,
        { topColor: MAT.metal });
    });
  });
}

/* ------------------------------------------------------------ the scenes -- */

/** 1 — Base camp: the workstation this whole career runs out of.
 *
 *  Both of this island's camera poses sit on the -Z side, so the whole desk is
 *  laid out facing -Z: screen toward the lens, hinge and shelving away from it,
 *  chair rolled out of the sight line rather than parked in it. */
function sceneBasecamp(b: Builder) {
  const A = b.accent;
  const DT = 1.15;                                   // desk surface height
  const LZ = 1.9;                                    // the machine's z centre
  const PZ = -3.0;                                   // where the desk clutter lives

  /* --- the machine ---
     Island deck, desk top, palm rest and display glass are four near-parallel
     planes stacked within two units of each other, which is precisely the case
     a painter's algorithm gets wrong. Each declares a sort-depth bias instead
     of relying on how it happens to average out. */
  macbook(b, 0, DT, LZ, 10.6, { yaw: -0.04 });

  /* --- the desk, and the ground it stands on --- */
  const DESK_BACK = 9;                   // sorts under everything sitting on it
  b.prism(roundRect(0, 1.6, 24, 11.4, 0.9), DT - 0.36, DT, MAT.metal,
    { topColor: mixc(MAT.metal, MAT.white, 0.12), behind: DESK_BACK });
  island(b, 26, { motes: false });
  b.motes([0, 2, 4], 22, { n: 8, rise: 22, r: 0.42 });
  ([[-10.6, -3.1], [10.6, -3.1], [-10.6, 6.2], [10.6, 6.2]] as Vec2[]).forEach(p =>
    b.box(p[0], 0, p[1], 0.62, DT - 0.36, 0.62, MAT.bodyLo, { behind: DESK_BACK }));
  b.box(0, 0.24, 6.8, 22.6, DT - 0.62, 0.5, MAT.dark, { behind: DESK_BACK });
  b.box(0, DT - 0.40, -3.95, 23, 0.13, 0.3, A,
    { emit: 0.55, pulse: 1.1, speed: 0.5, behind: DESK_BACK });

  /* --- desk clutter, all of it in the band in front of the machine --- */
  b.prism(roundRect(7.4, PZ, 1.5, 2.4, 0.6), DT, DT + 0.42, MAT.aluLo,
    { topColor: MAT.alu });                                    // mouse
  b.prism(ngon(-7.6, PZ, 0.95, 12), DT, DT + 1.9, mixc(MAT.white, A, 0.22),
    { topColor: mixc(MAT.dark, A, 0.3) });                     // mug
  b.box(-6.65, DT + 1.1, PZ, 0.75, 0.14, 0.5, mixc(MAT.white, A, 0.22));
  b.prism(roundRect(-10.4, PZ, 1.5, 3.0, 0.08, -0.30), DT, DT + 0.14, MAT.glass);
  b.quad(rect(-10.4, PZ, 1.25, 2.7, -0.30).reverse()
    .map(p => [p[0], DT + 0.152, p[1]] as Vec3), mixc(A, MAT.white, 0.3),
    { emit: 0.8, pulse: 1.7, speed: 0.7 }, null);              // phone
  b.prism(roundRect(10.4, PZ, 2.6, 3.2, 0.22, 0.24), DT, DT + 0.34,
    mixc(MAT.body, MAT.white, 0.16),
    { topColor: mixc(MAT.body, MAT.white, 0.24) });            // notebook
  b.box(10.4, DT + 0.34, PZ, 2.1, 0.06, 0.14, A, { rot: 0.24, emit: 0.6, pulse: 2.2 });

  /* --- lamp: base down in the clutter band, arm reaching back over the deck -- */
  b.prism(ngon(-12.4, PZ, 1.05, 10), DT, DT + 0.3, MAT.metal);
  b.box(-12.4, DT + 0.3, PZ, 0.08, 7.0, 0.08, MAT.metal);
  b.box(-12.4, DT + 7.0, PZ + 1.7, 0.3, 0.3, 3.4, MAT.metal);
  b.box(-11.6, DT + 6.2, PZ + 3.4, 2.9, 0.85, 1.9, MAT.metal, { rot: 0.22 });
  b.quad(rect(-11.6, PZ + 3.4, 2.3, 1.3, 0.22).map(p => [p[0], DT + 6.18, p[1]] as Vec3),
    mixc(A, MAT.white, 0.62), { emit: 1 }, null);

  /* --- chair, rolled clear so it frames the shot instead of blocking it --- */
  chair(b, -16.5, -11.5, 2.2);

  /* --- shelving either side, kept out of the centre so the screen stays clear */
  ([-1, 1] as const).forEach(s => {
    const sx = s * 17.6;
    b.box(sx, 0, 10.6, 9.0, 1.0, 2.4, MAT.bodyLo);
    for (let k = 0; k < 3; k++) {
      const y = 2.2 + k * 3.1;
      b.box(sx, y, 10.6, 8.6, 0.42, 2.2, MAT.bodyLo, { topColor: MAT.metal });
      b.box(sx, y + 0.42, 9.6, 8.2, 0.12, 0.18, A, { emit: 0.75, pulse: k * 1.4 + s, speed: 0.5 });
      for (let j = 0; j < 5; j++) {                            // books
        const h = 1.5 + rnd(k * 9 + j + (s > 0 ? 31 : 0)) * 0.9;
        b.box(sx - 3.4 + j * 1.5 + rnd(j * 4 + k) * 0.3, y + 0.42, 10.6,
          0.5 + rnd(j + k * 3) * 0.5, h, 1.7,
          mixc(MAT.body, A, 0.05 + rnd(j * 2 + k * 5) * 0.22));
      }
    }
  });

  /* --- plants --- */
  ([[-22.5, 3.5], [22.5, 4.5]] as Vec2[]).forEach((p, i) => {
    b.prism(ngon(p[0], p[1], 1.6, 8), 0, 2.6, MAT.bodyLo, { topColor: MAT.dark });
    for (let k = 0; k < 6; k++) {
      b.box(p[0] + Math.sin(k * 2.2 + i) * 1.4, 2.6 + k * 0.95, p[1] + Math.cos(k * 1.7 + i) * 1.4,
        2.6 - k * 0.3, 1.0, 2.6 - k * 0.3, mixc(rgb('#2E6B57'), A, 0.12), { rot: k * 0.5 + i });
    }
  });

  // The "many tabs open" halo, as outlined frames rather than filled quads — a
  // floating solid rectangle just reads as untextured geometry, but a thin lit
  // border reads as a window. Arced high and turned toward the lens.
  for (let k = 0; k < 5; k++) {
    const t = (k - 2) / 2;                                     // -1 … 1
    const x = t * 17.0, z = 7.5 + Math.abs(t) * 3.0;
    const y = 16.2 - t * t * 2.2 + (k % 2) * 1.1;
    const yaw = Math.PI + t * 0.34;
    const w = 3.8, hh = 2.4, th = 0.17;
    const o = { emit: 0.85, alpha: 0.6, pulse: k * 1.3, speed: 0.45 };
    b.panel(x, y, z, w, th, yaw, A, o);                        // bottom edge
    b.panel(x, y + hh, z, w, th, yaw, A, o);                   // top edge
    b.panel(x + Math.cos(yaw) * w / 2, y, z - Math.sin(yaw) * w / 2, th, hh, yaw, A, o);
    b.panel(x - Math.cos(yaw) * w / 2, y, z + Math.sin(yaw) * w / 2, th, hh, yaw, A, o);
    b.panel(x, y + hh * 0.72, z, w, th * 0.8, yaw, A,          // title bar
      { emit: 0.6, alpha: 0.4, pulse: k * 1.3 + 1, speed: 0.45 });
  }

  b.label(0, 12.4, 5.5, 'ABDULLAH MURTAZA',
    { size: 15, color: mixc(A, MAT.white, 0.55), track: 0.22 });
  b.label(0, 10.7, 5.5, 'team lead · full-stack & ai',
    { size: 9, upper: false, mono: true, track: 0.14 });
  b.flow([-20, 0.5, -8.5], [20, 0.5, -8.5], { n: 4, speed: 0.22, r: 1.1 });
  return b;
}

/** 2 — The stack district: one tower per tool, height = how deep it goes. */
function sceneStack(b: Builder) {
  island(b, 31);
  const A = b.accent;
  // Each tower flies its tool's actual mark — real SVG artwork rather than a
  // box standing in for a logo, which is the difference between "a district"
  // and "a district you can read at a glance".
  const specs = [
    { n: 'React',        g: LOGOS.REACT,      x: -14.5, z: -8,   h: 27, w: 6.4, d: 6.4, c: '#1F3550' },
    { n: 'Next.js',      g: LOGOS.NEXTJS,     x: -5.5,  z: -12,  h: 33, w: 7.0, d: 7.0, c: '#161C30' },
    { n: 'TypeScript',   g: LOGOS.TYPESCRIPT, x: 4.5,   z: -9,   h: 25, w: 6.2, d: 6.2, c: '#1B2647' },
    { n: 'Node.js',      g: LOGOS.NODEJS,     x: 14,    z: -12,  h: 22, w: 6.6, d: 6.6, c: '#1A2E33' },
    { n: 'React Native', g: LOGOS.REACT,       x: -16,   z: 6,    h: 17, w: 6.0, d: 6.0, c: '#1F3550' },
    { n: 'Prisma',       g: LOGOS.PRISMA,     x: -6,    z: 8.5,  h: 20, w: 5.6, d: 5.6, c: '#20223E' },
    { n: 'Tailwind',     g: LOGOS.TAILWIND,   x: 4,     z: 7,    h: 15, w: 5.6, d: 5.6, c: '#17303E' },
    { n: 'MongoDB',      g: LOGOS.MONGODB,    x: 14.5,  z: 8,    h: 18, w: 6.0, d: 6.0, c: '#1B3327' },
  ];
  specs.forEach((s, i) => {
    tower(b, s.x, s.z, s.w, s.h, s.d, { color: s.c, rot: (i % 3 - 1) * 0.16, mast: 1.8 + (i % 3) });
    b.glyph(s.x, s.h + 6.6, s.z, s.g,
      { size: 4.0, color: mixc(A, MAT.white, 0.45), emit: 0.95, pulse: i * 0.8, speed: 0.5 });
    b.label(s.x, s.h + 12.6, s.z, s.n, { size: 11, track: 0.14 });
    // plinth
    b.box(s.x, 0.06, s.z, s.w + 2.6, 0.35, s.d + 2.6, mixc(MAT.deckTop, A, 0.16),
      { rot: (i % 3 - 1) * 0.16 });
  });

  // streets of light between the two rows
  b.box(0, 0.1, -1.5, 46, 0.14, 3.4, A, { emit: 0.55, pulse: 0.2, speed: 0.4 });
  b.flow([-22, 0.9, -1.5], [22, 0.9, -1.5], { n: 7, speed: 0.30, r: 1.2 });
  b.flow([22, 0.9, 1.6], [-22, 0.9, 1.6], { n: 5, speed: 0.24, r: 1.0, phase: 0.4 });

  // a data ring arcing over the district
  for (let k = 0; k < 34; k++) {
    const a = (k / 34) * TAU;
    b.box(Math.cos(a) * 27, 30 + Math.sin(a * 2) * 1.6, Math.sin(a) * 27, 1.3, 0.4, 1.3, A,
      { emit: 0.75, pulse: k * 0.4, speed: 1.0, rot: a });
  }
  b.label(0, 52, 0, 'THE STACK', { size: 13, color: mixc(A, MAT.white, 0.5), track: 0.3 });
  return b;
}

/** 3 — The climb: five Techloset titles as five ascending tiers. */
function sceneClimb(b: Builder) {
  island(b, 29);
  const A = b.accent;
  const tiers = [
    { t: 'Trainee Developer',    y: 'Aug 2023', r: 15.0, h: 3.4 },
    { t: 'Junior Developer',     y: 'Jan 2024', r: 12.6, h: 3.4 },
    { t: 'Software Engineer',    y: 'Feb 2025', r: 10.2, h: 3.4 },
    { t: 'Senior Engineer',      y: 'Feb 2026', r: 7.8,  h: 3.4 },
    { t: 'Team Lead',            y: 'Jul 2026', r: 5.4,  h: 4.2 },
  ];
  let y = 0;
  tiers.forEach((s, i) => {
    const k = i / (tiers.length - 1);
    const col = mixc(MAT.body, A, 0.06 + k * 0.22);
    b.prism(ngon(0, 0, s.r, 6, 0.52), y, y + s.h, col, { topColor: mixc(col, MAT.white, 0.10) });
    b.prism(ngon(0, 0, s.r + 0.42, 6, 0.52), y + s.h - 0.42, y + s.h - 0.04, A,
      { top: false, emit: 0.55 + k * 0.45, pulse: i * 1.2, speed: 0.55 + i * 0.12 });
    // the stair on the front face
    b.box(0, y, s.r * 0.86, 3.0, s.h, 2.6, MAT.bodyLo);
    b.label(s.r + 7.5, y + s.h * 0.55, 0, s.t, { size: 10.5 + k * 2, track: 0.12 });
    b.label(s.r + 7.5, y + s.h * 0.55 - 1.9, 0, s.y,
      { size: 7.5, mono: true, upper: false, color: mixc(A, MAT.white, 0.35) });
    y += s.h;
  });

  // the summit beacon + its halo
  b.box(0, y, 0, 2.2, 5.0, 2.2, MAT.metal);
  b.box(0, y + 5.0, 0, 3.4, 0.5, 3.4, MAT.metal);
  b.box(0, y + 5.5, 0, 2.4, 2.4, 2.4, mixc(A, MAT.white, 0.5), { emit: 1, pulse: 0, speed: 1.2 });
  b.orbit([0, y + 6.7, 0], 6.4, { n: 3, r: 1.9, speed: 0.42 });
  for (let k = 0; k < 26; k++) {
    const a = (k / 26) * TAU;
    b.box(Math.cos(a) * 10.5, y + 6.6, Math.sin(a) * 10.5, 0.9, 0.28, 0.9, A,
      { emit: 0.7, pulse: k * 0.5, speed: 0.9, rot: a });
  }

  // SEERAHT — where the training started
  b.box(-21, 0, 12, 7.0, 5.0, 6.0, MAT.bodyLo, { rot: 0.4 });
  b.box(-21, 5.0, 12, 7.6, 0.4, 6.6, MAT.metal, { rot: 0.4 });
  b.box(-21, 2.2, 12, 7.4, 0.3, 6.4, A, { rot: 0.4, emit: 0.6, pulse: 2.4, speed: 0.6 });
  b.label(-21, 8.4, 12, 'SEERAHT · 2023', { size: 8.5, mono: true, track: 0.14 });
  b.flow([-18.4, 2.4, 10.4], [-5.6, 2.0, 4.2], { n: 4, speed: 0.20, r: 0.9 });

  b.label(0, y + 12.5, 0, 'TECHLOSET', { size: 13, color: mixc(A, MAT.white, 0.5), track: 0.3 });
  return b;
}

/** 4 — The yard: one pavilion per shipped project, facades as billboards. */
function sceneWorks(b: Builder, ctx: SceneContext) {
  island(b, 33);
  const A = b.accent;
  const picks = ctx.projects.slice(0, 6);
  const R = 20;
  picks.forEach((p, i) => {
    const a = (i / picks.length) * TAU + 0.42;
    const x = Math.cos(a) * R, z = Math.sin(a) * R;
    const yaw = -a + Math.PI / 2;                   // facade turned toward the plaza
    const h = 9 + (i % 3) * 2.6;
    b.box(x, 0, z, 11, h, 8, MAT.body, { rot: yaw, topColor: mixc(MAT.body, MAT.metal, 0.45) });
    b.box(x, h, z, 11.8, 0.5, 8.8, MAT.metal, { rot: yaw });
    b.box(x, 0.06, z, 13.4, 0.3, 10.4, mixc(MAT.deckTop, A, 0.18), { rot: yaw });
    // the lit facade, facing inward
    const fx = x - Math.cos(a) * 4.1, fz = z - Math.sin(a) * 4.1;
    b.panel(fx, 1.6, fz, 9.0, h - 3.0, yaw + Math.PI, mixc(A, MAT.white, 0.18),
      { emit: 0.9, pulse: i * 1.5, speed: 0.6 + i * 0.1 });
    b.box(x, 0.7, z, 11.3, 0.26, 8.3, A, { rot: yaw, emit: 0.8, pulse: i, speed: 0.7 });
    b.label(fx - Math.cos(a) * 1.2, h + 3.2, fz - Math.sin(a) * 1.2, p.short || p.name,
      { size: 10.5, track: 0.12 });
  });

  // central plaza monument — the GitHub handle
  b.prism(ngon(0, 0, 7.4, 6, 0.5), 0.06, 1.2, mixc(MAT.deckTop, A, 0.22));
  b.prism(ngon(0, 0, 5.2, 6, 0.5), 1.2, 2.0, MAT.metal);
  b.box(0, 2.0, 0, 2.0, 9.5, 2.0, MAT.metal);
  b.box(0, 11.5, 0, 5.6, 0.6, 5.6, MAT.bodyLo);
  b.panel(0, 12.2, 0, 5.0, 3.0, 0, mixc(A, MAT.white, 0.4), { emit: 1, pulse: 0.5, speed: 0.5 });
  b.panel(0, 12.2, 0, 5.0, 3.0, Math.PI, mixc(A, MAT.white, 0.4), { emit: 1, pulse: 2.5, speed: 0.5 });
  b.glyph(0, 13.7, 0, LOGOS.GITHUB,
    { size: 3.2, color: mixc(A, MAT.white, 0.6), emit: 1, pulse: 0.5, speed: 0.5 });
  b.label(0, 19.2, 0, `github.com/${ctx.githubHandle}`,
    { size: 10, mono: true, upper: false, track: 0.1 });

  // traffic between the plaza and each pavilion
  picks.forEach((_p, i) => {
    const a = (i / picks.length) * TAU + 0.42;
    b.flow([Math.cos(a) * 7.6, 1.6, Math.sin(a) * 7.6],
           [Math.cos(a) * 15.4, 1.6, Math.sin(a) * 15.4],
      { n: 3, speed: 0.26 + i * 0.03, r: 0.95, phase: i * 0.2 });
  });
  b.label(0, 25, 0, 'SELECTED WORK', { size: 12.5, color: mixc(A, MAT.white, 0.5), track: 0.3 });
  return b;
}

/** 5 — The forge: racks, a CI/CD line, an LLM core, two clouds. */
function sceneForge(b: Builder) {
  island(b, 31);
  const A = b.accent;

  // server rows
  for (let row = 0; row < 2; row++) {
    const z = row === 0 ? -13 : 13;
    for (let i = 0; i < 7; i++) {
      const x = -18 + i * 6;
      b.box(x, 0, z, 4.4, 11, 5.4, MAT.bodyLo, { topColor: MAT.metal });
      for (let k = 0; k < 7; k++) {
        b.box(x, 1.0 + k * 1.45, z + (row === 0 ? 2.75 : -2.75), 3.6, 0.5, 0.16,
          k % 3 === 0 ? mixc(A, MAT.white, 0.4) : A,
          { emit: 0.9, pulse: (i * 7 + k) * 0.9, speed: 1.4 + (k % 4) * 0.5 });
      }
      b.box(x, 11, z, 4.8, 0.4, 5.8, MAT.metal);
    }
    b.box(0, 0.08, z, 46, 0.24, 7.2, mixc(MAT.deckTop, A, 0.12));
  }

  // the CI/CD line down the middle — packets actually travel it
  b.box(0, 0, 0, 44, 1.1, 4.2, MAT.metal, { topColor: mixc(MAT.metal, A, 0.18) });
  b.box(0, 1.1, 0, 43, 0.16, 3.4, A, { emit: 0.7, pulse: 0.3, speed: 0.5 });
  for (let i = 0; i < 9; i++) {
    b.box(-20 + i * 5, 1.26, 0, 1.6, 0.7, 1.6, mixc(MAT.white, A, 0.5),
      { emit: 0.85, pulse: i * 0.8, speed: 1.1, rot: 0.78 });
  }
  b.flow([-22, 2.4, 0], [22, 2.4, 0], { n: 9, speed: 0.42, r: 1.5, color: mixc(A, MAT.white, 0.5) });
  b.label(0, 4.6, -6.2, 'ci / cd', { size: 8.5, mono: true, upper: false, track: 0.2 });

  // the local-LLM core
  b.prism(ngon(0, 0, 7.0, 8, 0.4), 0.06, 1.4, MAT.metal);
  b.prism(ngon(0, 0, 5.4, 8, 0.4), 1.4, 3.0, MAT.bodyLo);
  b.prism(ngon(0, 0, 4.2, 8, 0.4), 3.0, 9.0, A, { emit: 0.78, pulse: 0, speed: 0.75 });
  b.prism(ngon(0, 0, 5.4, 8, 0.4), 9.0, 10.6, MAT.bodyLo);
  b.prism(ngon(0, 0, 7.0, 8, 0.4), 10.6, 11.4, MAT.metal);
  b.orbit([0, 6.2, 0], 9.6, { n: 4, r: 1.4, speed: 0.34 });
  b.orbit([0, 9.4, 0], 6.2, { n: 3, r: 1.0, speed: -0.5 });
  b.motes([0, 6, 0], 9, { n: 10, rise: 20, r: 0.7 });
  b.label(0, 17.4, 0, 'LOCAL LLM', { size: 11, track: 0.24, color: mixc(A, MAT.white, 0.5) });

  // AWS + Azure, floating off the deck and feeding the core
  ([['AWS', -25, 22, 0.5], ['AZURE', 25, 22, -0.5]] as [string, number, number, number][])
    .forEach(([n, x, yy, r]) => {
      b.box(x, yy, 0, 9, 2.6, 7, MAT.body, { rot: r, topColor: mixc(MAT.body, MAT.white, 0.12) });
      b.box(x, yy + 2.6, 0, 6, 1.8, 5, MAT.body, { rot: r });
      b.box(x, yy - 0.35, 0, 9.4, 0.4, 7.4, A, { rot: r, emit: 0.8, pulse: x, speed: 0.6 });
      b.label(x, yy + 6.4, 0, n, { size: 10.5, track: 0.22 });
      b.flow([x * 0.72, yy - 1, 0], [x * 0.08, 9.0, 0], { n: 4, speed: 0.3, r: 1.1 });
    });
  return b;
}

/** 6 — The signal: the contact beacon, and the end of the flight. */
function sceneSignal(b: Builder) {
  island(b, 26, { motes: false });
  b.motes([0, 2, 4], 22, { n: 8, rise: 22, r: 0.42 });
  const A = b.accent;

  // the tower, tapering in six stages
  let y = 0, r0 = 6.4;
  for (let i = 0; i < 6; i++) {
    const h = 6.4 - i * 0.4, r1 = r0 * 0.86;
    const col = mixc(MAT.body, A, 0.04 + i * 0.05);
    b.prism(ngon(0, 0, r0, 6, 0.52), y, y + h, col, { top: false });
    b.prism(ngon(0, 0, r0 + 0.4, 6, 0.52), y + h - 0.5, y + h - 0.1, A,
      { top: false, emit: 0.6 + i * 0.07, pulse: i * 1.1, speed: 0.6 + i * 0.1 });
    y += h; r0 = r1;
  }
  // the lamp room
  b.prism(ngon(0, 0, 5.0, 6, 0.52), y, y + 1.0, MAT.metal);
  b.prism(ngon(0, 0, 4.2, 6, 0.52), y + 1.0, y + 5.4, mixc(A, MAT.white, 0.45),
    { emit: 1, pulse: 0, speed: 0.55 });
  b.prism(ngon(0, 0, 5.4, 6, 0.52), y + 5.4, y + 6.2, MAT.metal);
  b.box(0, y + 6.2, 0, 0.4, 4.0, 0.4, MAT.metal);
  b.box(0, y + 10.2, 0, 1.2, 1.2, 1.2, mixc(A, MAT.white, 0.7), { emit: 1, pulse: 0, speed: 2.2 });

  // the sweeping beam, as orbiting lights at three radii
  b.orbit([0, y + 3.0, 0], 13, { n: 2, r: 2.6, speed: 0.30 });
  b.orbit([0, y + 3.0, 0], 19, { n: 2, r: 2.0, speed: 0.30 });
  b.orbit([0, y + 3.0, 0], 25, { n: 2, r: 1.5, speed: 0.30 });

  // three plinths — email, github, linkedin
  ([['EMAIL', LOGOS.GMAIL], ['GITHUB', LOGOS.GITHUB], ['LINKEDIN', LOGOS.LINKEDIN]] as const)
    .forEach(([m, g], i) => {
    const a = (i / 3) * TAU + Math.PI / 2;
    const x = Math.cos(a) * 17, z = Math.sin(a) * 17;
    b.box(x, 0, z, 5.4, 3.4, 5.4, MAT.bodyLo, { rot: -a });
    b.box(x, 3.4, z, 6.0, 0.4, 6.0, MAT.metal, { rot: -a, behind: 3 });
    b.box(x, 3.8, z, 4.8, 0.14, 4.8, mixc(A, MAT.white, 0.3),
      { rot: -a, emit: 0.95, pulse: i * 2, speed: 0.7 });
    b.glyph(x, 5.5, z, g,
      { size: 2.6, color: mixc(A, MAT.white, 0.75), emit: 1, pulse: i * 2, speed: 0.7 });
    b.label(x, 10.4, z, m, { size: 9.5, track: 0.18 });
    b.flow([x * 0.42, 2.0, z * 0.42], [x * 0.92, 2.6, z * 0.92],
      { n: 3, speed: 0.24, r: 0.9, phase: i * 0.3 });
  });

  // horizon rings
  for (let ring = 0; ring < 3; ring++) {
    const rr = 30 + ring * 7;
    for (let k = 0; k < 30; k++) {
      const a = (k / 30) * TAU;
      b.box(Math.cos(a) * rr, 1.4 + ring * 4.5, Math.sin(a) * rr, 1.0, 0.26, 1.0, A,
        { emit: 0.5, pulse: k * 0.4 + ring, speed: 0.8, rot: a, alpha: 0.85 });
    }
  }
  b.label(0, y + 15.5, 0, 'OPEN TO WORK', { size: 12, color: mixc(A, MAT.white, 0.55), track: 0.3 });
  return b;
}

export const BUILDERS = [
  sceneBasecamp, sceneStack, sceneClimb, sceneWorks, sceneForge, sceneSignal,
] as ((b: Builder, ctx: SceneContext) => Builder)[];

/* --------------------------------------------------- world map + camera -- */

export interface Pose { tx: number; ty: number; tz: number; d: number; yaw: number; pitch: number }
export interface Camera extends Pose { si: number; kind: 'dive' | 'conn' }

export interface Segment {
  kind: 'dive' | 'conn';
  si: number;
  /** Viewport-heights of scroll this segment occupies. */
  w: number;
  linger: number;
  a: Pose;
  b: Pose;
  /** Filled in by the engine's layout pass, in scroll pixels. */
  start: number;
  end: number;
}

/** Island positions on the world map, and the two camera poses each one owns:
 *  `approach` (high, outside, whole diorama in frame) and `interior` (low,
 *  close, inside the scene). Yaw varies per scene so no two dives feel alike. */
export const PLACES = [
  { at: [0, 0],     approach: { d: 76,  yaw: -0.62, pitch: 0.56, ty: 7 },  interior: { d: 23, yaw: -0.09, pitch: 0.23, ty: 5.2, tx: 0, tz: 1.8 } },
  { at: [168, -70], approach: { d: 106, yaw: 0.74,  pitch: 0.56, ty: 14 }, interior: { d: 50, yaw: 0.22,  pitch: 0.22, ty: 18,  tx: 0, tz: 0 } },
  { at: [352, 24],  approach: { d: 96,  yaw: -0.48, pitch: 0.60, ty: 10 }, interior: { d: 44, yaw: 0.55,  pitch: 0.24, ty: 13,  tx: 2, tz: 2 } },
  { at: [528, -78], approach: { d: 108, yaw: 0.66,  pitch: 0.62, ty: 10 }, interior: { d: 42, yaw: -0.34, pitch: 0.20, ty: 9,   tx: 0, tz: 0 } },
  { at: [712, 30],  approach: { d: 106, yaw: -0.70, pitch: 0.58, ty: 10 }, interior: { d: 45, yaw: 0.16,  pitch: 0.19, ty: 8,   tx: 0, tz: 0 } },
  { at: [880, -44], approach: { d: 100, yaw: 0.58,  pitch: 0.54, ty: 16 }, interior: { d: 56, yaw: -0.24, pitch: 0.26, ty: 22,  tx: 0, tz: 0 } },
] as const;

function poseApproach(i: number): Pose {
  const p = PLACES[i], a = p.approach;
  return { tx: p.at[0], ty: a.ty, tz: p.at[1], d: a.d, yaw: a.yaw, pitch: a.pitch };
}
function poseInterior(i: number): Pose {
  const p = PLACES[i], a = p.interior;
  return { tx: p.at[0] + a.tx, ty: a.ty, tz: p.at[1] + a.tz, d: a.d, yaw: a.yaw, pitch: a.pitch };
}

/** The segment chain. `w` is scroll-length in viewport heights — the engine
 *  reads it, exactly like diveScroll/connScroll in the reference engine. */
export function buildSegments(scenes: { scroll?: number; linger?: number }[]): Segment[] {
  const segs: Segment[] = [];
  for (let i = 0; i < PLACES.length; i++) {
    const sc = scenes[i] || {};
    segs.push({
      kind: 'dive', si: i, w: sc.scroll || 1.45, linger: sc.linger || 0,
      a: poseApproach(i), b: poseInterior(i), start: 0, end: 0,
    });
    if (i < PLACES.length - 1) {
      segs.push({
        kind: 'conn', si: i, w: 1.05, linger: 0,
        a: poseInterior(i), b: poseApproach(i + 1), start: 0, end: 0,
      });
    }
  }
  return segs;
}

/* sin²(πu), not sin(πu). Both are zero at u=0 and u=1 — so either keeps the
   camera's *position* continuous across a seam — but sin(πu) has its steepest
   slope exactly at the endpoints, which hands the next segment a sudden
   velocity. Position continuity without velocity continuity is precisely the
   seam stutter: no visible jump, but the camera visibly changes pace at the
   boundary. sin² is flat at both ends, so speed carries through the seam. */
const bump = (x: number) => { const s = Math.sin(x * Math.PI); return s * s; };

/** Camera pose at flight time T. Continuous across every seam: at an integer T
 *  both neighbouring segments evaluate to the same pose, because segment k's end
 *  pose IS segment k+1's start pose. */
export function cameraAt(segs: Segment[], T: number): Camera {
  const n = segs.length;
  let i = Math.floor(T);
  if (i < 0) i = 0;
  if (i > n - 1) i = n - 1;
  const u = clamp(T - i, 0, 1);
  const s = segs[i];
  const e = easeCam(u);

  const cam: Camera = {
    tx: lerp(s.a.tx, s.b.tx, e),
    ty: lerp(s.a.ty, s.b.ty, e),
    tz: lerp(s.a.tz, s.b.tz, e),
    d: lerp(s.a.d, s.b.d, e),
    yaw: lerp(s.a.yaw, s.b.yaw, e),
    pitch: lerp(s.a.pitch, s.b.pitch, e),
    si: s.si,
    kind: s.kind,
  };

  if (s.kind === 'conn') {
    // The aerial hop: rise up and out over the world, then descend. Kept modest —
    // far enough to read as "zoom out to the map", not so far that the islands
    // become specks in an empty frame.
    const arc = bump(u);
    cam.d += arc * 86;
    cam.ty += arc * 30;
    cam.pitch += arc * 0.20;
    cam.yaw += Math.sin(u * TAU) * (1 - Math.cos(u * TAU)) * 0.09;
  } else {
    // A dive banks slightly as it descends — a little roll-in personality.
    cam.yaw += bump(u) * 0.13;
  }
  return cam;
}
