---
name: SEO meta for the Vite SPA + Express
description: How per-route SEO tags are produced without duplicates in this client-rendered app
---

# SEO meta strategy (truepathcareer.com)

The app is a client-rendered Vite SPA served by Express. SEO tags are produced two ways
that must stay in sync:

1. **Server-side injection** (`server.ts` `ROUTE_META` / `injectMeta`) rewrites the static
   `dist/index.html` per route via regex before serving. This is what non-JS crawlers and
   social scrapers see. Prod uses `express.static(distPath, { index:false })` + a catch-all
   that returns the injected HTML.
2. **react-helmet-async** (`src/Seo.tsx`, plus App-level Helmet) updates the same tags in the
   browser for users and JS-rendering crawlers.

**Why the `data-rh="true"` attribute matters:** any tag in `index.html` that Helmet also
emits (title, description, canonical, all og:*, all twitter:*) MUST carry `data-rh="true"`.
react-helmet-async v3 only adopts/replaces tags marked `data-rh`; unmarked static tags are
left in place, so without this you get **duplicate canonical / description / OG tags** after
hydration. Static-only tags (charset, viewport, icon, theme-color, robots, keywords,
og:image:width/height) must NOT have `data-rh` — Helmet doesn't manage them.

**How to apply when editing:** keep the regexes in `injectMeta` tolerant of a trailing
`data-rh` after `content="..."`. The title regex must allow attributes: `/<title[^>]*>.../`.
If you add a new Helmet-managed meta tag, add its static twin to `index.html` WITH
`data-rh="true"` and (if per-route) a matching regex line in `injectMeta`.
