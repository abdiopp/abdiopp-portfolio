import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// A standing Google Meet room with access set to "Open", so anyone with the
// link joins without knocking. Replace the code to point /tea elsewhere.
const MEET_URL = 'https://meet.google.com/qjj-kqss-tcf';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app sits beside sibling projects that carry their own lockfiles, so
  // pin the workspace root instead of letting Next infer it from the parent.
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
  redirects() {
    // Temporary (307) so browsers don't cache it — the room can be swapped
    // later without old visitors landing in a dead meeting.
    return [{ source: '/tea', destination: MEET_URL, permanent: false }];
  },
};

export default nextConfig;
