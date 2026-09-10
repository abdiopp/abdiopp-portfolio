/* ============================================================================
   opengraph-image.tsx — the card every shared link renders.

   Previously the site declared twitter:card="summary_large_image" and then
   shipped no image at all, so a link pasted into Slack, LinkedIn or a DM came
   out as bare text with an empty image well. For a portfolio whose whole
   argument is visual, that was the worst possible place to lose.

   Drawn rather than screenshotted: the flight is a canvas, and satori has no
   canvas. What it does have is the palette — the six accents below are the six
   scene accents from lib/content.ts, in flight order, so the card is made of
   the same material as the thing it points at.
   ========================================================================== */

import { ImageResponse } from 'next/og';
import { person, scenes } from '@/lib/content';

export const alt = `${person.name} — ${person.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Space Grotesk to match the site's display face. Falls back to satori's
 *  default rather than failing the build if fonts.googleapis.com is unreachable. */
async function displayFont(weight: 500 | 700): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@${weight}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } },
    ).then(r => r.text());
    const url = css.match(/src:\s*url\((https:\/\/[^)]+)\)/)?.[1];
    if (!url) return null;
    return await fetch(url).then(r => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function Image() {
  const [bold, medium] = await Promise.all([displayFont(700), displayFont(500)]);

  const fonts = [
    bold && { name: 'Space Grotesk', data: bold, weight: 700 as const, style: 'normal' as const },
    medium && { name: 'Space Grotesk', data: medium, weight: 500 as const, style: 'normal' as const },
  ].filter(Boolean) as NonNullable<ConstructorParameters<typeof ImageResponse>[1]>['fonts'];

  const family = fonts?.length ? 'Space Grotesk' : 'sans-serif';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#05070F',
          backgroundImage:
            'radial-gradient(900px 500px at 88% 12%, rgba(34,211,238,0.16), rgba(5,7,15,0) 70%)',
          padding: '68px 76px',
          fontFamily: family,
          color: '#F4F8FC',
        }}
      >
        {/* Mark + wordmark, echoing the flight's fixed header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 22, height: 22, background: '#22D3EE' }} />
          <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: '0.16em', color: '#8FA3B8' }}>
            {person.short.toUpperCase()}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: '-0.035em',
              lineHeight: 1.02,
            }}
          >
            {person.name}
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 500,
              color: '#9FB2C6',
              marginTop: 22,
              letterSpacing: '-0.01em',
            }}
          >
            {person.role}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* One bar per scene, in the accents the flight actually uses */}
          <div style={{ display: 'flex', gap: 10 }}>
            {scenes.map(s => (
              <div key={s.id} style={{ width: 56, height: 6, background: s.accent }} />
            ))}
          </div>
          <div style={{ fontSize: 24, fontWeight: 500, color: '#6F8399', letterSpacing: '0.02em' }}>
            abdullahmurtaza.site
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
