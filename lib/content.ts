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
export interface Certification { name: string; issuer: string; date: string }

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
  site: 'https://www.abdullahmurtaza.site',
  summary:
    'Team lead and full-stack + AI engineer with nearly four years across engineering and ' +
    'cloud DevOps. Now leading a fully remote engineering team at Professional Ways, after ' +
    'rising through five titles at Techloset — intern to team lead running six engineers. ' +
    'I specialise in architecting scalable MERN ecosystems, enterprise-grade LMS platforms, ' +
    'and custom AI integrations involving local LLMs — with deployment lifecycles automated ' +
    'through CI/CD pipelines across AWS and Azure. I have delivered remotely for Swedish ' +
    'and US clients across a four- to ten-hour time difference, and I take models all the ' +
    'way onto the device when that is where they belong.',
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
    name: 'PoultryFast',
    repo: 'poultryfast-monorepo',
    blurb:
      'Lead developer on a five-service platform for poultry operations: an Express ' +
      'and PostgreSQL API backed by PL/pgSQL functions, an offline-first Expo app ' +
      'using TanStack Query persistence and network-aware sync, plus admin, web and ' +
      'marketing surfaces — with WhatsApp messaging and Arabic localisation.',
    tech: ['TypeScript', 'Expo', 'Express', 'PostgreSQL', 'PL/pgSQL'],
    short: 'PoultryFast',
  },
  {
    name: 'Atlas Bil',
    repo: 'atlasbil-next',
    live: 'https://atlasbil.se',
    blurb:
      'Rebuild of a Swedish car dealership’s site on Next.js 16 with a PostgreSQL ' +
      'backend — delivered remotely across a four-hour time difference.',
    tech: ['Next.js 16', 'TypeScript', 'PostgreSQL'],
    short: 'Atlas Bil',
  },
  {
    name: 'On-device Attendance Recognition',
    repo: 'FaceRecognitionApp',
    blurb:
      'Android app that registers a student once and then recognises them in real time ' +
      'through the phone camera. Runs FaceNet TensorFlow Lite models on-device for ' +
      '512-dimension embeddings, with mask detection and Firestore sync — shipped in ' +
      'both float and int8-quantized variants.',
    tech: ['Kotlin', 'TensorFlow Lite', 'FaceNet', 'Firestore'],
    short: 'Attendance AI',
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
    name: 'RKT Store',
    repo: 'RKT-Server',
    url: 'https://github.com/BaigInBinary/RKT-Server',
    blurb:
      'Full-stack e-commerce platform for premium tech accessories and gadgets, built ' +
      'for a fast and scalable shopping experience — modern storefront with a custom ' +
      'admin back office.',
    tech: ['Next.js', 'React', 'TypeScript'],
    short: 'RKT Store',
  },
  {
    name: 'ChemVault',
    repo: 'ChemVault',
    blurb:
      'Electronic lab notebook, chemical inventory (LIMS) and password-protected share ' +
      'portal for research teams, built on Next.js 16, Prisma 7 and PostgreSQL.',
    tech: ['Next.js 16', 'Prisma 7', 'PostgreSQL', 'TypeScript'],
    short: 'ChemVault',
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
    tags: ['Team Lead @ Professional Ways', 'Full-stack', 'AI engineering', 'Cloud DevOps'],
    scroll: 1.55, linger: 0.42,
  },
  {
    id: 'stack', label: 'The stack', accent: '#8B5CF6',
    eyebrow: 'What I build with',
    title: 'A stack I know down to the metal.',
    body:
      'React and Next.js at the front, Node and TypeScript behind it, Prisma over ' +
      'Postgres and Mongo, React Native or Flutter when it has to live in a pocket — ' +
      'Kotlin when the model has to run on the device itself, Rust when it has to be ' +
      'a real desktop app.',
    tags: ['React', 'Next.js', 'TypeScript', 'Node.js', 'React Native', 'Flutter', 'Kotlin', 'Rust'],
    scroll: 1.35, linger: 0.34,
  },
  {
    id: 'climb', label: 'The climb', accent: '#34D399',
    eyebrow: 'Techloset · 2023 → 2026',
    title: 'Five titles, three years.',
    body:
      'Intern in 2023. Junior developer in 2024. Software engineer in 2025. Senior in ' +
      'early 2026. Team lead by July, running six engineers. In November I took the ' +
      'same role — fully remote — at Professional Ways.',
    tags: ['Intern → Team Lead', 'Six engineers', 'Now remote'],
    scroll: 1.45, linger: 0.40,
  },
  {
    id: 'works', label: 'The yard', accent: '#F59E0B',
    eyebrow: 'Selected work',
    title: 'Things that are actually running.',
    body:
      'A Streamline-integrated cabin platform, an AI speed-to-quote agent, a Next.js ' +
      'rebuild for a Swedish dealership, on-device face recognition in Kotlin, a Rust ' +
      'download engine.',
    tags: ['Cabins', 'Quote agent', 'XDM Next', 'Try-on AI'].map(
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
    org: 'Professional Ways', role: 'Team Lead', period: 'Nov 2026 — Present',
    place: 'Pakistan · Remote', current: true,
    points: [
      'Leading the engineering team and its technical direction across mobile and full-stack delivery, fully remote from day one.',
      'Setting architecture and delivery standards for mobile application development, carrying forward the CI/CD and review practice built at Techloset.',
    ],
  },
  {
    org: 'Techloset', role: 'Team Lead', period: 'Jul 2026 — Nov 2026',
    place: 'Faisalabad',
    points: [
      'Led a team of six engineers and its technical direction across full-stack, mobile and AI workstreams.',
      'Directed technical architecture and infrastructure planning across concurrent client projects — enterprise LMS platforms, AI integrations and SaaS products.',
      'Oversaw deployment lifecycles delivered through CI/CD pipelines across AWS and Azure.',
      'Grew engineering leadership capacity and mentored developers across the stack.',
    ],
  },
  {
    org: 'Independent', role: 'Full-Stack & AI Engineer', period: 'May 2026 — Jun 2026',
    place: 'Remote',
    points: [
      'Built a two-stage virtual try-on backend between roles: FLUX.1-schnell generates the garment through Hugging Face Inference Providers, IDM-VTON performs the try-on through a Space Gradio API.',
      'Shipped it as a modular FastAPI core with a Next.js App Router dashboard — full commit history public.',
    ],
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
    place: 'Faisalabad, Punjab, Pakistan',
    points: [
      'Shipped MERN-stack client projects across the full development lifecycle, from requirements through production support.',
      'Named Problem Solver of the Year 2024 for turning critical technical blockers into shipped solutions.',
    ],
  },
  {
    org: 'Techloset', role: 'Full-Stack Developer (Internship)', period: 'Aug 2023 — Jan 2024',
    place: 'Faisalabad, Punjab, Pakistan · Remote',
    points: [
      'Built and shipped full-stack features for client projects, working remotely alongside the SEERAHT programme below.',
    ],
  },
  {
    org: 'SEERAHT', role: 'Intern', period: 'Feb 2023 — Jan 2024',
    place: 'Faisalabad',
    points: [
      'Hands-on training in full-stack development on real-world projects — JavaScript, React, Next.js, Node.js, databases, APIs and version control.',
      'Ran concurrently with the Techloset internship from August 2023.',
    ],
  },
];

