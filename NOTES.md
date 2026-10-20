# Assumptions and notes

- The design system is public-only: all immersive styling remains scoped to the public portfolio UI and does not alter /admin.
- The app should keep its existing API/data model and CMS editing flow intact; only the public shell and theme behavior were adjusted.
- Theme persistence is stored in localStorage, defaulting to light unless the user has previously chosen dark.
- The public routes that were out of sync were /blog, /blog/:slug, /journal/:slug, /projects/:slug, and 404 states for those pages.
- This build keeps the existing fallback data, SEO hooks, and server meta pipeline unchanged.
- Premium polish was added only to the public experience: larger editorial type, airy spacing, soft ambient gradients, motion reveals, hover transitions, and a subtle custom cursor on pointer-based devices.
- The cursor treatment is intentionally suppressed on touch devices and the admin route remains fully isolated from the redesign.
- The site was kept compatible with the existing API-backed CMS, preview mode, and local theme persistence without changing the server contract.
- The public brand is now “Krish Reveals,” with “Krish Sarkar” kept prominent as the creator; the core story is building digital products and revealing the work live.
- Existing CMS headline and intro fields remain editable and are shown as supporting copy beneath the new brand-led hero.
- Persisted intro and SEO defaults were updated to match the new identity; existing post/project records and admin branding were left unchanged.
