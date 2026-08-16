import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app sits beside sibling projects that carry their own lockfiles, so
  // pin the workspace root instead of letting Next infer it from the parent.
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
};

export default nextConfig;
