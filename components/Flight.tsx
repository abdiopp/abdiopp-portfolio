'use client';

/* ============================================================================
   Flight.tsx — the scroll-scrubbed camera flight.

   React owns the markup (topbar, pinned copy, route rail, hint); the engine owns
   the maths and writes to these nodes imperatively. Only the active-scene index
   crosses back into React state, and that changes at most a handful of times per
   full scroll — a per-frame state update would re-render the tree 60 times a
   second for nothing.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from 'react';
import { mountFlight, type FlightHandle } from '@/lib/flight-engine';
import type { WorldFonts } from '@/lib/world/renderer';
import type { Project, Scene } from '@/lib/content';

const pad = (n: number) => String(n).padStart(2, '0');

interface Props {
  scenes: Scene[];
  projects: Project[];
  githubHandle: string;
  brand: string;
  cta: { label: string; href: string };
  /** Resolved family strings from next/font — ctx.font cannot take a class. */
  fonts: WorldFonts;
  hint?: string;
}

export default function Flight({
  scenes, projects, githubHandle, brand, cta, fonts, hint = 'scroll to fly in',
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const topbarRef = useRef<HTMLElement>(null);
  const copyRefs = useRef<(HTMLElement | null)[]>([]);
  const handleRef = useRef<FlightHandle | null>(null);

  const [active, setActive] = useState(0);

  useEffect(() => {
    const container = containerRef.current, canvas = canvasRef.current;
    const stage = stageRef.current, route = routeRef.current;
    const hintEl = hintRef.current, bar = barRef.current;
    const track = trackRef.current, topbar = topbarRef.current;
    if (!container || !canvas || !stage || !route || !hintEl || !bar || !track || !topbar) return;

    const handle = mountFlight(
      {
        container, canvas, stage, route, hint: hintEl,
        scrollbarFill: bar, track, topbar,
        copies: copyRefs.current.filter(Boolean) as HTMLElement[],
      },
      {
        scenes,
        context: { projects, githubHandle },
        fonts,
        onActiveChange: setActive,
      },
    );
    handleRef.current = handle;

    // Dev-only handle for the seam-QA harness, which needs to drive the camera
    // to an exact flight time with the animation clock frozen. Stripped from
    // production builds by the constant-folded NODE_ENV check.
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as { __flight?: FlightHandle }).__flight = handle;
    }

    // Strict Mode mounts effects twice in development; without this the second
    // mount would stack a duplicate rAF loop and listener set on top of the first.
    return () => {
      handle.destroy();
      handleRef.current = null;
      if (process.env.NODE_ENV !== 'production') {
        delete (window as unknown as { __flight?: FlightHandle }).__flight;
      }
    };
  }, [scenes, projects, githubHandle, fonts]);

  const jumpTo = useCallback((i: number) => handleRef.current?.jumpTo(i), []);

  return (
    <div className="fl" ref={containerRef}>
      <div className="fl-stage" ref={stageRef}>
        <canvas className="fl-canvas" ref={canvasRef} aria-hidden="true" />
      </div>

      <div className="fl-scrollbar"><span ref={barRef} /></div>

      <header className="fl-topbar" ref={topbarRef}>
        <a className="fl-brand" href="#top">
          <span className="fl-brand__mark" />
          <span className="fl-brand__name">{brand}</span>
        </a>
        <nav className="fl-nav" aria-label="Scenes">
          {scenes.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={'fl-nav__item' + (i === active ? ' is-active' : '')}
              aria-current={i === active ? 'true' : undefined}
              onClick={() => jumpTo(i)}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <a className="fl-topcta" href={cta.href}>{cta.label}</a>
      </header>

      <div className="fl-copylayer">
        {scenes.map((s, i) => (
          <article
            key={s.id}
            className="fl-copy"
            style={{ ['--accent' as string]: s.accent }}
            ref={n => { copyRefs.current[i] = n; }}
          >
            <span className="fl-copy__num">{pad(i + 1)} <i>/</i> {pad(scenes.length)}</span>
            <span className="fl-copy__eyebrow">{s.eyebrow}</span>
            {/* The first scene's title is the page's name, so it carries the only
                h1; the rest stay h2 under it. Styling keys off the class, not the
                tag, so the two render identically. */}
            {i === 0
              ? <h1 className="fl-copy__title">{s.title}</h1>
              : <h2 className="fl-copy__title">{s.title}</h2>}
            <p className="fl-copy__body">{s.body}</p>
            {s.tags.length > 0 && (
              <ul className="fl-copy__tags">
                {s.tags.map(t =>
                  typeof t === 'string'
                    ? <li key={t}>{t}</li>
                    : (
                      <li key={t.label}>
                        <a href={t.href} target="_blank" rel="noopener noreferrer">{t.label}</a>
                      </li>
                    )
                )}
              </ul>
            )}
            {s.cta && (
              <div className="fl-copy__cta">
                {s.cta.primary && (
                  <a className="fl-btn fl-btn--primary" href={s.cta.primary.href}>{s.cta.primary.label}</a>
                )}
                {s.cta.secondary && (
                  <a className="fl-btn fl-btn--ghost" href={s.cta.secondary.href}>{s.cta.secondary.label}</a>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="fl-route" ref={routeRef}>
        {scenes.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={'fl-route__dot' + (i === active ? ' is-active' : '')}
            style={{ ['--accent' as string]: s.accent }}
            aria-label={s.label}
            onClick={() => jumpTo(i)}
          >
            <span className="fl-route__label">{s.label}</span>
            <i />
          </button>
        ))}
      </div>

      <div className="fl-hint" ref={hintRef}><span>{hint}</span><i /></div>

      <div className="fl-track" ref={trackRef} />
    </div>
  );
}
