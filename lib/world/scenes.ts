/* ============================================================================
   world/scenes.ts — the six dioramas, the world map they sit on, and the camera
   path that flies between them.

   Segment chain (architecture B — dive + aerial connector):
       dive0, conn0, dive1, conn1, … dive5      → 11 segments for 6 scenes
       dive i : approach(i) → interior(i)          "descend into the scene"
       conn i : interior(i) → approach(i+1)        "pull up, glide over, arrive"
   ========================================================================== */

import {
  Builder, MAT, TAU, clamp, easeCam, island, lerp, mixc, ngon, rgb, tower,
  type Vec2, type Vec3,
} from './primitives';

/** What the scenes need from the content layer. Passed in rather than read off a
 *  global, so the world stays a pure module. */
export interface SceneContext {
  projects: { name: string; short: string }[];
  githubHandle: string;
}

/* ------------------------------------------------------------ the scenes -- */

/** 1 — Base camp: the workstation this whole career runs out of. */
function sceneBasecamp(b: Builder) {
  island(b, 23);
  const A = b.accent;

  // desk
  b.box(0, 0, -1, 20, 0.9, 8, MAT.metal, { topColor: mixc(MAT.metal, MAT.white, 0.10) });
  ([[-9, -4], [9, -4], [-9, 2], [9, 2]] as Vec2[]).forEach(p =>
    b.box(p[0], -0.1, p[1] - 1, 0.7, 4.6, 0.7, MAT.bodyLo));
  b.box(0, -3.6, -1, 20, 3.6, 8, MAT.dark, { top: false });
  b.box(0, 0.9, -1.2, 19, 0.12, 7.4, A, { emit: 0.5, pulse: 1.1, speed: 0.6 });

  // three monitors on risers, angled into a cockpit
  ([[-7.6, 0.42], [0, 0], [7.6, -0.42]] as Vec2[]).forEach((m, i) => {
    const x = m[0], yaw = m[1];
    b.box(x, 0.9, -2.6, 3.2, 0.7, 1.4, MAT.dark, { rot: yaw });
    b.box(x, 1.6, -2.6, 0.6, 1.5, 0.6, MAT.metal, { rot: yaw });
    b.box(x, 3.1, -2.6, 7.4, 4.6, 0.42, MAT.dark, { rot: yaw });
    b.panel(x, 3.35, -2.4, 6.8, 4.1, yaw, mixc(A, MAT.white, i === 1 ? 0.35 : 0.12),
      { emit: i === 1 ? 1 : 0.82, tilt: -0.06, pulse: i * 2.1, speed: 0.8 + i * 0.3 });
  });

  // keyboard, mouse, mug, notebook
  b.box(-0.4, 0.9, 1.6, 7.4, 0.32, 2.3, MAT.bodyLo);
  b.box(-0.4, 1.22, 1.6, 7.0, 0.06, 2.0, A, { emit: 0.55, pulse: 3.0, speed: 1.1 });
  b.box(5.2, 0.9, 1.7, 1.1, 0.4, 1.7, MAT.bodyLo);
  b.box(-7.4, 0.9, 1.4, 1.5, 1.9, 1.5, mixc(MAT.white, A, 0.25));
  b.box(8.4, 0.9, 1.2, 2.6, 0.3, 3.4, mixc(MAT.body, MAT.white, 0.14), { rot: 0.3 });

  // chair
  b.box(0, 0, 6.4, 4.2, 0.5, 4.0, MAT.bodyLo);
  b.box(0, 0.5, 6.4, 3.8, 0.9, 3.6, MAT.metal, { topColor: mixc(MAT.metal, A, 0.2) });
  b.box(0, 1.4, 8.2, 3.8, 5.2, 0.7, MAT.bodyLo);
  b.box(0, 1.4, 8.55, 3.0, 4.6, 0.14, A, { emit: 0.45, pulse: 0.6, speed: 0.5 });
  b.box(0, -0.6, 6.4, 0.6, 0.7, 0.6, MAT.dark);

  // desk lamp
  b.box(-10.5, 0.9, -2.2, 1.6, 0.4, 1.6, MAT.metal);
  b.box(-10.5, 1.3, -2.2, 0.34, 5.4, 0.34, MAT.metal);
  b.box(-9.6, 6.4, -2.2, 2.6, 0.9, 1.8, MAT.metal, { rot: -0.35 });
  b.box(-9.6, 6.3, -2.2, 2.0, 0.1, 1.3, mixc(A, MAT.white, 0.6), { emit: 1 });

  // plants + shelving, to make it a room rather than a prop
  ([[-16, 5], [15.5, 6]] as Vec2[]).forEach((p, i) => {
    b.box(p[0], 0, p[1], 2.6, 2.4, 2.6, MAT.bodyLo);
    for (let k = 0; k < 5; k++) {
      b.box(p[0] + Math.sin(k * 2.2) * 1.3, 2.4 + k * 0.85, p[1] + Math.cos(k * 1.7) * 1.3,
        2.2 - k * 0.28, 0.9, 2.2 - k * 0.28, mixc(rgb('#2E6B57'), A, 0.12), { rot: k * 0.5 + i });
    }
  });
  b.box(-17.5, 0, -6, 1.0, 11, 9, MAT.bodyLo);
  for (let k = 0; k < 4; k++) {
    b.box(-17.0, 2 + k * 2.4, -6, 0.4, 0.22, 8.4, A, { emit: 0.7, pulse: k * 1.4, speed: 0.6 });
  }

  // The "many tabs open" halo, as outlined frames rather than filled quads — a
  // floating solid rectangle just reads as untextured geometry, but a thin lit
  // border reads as a window.
  for (let k = 0; k < 5; k++) {
    const a = -1.15 + k * 0.575;
    const x = Math.cos(a) * 17.5, z = Math.sin(a) * 17.5 - 2;
    const y = 9.5 + Math.sin(k * 1.9) * 2.8, yaw = -a + Math.PI / 2;
    const w = 3.6, hh = 2.3, t = 0.16;
    const o = { emit: 0.85, alpha: 0.6, pulse: k * 1.3, speed: 0.45 };
    b.panel(x, y, z, w, t, yaw, A, o);                 // bottom edge
    b.panel(x, y + hh, z, w, t, yaw, A, o);            // top edge
    b.panel(x + Math.cos(yaw) * w / 2, y, z - Math.sin(yaw) * w / 2, t, hh, yaw, A, o);
    b.panel(x - Math.cos(yaw) * w / 2, y, z + Math.sin(yaw) * w / 2, t, hh, yaw, A, o);
    b.panel(x, y + hh * 0.72, z, w, t * 0.8, yaw, A,   // title bar
      { emit: 0.6, alpha: 0.4, pulse: k * 1.3 + 1, speed: 0.45 });
  }

  b.label(0, 10.4, -2.6, 'ABDULLAH MURTAZA', { size: 15, color: mixc(A, MAT.white, 0.55), track: 0.22 });
  b.label(0, 8.7, -2.6, 'team lead · full-stack & ai', { size: 9, upper: false, mono: true, track: 0.14 });
  b.flow([-19, 1.4, 8], [19, 1.4, 8], { n: 4, speed: 0.22, r: 1.1 });
  return b;
}

