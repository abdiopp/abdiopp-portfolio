/* ============================================================================
   content.ts — every fact and line of copy on the site, in one typed place.

   Sourced from Abdullah's LinkedIn export and the public github.com/abdiopp
   repositories. Nothing here is invented: project blurbs are condensed from each
   repo's own README.
   ========================================================================== */

export interface Person {
  name: string; short: string; role: string; location: string;
  email: string; phone: string; phoneHref: string;
  github: string; githubHandle: string; linkedin: string; site: string;
  summary: string;
}

export interface CtaLink { label: string; href: string }

/** A pill in a scene's copy panel — plain text, or a link out to a repo. */
export type Tag = string | { label: string; href: string };

export interface Scene {
  id: string;
  label: string;
  /** Drives the whole page's live accent while this scene is active. */
  accent: string;
  eyebrow: string;
  title: string;
  body: string;
  tags: Tag[];
  /** Viewport-heights of scroll spent on this scene's dive. */
  scroll: number;
  /** 0–1. Remaps time so the camera settles mid-scene, where the copy peaks. */
  linger: number;
  cta?: { primary?: CtaLink; secondary?: CtaLink };
}

export interface Role {
  org: string; role: string; period: string; place: string;
  current?: boolean; points: string[];
}

export interface Project {
  name: string; repo: string; live?: string;
  /** Omitted for private repos — the card shows a "Private repository" note instead. */
  url?: string;
  blurb: string; tech: string[];
  /** Short form used on the diorama pavilion in scene 4. */
  short: string;
}

export interface SkillGroup { title: string; items: string[] }
export interface School { org: string; detail: string; period: string }

export const person: Person = {
  name: 'Abdullah Murtaza',
  short: 'Abdullah',
  role: 'Team Lead · Full-Stack & AI Engineer',
  location: 'Faisalabad, Punjab, Pakistan',
  email: 'abdioppbtw@gmail.com',
  phone: '+92 330 9777119',
  phoneHref: '+923309777119',
  github: 'https://github.com/abdiopp',
  githubHandle: 'abdiopp',
  linkedin: 'https://www.linkedin.com/in/abdullah-murtaza-7bb409177',
  site: 'https://abdi-portfolio.web.app/',
  summary:
    'Senior software developer and top-rated freelancer with extensive experience in ' +
    'high-level full-stack engineering and cloud DevOps. I specialise in architecting ' +
    'scalable MERN ecosystems, enterprise-grade LMS platforms, and custom AI integrations ' +
    'involving local LLMs — with deployment lifecycles automated through CI/CD pipelines ' +
    'across AWS and Azure.',
};

export const projects: Project[] = [
  {
    name: 'Big Bear Cabins',
    repo: 'big-bear-cabins-next',
    url: 'https://github.com/abdiopp/big-bear-cabins-next',
    live: 'https://bigbearcabins.com/',
    blurb:
      'Cabin rental platform on Next.js, wired to the exclusive Streamline API so ' +
      'property management, reservations and live availability stay in sync.',
    tech: ['Next.js', 'TypeScript', 'Streamline API'],
    short: 'Cabins',
  },
  {
    name: 'Greenscape Speed-to-Quote',
    repo: 'greenscape-speed-to-quote',
    url: 'https://github.com/abdiopp/greenscape-speed-to-quote',
    live: 'https://greenscape-speed-to-quote.vercel.app',
    blurb:
      'An AI agent that owns the whole lead clock: lead in → qualified by SMS in ' +
      'seconds → priced draft out → approval → proposal, Stripe deposit link and ' +
      'CRM write-back. Runs on two secrets; every other integration degrades to a ' +
      'recorded mock.',
    tech: ['TypeScript', 'Claude API', 'Stripe', 'Postgres'],
    short: 'Quote agent',
  },
  {
    name: 'Virtual Try-On AI',
    repo: 'virtual-tryon-ai-mvp',
    url: 'https://github.com/abdiopp/virtual-tryon-ai-mvp',
    blurb:
      'Two-stage try-on backend: FLUX.1-schnell generates the garment through ' +
      'Hugging Face Inference Providers, IDM-VTON does the try-on through a Space ' +
      'Gradio API. Modular FastAPI core with a Next.js App Router dashboard.',
    tech: ['Python', 'FastAPI', 'Hugging Face', 'Next.js'],
    short: 'Try-on AI',
  },
  {
    name: 'XDM Next',
    repo: 'downloader-rust',
    url: 'https://github.com/abdiopp/downloader-rust',
    blurb:
      'A modern download manager for macOS and Windows. Rust engine doing ' +
      'multi-connection segmented HTTP downloads, yt-dlp + ffmpeg for 1000+ ' +
      'streaming sites, BitTorrent via librqbit, and a Chrome extension that ' +
      'captures downloads over a local bridge.',
    tech: ['Rust', 'Tauri v2', 'React', 'Tailwind'],
    short: 'XDM Next',
  },
  {
    name: 'App Cycler',
    repo: 'auto-cycler',
    url: 'https://github.com/abdiopp/auto-cycler',
    blurb:
      'Desktop app that rotates focus through the windows you pick and steps through ' +
      'each one’s tabs on a timer. Built for wall displays, NOC screens and demo ' +
      'loops — all configured in the GUI, with a global kill-switch hotkey.',
    tech: ['Python', 'macOS', 'Windows'],
    short: 'App Cycler',
  },
  {
    name: 'Attendance Management System',
    repo: 'ams-backend · private',
    blurb:
      'REST API running class attendance end to end — teachers, students, weekly ' +
      'timetables and per-session registers keyed by a composite event id, so a class ' +
      'can be marked and re-marked without ever duplicating a register. Ships an ' +
      'image-to-timetable import that reads a photographed timetable straight into ' +
      'structured slots.',
    tech: ['Node.js', 'Express', 'MongoDB', 'JWT', 'Gemini'],
    short: 'AMS',
  },
];

