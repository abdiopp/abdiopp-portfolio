import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// Standing Google Meet rooms with access set to "Open", so anyone holding the
// link joins without knocking. One room per short path: swap a value here to
// repoint that path, add a key to mint another alias.
const MEET_ROOMS = {
  '/tea': 'https://meet.google.com/qjj-kqss-tcf',
  // Anchored to a recurring Calendar event titled "Meet Abdullah" rather than
  // a standalone code, so deleting that event would take this path down with
  // it. The weekly slot is just an anchor — the room answers at any hour.
  '/meet': 'https://meet.google.com/yjj-sbak-ofs',
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app sits beside sibling projects that carry their own lockfiles, so
  // pin the workspace root instead of letting Next infer it from the parent.
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
  redirects() {
    // Temporary (307) so browsers don't cache it — a room can be swapped
    // later without old visitors landing in a dead meeting.
    return Object.entries(MEET_ROOMS).map(([source, destination]) => ({
      source,
      destination,
      permanent: false,
    }));
  },
};

export default nextConfig;