export const skillGroups: SkillGroup[] = [
  { title: 'Frontend',       items: ['React', 'Next.js', 'TypeScript', 'React Native', 'Tailwind CSS', 'Redux'] },
  { title: 'Backend',        items: ['Node.js', 'Express', 'Prisma ORM', 'MongoDB', 'PostgreSQL', 'REST APIs'] },
  { title: 'Mobile & Desktop', items: ['React Native', 'Flutter', 'Android (Kotlin)', 'Rust', 'Tauri v2', 'Electron'] },
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
    detail: 'Modern web and mobile app development · Computer Software Engineering · Grade A',
    period: 'May 2021 — Jul 2023',
  },
];

export const certifications: Certification[] = [
  { name: 'Building with the Claude API', issuer: 'Anthropic', date: 'Aug 2026' },
  { name: 'Model Context Protocol: Advanced Topics', issuer: 'Anthropic', date: 'Aug 2026' },
  { name: 'Claude Code in Action', issuer: 'Anthropic', date: 'Aug 2026' },
  { name: 'Introduction to Subagents', issuer: 'Anthropic', date: 'Aug 2026' },
  { name: 'AI Fluency: Framework & Foundations', issuer: 'Anthropic', date: 'Aug 2026' },
];

/** LinkedIn's own "Top skills" block, kept in its order. */
export const topSkills: string[] = [
  'React Native',
  'Mobile Applications',
  'Next.js',
  'Node.js',
  'Web Technologies',
];
