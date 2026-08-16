/* Self-hosted via next/font — no external request, no layout shift. Shared by
   the layout (which mounts the CSS variables) and the page (which hands the
   resolved family strings to the canvas, since ctx.font cannot take a class). */

import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';

export const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-display',
  display: 'swap',
});

export const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

export const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});
