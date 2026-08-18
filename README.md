# DANVIC Admin Dashboard

This is a static export of the DANVIC administration interface. It keeps the same UI and browser-side business flows as `../admin-frontend`, but it has no application server: `npm run build` writes deployable files to `out/`.

## Configure and build

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_BACKEND_API_URL` to the public URL for `../backend` (for example, `https://api.example.com`).
2. Allow the dashboard's deployed origin in the backend's `CORS_ORIGINS` environment variable. This is required for credentialed browser requests.
3. Run `npm install`, then `npm run build`.
4. Deploy only the generated `out/` directory to any static host. Do not run `next start` or deploy a Node application server for this dashboard.

The static browser client calls the backend compatibility namespace at `/api/admin/*`; the backend maps that to its admin routes. Authentication remains cookie-based, so host the API over HTTPS in production and configure CORS for the static site origin. The included static-host `_headers` policy permits HTTPS API connections (and localhost for development); restrict `connect-src` to your exact API origin if your host supports environment-specific headers.

## Cloudflare Pages

Use the **Next.js (Static HTML Export)** preset, `npx next build` as the build command, and `out` as the build output directory. Do not use `@cloudflare/next-on-pages`: this dashboard uses Next.js static export and does not need the server/Workers adapter. Add `NEXT_PUBLIC_BACKEND_API_URL` and `NEXT_PUBLIC_DANVIC_APP=admin` as Pages build environment variables.
