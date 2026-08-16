/* ============================================================================
   Ground.tsx — everything below the flight.

   A server component. In the static build this content was assembled client-side
   from a data object, so a crawler saw an empty <main>; here the full profile —
   every role, every project blurb, the contact details — ships in the HTML.
   That is the single biggest practical win of the Next.js port.
   ========================================================================== */

import Reveal from './Reveal';
import {
  certifications, education, experience, person, projects, skillGroups, topSkills,
} from '@/lib/content';

function Section({ id, kicker, title, children }: {
  id: string; kicker: string; title: string; children: React.ReactNode;
}) {
  return (
    <section className="gs" id={id}>
      <div className="gs__head">
        <span className="gs__kicker">{kicker}</span>
        <h2 className="gs__title">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function Ground() {
  return (
    <main id="ground">
      <Reveal scope="#ground" />

      <Section id="about" kicker="About" title="The short version.">
        <div className="about">
          <p className="about__lede">{person.summary}</p>
          <dl className="about__facts">
            <div><dt>Now</dt><dd>Team Lead at Techloset</dd></div>
            <div><dt>Based in</dt><dd>{person.location}</dd></div>
            <div><dt>Focus</dt><dd>Full-stack · AI integration · Cloud DevOps</dd></div>
            <div><dt>Top skills</dt><dd>{topSkills.join(' · ')}</dd></div>
          </dl>
        </div>
      </Section>

      <Section id="experience" kicker="Experience" title="Three years, one steady climb.">
        <ol className="tl">
          {experience.map((e, i) => (
            <li key={`${e.org}-${e.role}-${i}`} className={'tl__item' + (e.current ? ' is-current' : '')}>
              <div className="tl__marker"><i /></div>
              <div className="tl__body">
                <div className="tl__meta">
                  <span className="tl__period">{e.period}</span>
                  {e.place && <span className="tl__place">{e.place}</span>}
                </div>
                <h3 className="tl__role">{e.role}<span className="tl__org">{e.org}</span></h3>
                {e.points.length > 0 && (
                  <ul className="tl__points">
                    {e.points.map((p, k) => <li key={k}>{p}</li>)}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="projects" kicker="Selected work" title="Public, running, and readable.">
        <div className="cards">
          {projects.map(p => (
            <article className="card" key={p.repo}>
              <div className="card__top">
                <h3 className="card__name">{p.name}</h3>
                <span className="card__repo">{p.repo}</span>
              </div>
              <p className="card__blurb">{p.blurb}</p>
              <ul className="card__tech">
                {p.tech.map(t => <li key={t}>{t}</li>)}
              </ul>
              <div className="card__links">
                {p.url
                  ? <a href={p.url} target="_blank" rel="noopener noreferrer">Source<i>↗</i></a>
                  : <span className="card__private">Private repository</span>}
                {p.live && <a href={p.live} target="_blank" rel="noopener noreferrer">Live<i>↗</i></a>}
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section id="skills" kicker="Toolkit" title="What I reach for.">
        <div className="skills">
          {skillGroups.map(g => (
            <div className="skills__group" key={g.title}>
              <h3>{g.title}</h3>
              <ul>{g.items.map(i => <li key={i}>{i}</li>)}</ul>
            </div>
          ))}
        </div>
      </Section>

      <Section id="education" kicker="Background" title="Where the fundamentals came from.">
        <div className="two">
          <div className="two__col">
            <h3 className="two__h">Education</h3>
            <ul className="plain">
              {education.map(e => (
                <li key={e.org}>
                  <strong>{e.org}</strong>
                  <span>{e.detail}</span>
                  <em>{e.period}</em>
                </li>
              ))}
            </ul>
          </div>
          <div className="two__col">
            <h3 className="two__h">Certifications</h3>
            <ul className="plain">
              {certifications.map(c => <li key={c}><strong>{c}</strong></li>)}
            </ul>
          </div>
        </div>
      </Section>

      <section className="gs gs--contact" id="contact">
        <div className="contact">
          <span className="gs__kicker">Contact</span>
          <h2 className="contact__title">Let’s build something.</h2>
          <p className="contact__body">
            Open to scalable product engineering, AI integration and platform
            architecture — contract or full-time.
          </p>
          <div className="contact__links">
            <a className="contact__primary" href={`mailto:${person.email}`}>{person.email}</a>
            <div className="contact__row">
              <a href={person.github} target="_blank" rel="noopener noreferrer">GitHub<i>↗</i></a>
              <a href={person.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn<i>↗</i></a>
              <a href={`tel:${person.phoneHref}`}>{person.phone}</a>
            </div>
          </div>
        </div>
        <footer className="foot">
          <span>© {new Date().getFullYear()} {person.name}</span>
          <span>{person.location}</span>
        </footer>
      </section>
    </main>
  );
}
