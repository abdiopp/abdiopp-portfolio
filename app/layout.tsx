import type { Metadata, Viewport } from 'next';
import Splash, { splashBoot } from '@/components/Splash';
import { person } from '@/lib/content';
import { body, display, mono } from './fonts';
import './globals.css';

const SITE = 'https://www.abdullahmurtaza.site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: `${person.name} — ${person.role}`,
    template: `%s — ${person.name}`,
  },
  description:
    'Team lead and full-stack + AI engineer in Faisalabad, Pakistan. MERN ecosystems, ' +
    'enterprise LMS platforms, local-LLM integration and CI/CD across AWS and Azure.',
  authors: [{ name: person.name, url: person.github }],
  creator: person.name,
  keywords: [
    'Abdullah Murtaza', 'full-stack engineer', 'AI engineer', 'React', 'Next.js',
    'Node.js', 'React Native', 'Prisma', 'AWS', 'Azure', 'local LLM', 'Pakistan',
  ],
  openGraph: {
    type: 'website',
    url: SITE,
    title: `${person.name} — ${person.role}`,
    description: 'Scroll to fly through the work: the stack, the climb, the projects, the pipelines.',
    siteName: person.name,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${person.name} — ${person.role}`,
    description: 'Scroll to fly through the work: the stack, the climb, the projects, the pipelines.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE },
};

export const viewport: Viewport = {
  themeColor: '#05070F',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',   // so the safe-area insets the copy relies on resolve
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        {/* First thing in the body so it settles whether the splash opens before
            anything paints — React hydrates far too late to make that call. */}
        <script dangerouslySetInnerHTML={{ __html: splashBoot }} />
        <Splash brand={person.short} role={person.role} />
        {children}
      </body>
    </html>
  );
}