/** Repos the yard scene links out to, keyed by the pill label. Private projects
 *  have no url and simply never appear as a linked pill. */
const repoByShort = new Map(
  projects.filter(p => p.url).map(p => [p.short, p.url as string])
);

export const scenes: Scene[] = [
  {
    id: 'basecamp', label: 'Base camp', accent: '#22D3EE',
    eyebrow: 'Faisalabad · Pakistan',
    title: 'Abdullah Murtaza',
    body:
      'Team lead and full-stack + AI engineer. I architect MERN ecosystems, ' +
      'enterprise LMS platforms and local-LLM integrations — then ship them ' +
      'through CI/CD across AWS and Azure.',
    tags: ['Team Lead @ Techloset', 'Full-stack', 'AI engineering', 'Cloud DevOps'],
    scroll: 1.55, linger: 0.42,
  },
  {
    id: 'stack', label: 'The stack', accent: '#8B5CF6',
    eyebrow: 'What I build with',
    title: 'A stack I know down to the metal.',
    body:
      'React and Next.js at the front, Node and TypeScript behind it, Prisma over ' +
      'Postgres and Mongo, React Native when it has to live in a pocket.',
    tags: ['React', 'Next.js', 'TypeScript', 'Node.js', 'React Native', 'Prisma', 'Tailwind', 'MongoDB'],
    scroll: 1.35, linger: 0.34,
  },
  {
    id: 'climb', label: 'The climb', accent: '#34D399',
    eyebrow: 'Techloset · 2023 → now',
    title: 'Five titles, one company.',
    body:
      'Full-stack developer in 2023. Junior developer in 2024. Software engineer in ' +
      '2025. Senior in early 2026. Team lead since July. The scope grew with the title.',
    tags: ['Full-stack Dev → Team Lead', 'Enterprise LMS', 'Building leadership teams'],
    scroll: 1.45, linger: 0.40,
  },
  {
    id: 'works', label: 'The yard', accent: '#F59E0B',
    eyebrow: 'Selected work',
    title: 'Things that are actually running.',
    body:
      'A Streamline-integrated cabin platform, an AI speed-to-quote agent, a two-stage ' +
      'virtual try-on backend, a Rust download engine. All public, all on GitHub.',
    tags: ['Cabins', 'Quote agent', 'Try-on AI', 'XDM Next'].map(
      label => ({ label, href: repoByShort.get(label)! })
    ),
    scroll: 1.6, linger: 0.46,
  },
  {
    id: 'forge', label: 'The forge', accent: '#FB7185',
    eyebrow: 'AI & cloud',
    title: 'Local models. Pipelines that run themselves.',
    body:
      'Integrated and fine-tuned local LLMs for offline-first, client-controlled AI ' +
      'workflows — and the CI/CD that deploys them across AWS and Azure without a ' +
      'human in the loop.',
    tags: ['Local LLMs', 'CI/CD', 'AWS', 'Azure', 'Observability'],
    scroll: 1.45, linger: 0.40,
  },
  {
    id: 'signal', label: 'Signal', accent: '#60A5FA',
    eyebrow: 'The line is open',
    title: 'Let’s build something.',
    body:
      'Available for scalable product engineering, AI integration and platform ' +
      'architecture — contract or full-time.',
    tags: [],
    scroll: 1.7, linger: 0.30,
    cta: {
      primary: { label: 'Start a conversation', href: `mailto:${person.email}` },
      secondary: { label: 'See the full profile', href: '#ground' },
    },
  },
];

