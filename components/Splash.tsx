'use client';

/* ============================================================================
   Splash.tsx — the first-visit door.

   Lifted from the split-door splash in abdiopp/digital-design-studio: two halves
   of a curtain part to reveal the page, wordmark scaling in over them, a line
   rising underneath. Same job here, plus one sentence of reassurance — dropping
   somebody into a scroll-driven canvas flight unannounced invites the wrong
   first thought about what it is going to cost their machine.

   It opens on its own like the original did. No button: a line this short is
   read well inside the hold, and asking for a click to dismiss one sentence
   would make more of it than it is.

   Visibility is decided before paint by `splashBoot` in the layout, not in here:
   React mounts far too late to stop a returning visitor catching a frame of it.
   CSS keeps `.sp` display:none until <html data-splash="new"> says otherwise —
   which also means a browser with JS off is never left behind a curtain it has
   no way to open.
   ========================================================================== */

import { useEffect, useRef, useState } from 'react';

const KEY = 'am.splash.v1';

/**
 * Runs synchronously as the first child of <body>, ahead of any paint.
 *
 * A blocked localStorage (private windows, storage switched off) resolves to
 * "seen": there would be no way to remember the visit, and re-introducing the
 * site every single time is worse than introducing it once.
 */
export const splashBoot =
  'try{document.documentElement.dataset.splash=' +
  `localStorage.getItem(${JSON.stringify(KEY)})?"seen":"new"}` +
  'catch(e){document.documentElement.dataset.splash="seen"}';

/** Copy has finished rising by ~1.3s; the rest is reading room. */
const HOLD_MS = 2200;
/** Doors part over ~1s. Reduced motion cuts both waits down. */
const LEAVE_MS = 1060;

interface Props {
  brand: string;
  role: string;
}

export default function Splash({ brand, role }: Props) {
  const closingRef = useRef(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // Returning visitor: the boot script already left this hidden, so drop the
    // markup rather than keep a curtain nobody can see sitting in the tree.
    if (document.documentElement.dataset.splash !== 'new') { setGone(true); return; }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let doors = 0;

    const open = () => {
      if (closingRef.current) return;
      closingRef.current = true;
      try { localStorage.setItem(KEY, '1'); } catch { /* nothing to remember it with */ }
      setLeaving(true);

      doors = window.setTimeout(() => {
        // Flipping the attribute is what releases the scroll lock, so it has to
        // wait for the doors — unlocking mid-animation lets a stray wheel event
        // scrub the flight behind a curtain that is still closed.
        document.documentElement.dataset.splash = 'seen';
        setGone(true);
      }, reduce ? 60 : LEAVE_MS);
    };

    const hold = window.setTimeout(open, reduce ? 1500 : HOLD_MS);

    // Unadvertised, because there is nothing here worth reading twice: anyone
    // who has taken the sentence in can move on rather than wait out the hold.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') open(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', open);

    return () => {
      clearTimeout(hold);
      clearTimeout(doors);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', open);
    };
  }, []);

  if (gone) return null;

  return (
    <div className={'sp' + (leaving ? ' is-leaving' : '')}>
      <div className="sp-door sp-door--top" aria-hidden="true" />
      <div className="sp-door sp-door--bottom" aria-hidden="true" />

      <div className="sp-inner">
        <div className="sp-brand">
          <span className="sp-brand__mark" />
          <span className="sp-brand__name">{brand}</span>
        </div>
        <p className="sp-tagline sp-rise" style={{ ['--d' as string]: '520ms' }}>{role}</p>
        <p className="sp-line sp-rise" style={{ ['--d' as string]: '760ms' }}>
          Yes, it animates — a single canvas, tuned to run light. Your machine will be fine.
        </p>
      </div>
    </div>
  );
}
