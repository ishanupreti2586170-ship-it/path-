# The Career Oracle (truepathcareer.com)

## Project Overview
A deterministic psychometric career assessment web app. Users take a science-backed
test (Big Five personality, Holland Code / RIASEC interests, cognitive style) and get
matched to real occupations via transparent, deterministic scoring — no AI guessing in
the diagnostic itself. The full report is unlocked behind a ₹399 paywall via Cashfree
(production).

- **Stack:** React 19 + Vite (client-rendered SPA) + Express (TypeScript).
  - Dev: Express runs Vite middleware in SPA mode.
  - Prod: Express serves the static `dist/` build and injects per-route SEO meta tags.
- **Routing:** react-router-dom. Routes: `/`, `/app`, `/about-us`, `/privacy-policy`,
  `/terms-of-service`.
- **SEO:** `react-helmet-async` (client) + server-side meta injection in `server.ts`
  (`ROUTE_META` / `injectMeta`) so crawlers and social scrapers that don't run JS still
  get real, route-specific title/description/canonical/Open Graph tags. Shared client
  component: `src/Seo.tsx`. Structured data (JSON-LD) lives on the landing page.
- **Domain:** https://truepathcareer.com (Cashfree-approved).
- **Payments:** Cashfree production (`CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`).

## Deployment
The site is connected to GitHub (origin: `github.com/ishanupreti2586170-ship-it/path-`).
**To update the live domain you must push via the Git pane** — a Replit publish alone
will not update truepathcareer.com.

## SEO — post-deploy steps (manual, do these after the site is live)
1. **Deploy first:** confirm the latest build is live on https://truepathcareer.com and
   that `https://truepathcareer.com/og-image.png`, `/robots.txt`, and `/sitemap.xml` all
   load.
2. **Google Search Console:** add and verify the `truepathcareer.com` property
   (https://search.google.com/search-console). DNS TXT verification is the most robust.
3. **Submit the sitemap:** in Search Console → Sitemaps, submit
   `https://truepathcareer.com/sitemap.xml`.
4. **Request indexing:** use the URL Inspection tool to request indexing of `/` and
   `/app`.
5. **Validate rich results:** run `/` through the Rich Results Test
   (https://search.google.com/test/rich-results) to confirm the JSON-LD is valid.
6. **Check social previews:** paste the URL into the Facebook Sharing Debugger and
   Twitter/X Card Validator to confirm the OG image and title/description render.

## User preferences
- (none recorded yet)