export const experience: Role[] = [
  {
    org: 'Techloset', role: 'Team Lead', period: 'Jul 2026 — Present',
    place: 'Faisalabad', current: true,
    points: ['Leading the engineering team and its technical direction.'],
  },
  {
    org: 'Techloset', role: 'Senior Software Engineer', period: 'Feb 2026 — Apr 2026',
    place: 'Faisalabad',
    points: [
      'Delivered enterprise-grade full-stack, mobile, AI, DevOps and systems-integration solutions across SaaS, hospitality, education, ordering and automation platforms.',
      'Orchestrated a complex integration for Big Bear Cabins using the exclusive Streamline API to synchronise property management, reservation and availability data.',
      'Engineered and maintained automated CI/CD pipelines to streamline deployments across AWS and Azure environments.',
      'Architected and deployed large-scale Learning Management Systems featuring complex user hierarchies, secure video delivery and backend workflow automation.',
      'Integrated and fine-tuned local Large Language Models to enable offline-first AI capabilities and client-controlled AI workflows.',
      'Delivered high-impact projects involving sensitive intellectual property under strict confidentiality and security requirements.',
      'Led technical architecture, infrastructure planning and cloud deployment strategy for enterprise-level web and mobile applications.',
      'Optimised backend performance, database interaction patterns and developer workflows using modern ORMs such as Prisma.',
      'Improved production reliability through enhanced observability, maintainable service architecture and disciplined deployment practices.',
    ],
  },
  {
    org: 'Techloset', role: 'Software Engineer', period: 'Feb 2025 — Jan 2026',
    place: 'Faisalabad',
    points: [
      'Developed dynamic and responsive systems using the MERN stack, TypeScript and Tailwind CSS.',
      'Translated complex business requirements into scalable technical solutions across frontend, backend and cloud layers.',
      'Collaborated with product and engineering teams to ship maintainable software features in production environments.',
    ],
  },
  {
    org: 'Techloset', role: 'Junior Developer', period: 'Jan 2024 — Feb 2025',
    place: 'Faisalabad, Punjab, Pakistan', points: [],
  },
  {
    org: 'Techloset', role: 'Full-stack Developer', period: 'Aug 2023 — Jan 2024',
    place: 'Faisalabad, Punjab, Pakistan', points: [],
  },
  {
    org: 'SEERAHT', role: 'Intern', period: 'Feb 2023 — Jan 2024',
    place: 'Faisalabad',
    points: [
      'Completed hands-on training in full-stack development, working on real-world projects and strengthening JavaScript, React, Next.js, Node.js, databases, APIs and version control.',
    ],
  },
];

export const skillGroups: SkillGroup[] = [
  { title: 'Frontend',       items: ['React', 'Next.js', 'TypeScript', 'React Native', 'Tailwind CSS', 'Redux'] },
  { title: 'Backend',        items: ['Node.js', 'Express', 'Prisma ORM', 'MongoDB', 'PostgreSQL', 'REST APIs'] },
  { title: 'AI',             items: ['Local LLMs', 'LLM fine-tuning', 'Claude API', 'Hugging Face', 'FastAPI'] },
  { title: 'Cloud & DevOps', items: ['AWS', 'Azure', 'CI/CD pipelines', 'Observability', 'Vercel'] },
  { title: 'Leadership',     items: ['Building leadership teams', 'Technical architecture', 'Infrastructure planning'] },
];

export const education: School[] = [
  {
    org: 'Virtual University of Pakistan',
    detail: 'Bachelor of Science, Computer Science',
    period: '2022 — 2026',
  },
  {
    org: 'Saylani Mass I.T Training (S.M.I.T)',
    detail: 'Modern web and mobile app development · Computer Software Engineering',
    period: 'May 2021 — Jul 2023',
  },
];

export const certifications: string[] = [
  'AI Capabilities and Limitations',
  'Claude Code 101',
];

export const topSkills: string[] = [
  'Building Leadership Teams',
  'Prisma ORM',
  'Mobile Application Development',
];
