# Abdullah Murtaza — scroll-flight portfolio (Next.js)

A scroll-scrubbed camera flight through six dioramas, built with the **lets-scroll**
skill and ported to Next.js 16 (App Router, React 19, TypeScript strict).

Scroll drives a camera, not a scrollbar: it dives into each scene, pulls up and out,
and glides across the world to the next — one continuous flight, no cuts.

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm build && pnpm start
pnpm typecheck
```

> Use **pnpm**, not npm. On this machine npm 11.12 / Node 25 silently truncates large
> tarballs (`next` unpacked to 20 MB instead of ~198 MB, and the `@next/swc-darwin-arm64`
> native binary to 1 MB instead of 89 MB), which fails the build with a confusing
> "Turbopack is not supported on this platform". pnpm installs the same tree correctly.

---

## Layout

```
app/
  layout.tsx        metadata, fonts, <html>
  page.tsx          server component: JSON-LD + <Flight> + <Ground>
  fonts.ts          next/font — self-hosted, no external request
  globals.css       theme tokens + all chrome
components/
  Flight.tsx        'use client' — the flight's markup
  Ground.tsx        server component — the full profile
  Reveal.tsx        'use client' — one observer for the ground content
lib/
  content.ts        ← every fact and line of copy, typed
  flight-engine.ts  scroll → flight time; copy, rail, nav, pacing
  world/
    primitives.ts   math, palette, the geometry Builder
    scenes.ts       the six dioramas, the world map, the camera path
    renderer.ts     projection, painter's algorithm, bloom, labels
```

**To change any wording, a project, or a date, edit `lib/content.ts` only.**

---

## What the port changed, and what it deliberately didn't

The renderer and the scroll maths are a faithful port — same segment chain, same
`scroll`/`linger` pacing, same seam guarantees, verified by the same QA harness (below).
Three things genuinely improved, and one architectural rule was worth stating.

**The profile is now server-rendered.** In the static build the content below the flight
was assembled client-side from a data object, so a crawler saw an empty `<main>`. It is
now a React Server Component: the production HTML ships every role, every project blurb
and the contact details — 60 KB of real content — plus a JSON-LD `Person` block. This is
the single biggest practical win of the port.

**Fonts are self-hosted** through `next/font` instead of a render-blocking Google Fonts
`<link>`, which removes an external request and the swap-in shift. One wrinkle: the
canvas draws in-world signage with `ctx.font`, which needs a real family string and
cannot take a CSS class — so `page.tsx` passes `display.style.fontFamily` down to the
flight explicitly rather than hoping a CSS variable resolves.

**`window.CONTENT` is gone.** The old `sceneWorks` read the project list off a global,
which cannot work in a module graph and would have broken SSR. Scenes now take a
`SceneContext` parameter, so `lib/world/` is a pure module with no global or DOM
dependency at import time.

**The render loop never touches React state.** The engine writes opacity and transform
straight to the DOM nodes React rendered; only the active-scene index — which changes at
most a handful of times per full scroll — crosses back into `useState`. Routing 60 fps of
camera updates through the component tree would re-render everything for nothing. The
engine stays framework-agnostic in `lib/flight-engine.ts` for the same reason, and
returns a `destroy()` that React Strict Mode's double-mount depends on.

---

## The flight

Six scenes → eleven segments (`dive0, conn0, dive1 … dive5`).

| # | Scene | What's in the diorama |
|---|---|---|
| 1 | Base camp | the workstation — desk, three monitors, the tabs halo |
| 2 | The stack | one tower per tool, height = how deep the tool goes |
| 3 | The climb | five stacked tiers, one per Techloset title, + SEERAHT |
| 4 | The yard | a pavilion per shipped project, facades as billboards |
| 5 | The forge | server rows, a live CI/CD line, the local-LLM core, AWS + Azure |
| 6 | Signal | the contact beacon |

### Why the seams cannot pop

lets-scroll normally renders the flight as pre-rendered video, and its hardest rule is
that seams must be frame-identical, because two separate renders of "the same" diorama
never match. That failure mode does not exist here: the camera path is one continuous
function of flight time `T`, and segment *k*'s end pose **is** segment *k+1*'s start
pose — the same expression, not a re-render of it.

Position continuity is therefore free. Velocity continuity had to be earned: the first
version used `sin(πu)` for the connector's aerial arc, which is zero at both ends (so
position was continuous) but has its *steepest slope* exactly at the endpoints — so the
camera changed pace at every seam. That is the skill's "seam stutter" in subtle form.
The fix is `sin²(πu)`, flat at both ends. See `lib/world/scenes.ts → cameraAt`.

---

## QA results

Verified against this build in headless Chromium (1440×900, and an iPhone 13 profile so
the coarse-pointer paths actually engage), plus a real-Chrome pass for timing.

**Seam continuity** — measured with the animation clock frozen, so the diff isolates the
camera path rather than ambient motion:

- camera pose gap across all 10 seams: `8e-6` — floating-point noise
- velocity gap scales *linearly* with the probe step (0.255 → 2.55 → 25.8 as h goes
  1e-4 → 1e-3 → 1e-2), the signature of matched first derivatives; a real discontinuity
  would be step-independent. Only acceleration steps, against `d` moving ~156 units/unit-T.
- pixel delta over an identical ±0.004 step in flight time: seam `0.93–1.09` vs
  mid-segment `0.93–1.10`. **A seam is indistinguishable from ordinary camera motion.**

**Performance** — real Chrome, 90 renders: median **0.9 ms/frame**, p90 2.6 ms, worst
4.5 ms, roughly a 10× margin on a 60 fps budget. (Headless Chromium shows a ~1.4 s
outlier once per sweep; it reproduces with the bloom disabled and never occurs in real
Chrome, so it is a SwiftShader artifact.) The engine also drops quality once — never
per-frame, so it cannot oscillate — if it ever sees sustained slow frames.

**Also verified:** production build passes TypeScript strict; `/` prerenders statically;
zero console errors and no 4xx at either viewport; on a true touch profile a height-only
resize (the URL bar collapsing) leaves `scrollY` unchanged while a rotation correctly
relays the canvas out; the copy panel clears the bottom of a 664 px viewport by 80 px;
`prefers-reduced-motion` renders the world without smoothing or ambient animation and
reveals the ground content with no transitions.

`AGENTS.md` and `CLAUDE.md` are generated by Next 16 itself; disable with
`agentRules: false` in `next.config.mjs` if you don't want them.

---

## Deploying

Zero-config on Vercel — it is a stock App Router app with no runtime dependencies beyond
React. Set the real domain in `SITE` at the top of `app/layout.tsx` so the canonical URL
and OG tags point at it.
