'use client';

/* ============================================================================
   Reveal.tsx — the only client-side piece of the ground content.

   One observer for the whole section rather than one component per item: the
   profile below the flight stays a server component (so its text ships in the
   HTML and crawlers can read it), and this just attaches the reveal behaviour to
   what the server already rendered.
   ========================================================================== */

import { useEffect } from 'react';

const SELECTOR = '.gs__head, .about, .tl__item, .card, .skills__group, .two__col, .contact, .foot';

export default function Reveal({ scope }: { scope: string }) {
  useEffect(() => {
    const host = document.querySelector(scope);
    if (!host) return;
    const bits = Array.from(host.querySelectorAll<HTMLElement>(SELECTOR));

    if (!('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      bits.forEach(b => b.classList.add('in'));
      return;
    }

    bits.forEach((b, i) => {
      b.classList.add('rv');
      b.style.setProperty('--d', `${(i % 6) * 55}ms`);
    });

    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    bits.forEach(b => io.observe(b));
    return () => io.disconnect();
  }, [scope]);

  return null;
}
