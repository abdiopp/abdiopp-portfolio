import Flight from '@/components/Flight';
import Ground from '@/components/Ground';
import { person, projects, scenes } from '@/lib/content';
import { display, mono } from './fonts';

/* JSON-LD so the profile is machine-readable, not just crawlable prose. */
function StructuredData() {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    jobTitle: 'Team Lead, Full-Stack & AI Engineer',
    email: `mailto:${person.email}`,
    telephone: person.phone,
    url: person.site,
    sameAs: [person.github, person.linkedin],
    address: { '@type': 'PostalAddress', addressLocality: 'Faisalabad', addressRegion: 'Punjab', addressCountry: 'PK' },
    worksFor: { '@type': 'Organization', name: 'Techloset' },
    alumniOf: [
      { '@type': 'CollegeOrUniversity', name: 'Virtual University of Pakistan' },
      { '@type': 'EducationalOrganization', name: 'Saylani Mass I.T Training (S.M.I.T)' },
    ],
    knowsAbout: [
      'React', 'Next.js', 'TypeScript', 'Node.js', 'React Native', 'Prisma',
      'MongoDB', 'PostgreSQL', 'AWS', 'Azure', 'CI/CD', 'Local LLMs',
    ],
  };
  return (
    <script
      type="application/ld+json"
      // Static, author-controlled object — no user input reaches this string.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

export default function Page() {
  return (
    <>
      <StructuredData />
      <a className="skip" href="#ground">Skip the flight, go to the profile</a>
      <span id="top" />

      <Flight
        scenes={scenes}
        projects={projects}
        githubHandle={person.githubHandle}
        brand={person.short}
        cta={{ label: 'Get in touch', href: '#contact' }}
        fonts={{ display: display.style.fontFamily, mono: mono.style.fontFamily }}
      />

      <Ground />
    </>
  );
}