/** 2 — The stack district: one tower per tool, height = how deep it goes. */
function sceneStack(b: Builder) {
  island(b, 31);
  const A = b.accent;
  const specs = [
    { n: 'React',        x: -14.5, z: -8,   h: 27, w: 6.4, d: 6.4, c: '#1F3550' },
    { n: 'Next.js',      x: -5.5,  z: -12,  h: 33, w: 7.0, d: 7.0, c: '#161C30' },
    { n: 'TypeScript',   x: 4.5,   z: -9,   h: 25, w: 6.2, d: 6.2, c: '#1B2647' },
    { n: 'Node.js',      x: 14,    z: -12,  h: 22, w: 6.6, d: 6.6, c: '#1A2E33' },
    { n: 'React Native', x: -16,   z: 6,    h: 17, w: 6.0, d: 6.0, c: '#1F3550' },
    { n: 'Prisma',       x: -6,    z: 8.5,  h: 20, w: 5.6, d: 5.6, c: '#20223E' },
    { n: 'Tailwind',     x: 4,     z: 7,    h: 15, w: 5.6, d: 5.6, c: '#17303E' },
    { n: 'MongoDB',      x: 14.5,  z: 8,    h: 18, w: 6.0, d: 6.0, c: '#1B3327' },
  ];
  specs.forEach((s, i) => {
    tower(b, s.x, s.z, s.w, s.h, s.d, { color: s.c, rot: (i % 3 - 1) * 0.16, mast: 1.8 + (i % 3) });
    b.label(s.x, s.h + 5.6, s.z, s.n, { size: 11.5, track: 0.14 });
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
  b.label(0, 41, 0, 'THE STACK', { size: 13, color: mixc(A, MAT.white, 0.5), track: 0.3 });
  return b;
}

/** 3 — The climb: five Techloset titles as five ascending tiers. */
function sceneClimb(b: Builder) {
  island(b, 29);
  const A = b.accent;
  const tiers = [
    { t: 'Full-stack Developer', y: 'Aug 2023', r: 15.0, h: 3.4 },
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
  b.label(0, 17.4, 0, `github.com/${ctx.githubHandle}`,
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
  island(b, 26);
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
  ['EMAIL', 'GITHUB', 'LINKEDIN'].forEach((m, i) => {
    const a = (i / 3) * TAU + Math.PI / 2;
    const x = Math.cos(a) * 17, z = Math.sin(a) * 17;
    b.box(x, 0, z, 5.4, 3.4, 5.4, MAT.bodyLo, { rot: -a });
    b.box(x, 3.4, z, 6.0, 0.4, 6.0, MAT.metal, { rot: -a });
    b.panel(x, 4.2, z, 4.6, 2.8, -a + Math.PI / 2, mixc(A, MAT.white, 0.3),
      { emit: 0.95, pulse: i * 2, speed: 0.7 });
    b.label(x, 8.4, z, m, { size: 9.5, track: 0.18 });
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
  { at: [0, 0],     approach: { d: 82,  yaw: -0.62, pitch: 0.58, ty: 6 },  interior: { d: 30, yaw: -0.10, pitch: 0.17, ty: 5.4, tx: 0, tz: 1.5 } },
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
