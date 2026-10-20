# Krish Reveals — Krish Sarkar

A public portfolio and content studio for Krish Sarkar, with a project-reveal identity, searchable journal, case studies, contact form, and authenticated admin. It uses React, TypeScript, Vite, a Node API, and Convex for persistent content, sessions, inquiries, and image storage. Local development can still use the JSON fallback without Convex credentials.

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

`npm run dev` starts both processes: the Vite frontend (normally `http://localhost:5173`) and the API on `http://localhost:8787`. The frontend proxies `/api` and `/uploads` to the API. Keep this terminal open while developing.

### Connect Convex

Create or select the Convex project, then run `npx convex login` followed by `npm run convex:dev`. Convex generates `VITE_CONVEX_URL` in `.env.local`. Create a server-only key for the dev deployment with `npx convex deployment token create krish-reveals-local-api --deployment dev --save-env`; it writes `CONVEX_DEPLOY_KEY` into ignored `.env.local`. Never use a `VITE_` prefix for this key.

Deploy functions with `npm run convex:deploy`. To copy the existing local content and image uploads into an empty Convex deployment, run `npm run convex:import` once. The importer refuses to overwrite an initialized deployment, copies projects, posts, inquiries, settings, and the admin password hash, moves images to Convex Storage, and intentionally does not migrate browser sessions.

For Vercel, create a production key with `npx convex deployment token create krish-reveals-vercel --prod --save-env .env.convex.production`, then deploy with `npx convex deploy --env-file .env.convex.production`. Configure `CONVEX_URL` and `CONVEX_DEPLOY_KEY` as server environment variables for Production. Run `CONVEX_URL=<production Convex URL> npm run convex:import -- --production` once to populate the production database. The API requires both values on Vercel; without them it fails closed instead of writing to ephemeral local files.

### Create the admin account

In a second terminal, from this project directory:

```bash
npm run admin:create
```

Enter the administrator email and a password of at least 12 characters. Then open `http://localhost:5173/admin` and sign in. The password is hashed with Node's `scrypt` before it is stored; the plaintext password is not written to the data file. If you need to reset the account, run the command again and type `RESET` when prompted.

The first API startup initializes `data/db.json` with starter projects, published sample journal notes, site settings, an empty inquiry inbox, and no admin credentials. Do not publish the starter notes or project descriptions without reviewing them. They are editable in the Content Studio.

## What's included

### Public site

- Responsive white-first editorial landing page: pill navigation, oversized typographic hero, layered product composition, subtle grid, restrained lime/lilac accents, and hand-drawn-style details.
- Dark featured-work band with TABLELY, Gym SaaS, and INSTALY in the lead row; secondary project previews follow beneath it.
- Hand-built product interface previews for TABLELY, INSTALY, Gym SaaS, Shahzad Securities, ORBIT, the portfolio, attendance system, and Offscrpt. Uploaded cover art can replace a generated preview.
- Scroll-responsive two-row project marquee, five editable service rows, working category filters, and dedicated project case studies at `/projects/:slug`.
- About section, five services, learning/building timeline, interactive skills chips, searchable and filterable journal, contact form, and responsive footer.
- A searchable and filterable journal at `/blog`, individual article pages at `/blog/:slug` (with `/journal/:slug` compatibility), reading progress, a table of contents, previous/next links, related articles, metadata, tags, code blocks, headings, lists, and blockquotes.
- Contact form posts to the API and shows success/error feedback. It does not pretend an email was sent when no provider is configured.

### Admin Content Studio (`/admin`)

- Session-based sign-in using an HttpOnly, SameSite cookie; passwords are hashed with `scrypt`.
- Overview counts for posts, projects, and inquiries.
- Journal manager: create/edit articles, save drafts, publish/unpublish, set categories/tags/date/read time and per-article SEO title/description, edit Markdown content, upload a cover, and delete articles.
- Project manager: edit case-study text, technology stack, status, accent color, cover image, featured order, and public visibility.
- Inquiry inbox: view contact form submissions, mark them read/unread, delete them, and open a real reply email to the sender.
- Site settings: change name, title, headline, CTA labels, default SEO title/description, intro/about copy, uploaded profile image, five service descriptions, default SEO title/description, email, availability, location, social profile links, resume URL, and signature accent.
- Direct device image uploads, restricted to PNG/JPG/WEBP/GIF and 5 MB each.

### Backend/API

- `GET /api/health`
- `GET /robots.txt` and generated `/sitemap.xml` (requires `SITE_URL` for absolute URLs); route-specific titles, Open Graph metadata and canonical URLs are emitted with the HTML response
- `GET /api/public/data`
- `GET /api/public/posts/:slug`
- `POST /api/contact`
- `POST /api/admin/login`, `GET /api/admin/me`, `POST /api/admin/logout`
- Protected admin endpoints for dashboard, settings, projects, posts, inquiries, and uploads.
- Request size limits, validation, login throttling, same-origin checks on mutating requests, session expiration, and security response headers.
- Optional email notifications via Resend. Contact submissions are stored in the admin inbox even if email notification is not configured.

## Optional email notification

Copy `.env.example` to `.env` and set `SITE_URL` and `VITE_SITE_URL` to your verified production origin. For optional mail notifications, also set `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, and `CONTACT_FROM_EMAIL`. The sender address must be on a domain verified with Resend. These values are read server-side; never add private API keys to a `VITE_` variable or frontend code. Restart the API after changing the file.

Without these variables, inquiries still appear in the admin inbox and can be replied to from your email app.

## Canonical URLs, sharing cards and sitemap

A default branded Open Graph image lives at `public/og-card.png`. Project and article cover images are used for their page share cards when configured. Set `SITE_URL` for the Node server and `VITE_SITE_URL` for the Vite-built frontend before production builds. These values should be your verified canonical origin, without a trailing slash. The API builds `/sitemap.xml` from published projects and articles, and `/robots.txt` advertises it. Until `SITE_URL` is configured, the sitemap endpoint returns a configuration message instead of inventing a production domain. Rebuild the frontend after changing `VITE_SITE_URL`.

## Quality checks

```bash
npm run typecheck
npm run build
npm start
```

`npm start` serves the production build and API from one Node process on `PORT` (default `8787`). Run `npm run build` before `npm start`.

## Data and deployment notes

When Convex is not configured, local development initializes an atomic fallback at `data/db.json` and stores uploads in `public/uploads/`. Production uses Convex; the fallback is not deployed or committed. Configure HTTPS in production so the admin cookie receives its `Secure` attribute (`NODE_ENV=production`).

Back up `data/db.json` and `public/uploads/` before upgrades. Do not commit live admin data, uploads, passwords, API keys, or `.env` to version control.

## Personalise before launch

1. Visit `/admin` after creating your account and update the headline, about copy, and service descriptions.
2. Replace `YOUR_EMAIL@example.com` with the public email you want to use.
3. The hero/about collages use original CSS-built abstract portrait illustrations unless a profile image is uploaded in Admin → Site settings. Use a photo you have permission to publish.
4. Add only social URLs you actually own.
5. Review every project description/status and replace the sample journal notes with your own writing.
6. Confirm that the public content has no placeholder claims, false client metrics, or links to unfinished destinations.
7. Configure optional Resend notifications if you want owner email alerts in addition to the admin inbox.
