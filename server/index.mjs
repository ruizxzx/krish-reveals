import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { ensureStorage, ROOT, UPLOAD_DIR, publicSettings } from './db.mjs'
import { convexConfigured, getAdmin, getAdminData, getAdminForSession, getPublicData, getPublishedPost, setAdmin, createSession, deleteSession, setSettings, createProject, updateProject, deleteProject, createPost, updatePost, deletePost, createInquiry, updateInquiry, deleteInquiry, uploadImage } from './convex-store.mjs'
import { makePasswordHash, verifyPassword, newSessionToken, hashToken, randomId, safeText, safeSlug } from './security.mjs'

function loadEnvFile() {
  for (const envName of ['.env', '.env.local']) {
    const envPath = path.join(ROOT, envName)
    if (!fs.existsSync(envPath)) continue
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx < 1) continue
      const key = trimmed.slice(0, idx).trim()
      let value = trimmed.slice(idx + 1).trim()
      if ((value.startsWith('\"') && value.endsWith('\"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
      if (!(key in process.env)) process.env[key] = value
    }
  }
}
loadEnvFile()
if (process.env.VERCEL && !convexConfigured()) throw new Error('Set CONVEX_URL and CONVEX_DEPLOY_KEY before deploying the API to Vercel.')
if (!convexConfigured()) ensureStorage()
const PORT = Number(process.env.PORT || 8787)
const COOKIE_NAME = 'ks_admin_session'
const SESSION_MS = 1000 * 60 * 60 * 12
const MAX_JSON_BYTES = 7 * 1024 * 1024
const loginAttempts = new Map()
const contactAttempts = new Map()

const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.json': 'application/json; charset=utf-8',
}

function send(res, status, body, extraHeaders = {}) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', ...extraHeaders })
  res.end(raw)
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body !== undefined) {
      const body = req.body
      const raw = typeof body === 'string' ? body : JSON.stringify(body)
      if (Buffer.byteLength(raw || '', 'utf8') > MAX_JSON_BYTES) return reject(Object.assign(new Error('Request body is too large.'), { status: 413 }))
      try { return resolve(typeof body === 'string' ? JSON.parse(body) : body) }
      catch { return reject(Object.assign(new Error('Request body must be valid JSON.'), { status: 400 })) }
    }
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_JSON_BYTES) { reject(Object.assign(new Error('Request body is too large.'), { status: 413 })); req.destroy(); return }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
      catch { reject(Object.assign(new Error('Request body must be valid JSON.'), { status: 400 })) }
    })
    req.on('error', reject)
  })
}
function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf('=')
    return index < 0 ? [part, ''] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))]
  }))
}
function csrfOkay(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try { return new URL(origin).host === req.headers.host }
  catch { return false }
}
async function getSessionAdmin(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME]
  if (!token) return null
  const digest = hashToken(token)
  const admin = await getAdminForSession(digest)
  return admin ? { ...admin, sessionHash: digest } : null
}
async function requireAdmin(req, res) {
  const admin = await getSessionAdmin(req)
  if (!admin) { send(res, 401, { error: 'Please sign in again.' }); return null }
  return admin
}
function safeHttpUrl(value) {
  const candidate = safeText(value, 500)
  if (!candidate) return ''
  try {
    const parsed = new URL(candidate)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : ''
  } catch { return '' }
}

function validateProject(raw, existing = {}) {
  const name = safeText(raw.name, 100)
  const slug = safeSlug(raw.slug || name)
  if (!name || !slug) throw Object.assign(new Error('Project name and slug are required.'), { status: 400 })
  const allowedCategories = ['SaaS', 'Commerce', 'AI', 'Editorial', 'Website', 'Other']
  return {
    ...existing,
    id: existing.id || randomId(), slug, number: safeText(raw.number || existing.number || '—', 8), name,
    tagline: safeText(raw.tagline, 180), description: safeText(raw.description, 1200),
    category: allowedCategories.includes(raw.category) ? raw.category : 'Other',
    year: safeText(raw.year || String(new Date().getFullYear()), 8), role: safeText(raw.role, 160),
    stack: Array.isArray(raw.stack) ? raw.stack.slice(0, 12).map((x) => safeText(x, 45)).filter(Boolean) : safeText(raw.stack, 400).split(',').map((x) => x.trim()).filter(Boolean).slice(0, 12),
    status: ['In progress', 'Concept / build', 'Selected work', 'Archived'].includes(raw.status) ? raw.status : 'In progress',
    accent: /^#[0-9a-fA-F]{6}$/.test(raw.accent || '') ? raw.accent : '#d9f4e9',
    cover: safeText(raw.cover, 400), liveUrl: safeHttpUrl(raw.liveUrl), sourceUrl: safeHttpUrl(raw.sourceUrl), challenge: safeText(raw.challenge, 2000), approach: safeText(raw.approach, 2000), outcome: safeText(raw.outcome, 2000),
    published: raw.published === true || raw.published === 'true', featured: raw.featured === true || raw.featured === 'true', updatedAt: new Date().toISOString(),
  }
}
function validatePost(raw, existing = {}) {
  const title = safeText(raw.title, 180)
  const slug = safeSlug(raw.slug || title)
  if (!title || !slug) throw Object.assign(new Error('Article title and slug are required.'), { status: 400 })
  const status = raw.status === 'published' ? 'published' : 'draft'
  return {
    ...existing, id: existing.id || randomId(), slug, title, excerpt: safeText(raw.excerpt, 420),
    category: safeText(raw.category || 'Notes', 60), date: safeText(raw.date || new Date().toISOString().slice(0, 10), 10),
    seoTitle: safeText(raw.seoTitle, 180), metaDescription: safeText(raw.metaDescription, 420),
    readTime: safeText(raw.readTime || '4 min read', 24), cover: safeText(raw.cover, 400),
    accent: /^#[0-9a-fA-F]{6}$/.test(raw.accent || '') ? raw.accent : '#d9f4e9', status,
    tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 12).map((x) => safeText(x, 40)).filter(Boolean) : safeText(raw.tags, 300).split(',').map((x) => x.trim()).filter(Boolean).slice(0, 12),
    author: safeText(raw.author || 'Krish Sarkar', 100), content: safeText(raw.content, 50000), updatedAt: new Date().toISOString(),
  }
}
function cleanSessionCookie() { return `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}` }
function sessionCookie(token) { return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(SESSION_MS / 1000)}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}` }
function adminSummary(db) {
  const posts = db.posts || []
  const projects = db.projects || []
  const messages = db.messages || []
  return { email: db.admin?.email || '', counts: { posts: posts.length, publishedPosts: posts.filter((p) => p.status === 'published').length, projects: projects.length, publishedProjects: projects.filter((p) => p.published).length, inquiries: messages.length, unread: messages.filter((m) => !m.readAt).length } }
}

function htmlEscape(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function getRequestOrigin(req) {
  const configured = process.env.SITE_URL || process.env.VITE_SITE_URL || ''
  try {
    const parsed = new URL(configured || `${req.socket.encrypted ? 'https' : (req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http')}://${req.headers.host || 'localhost'}`)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.origin
  } catch { /* use a safe local fallback if the host header is malformed */ }
  return 'http://localhost'
}

async function pageMetadata(pathname, req) {
  const db = await getPublicData()
  const settings = publicSettings(db.settings || {})
  const siteName = settings.name || 'Krish Sarkar'
  const origin = getRequestOrigin(req)
  let title = settings.seoTitle || `Krish Reveals — ${siteName}`
  let description = settings.seoDescription || 'Krish Reveals: Krish Sarkar builds digital products and shares their journey from first idea to live reveal.'
  let pagePath = '/'
  let type = 'website'
  let image = '/og-card.png'
  if (pathname === '/blog') {
    title = `Journal — ${siteName}`
    description = 'Notes on building products, writing code, and exploring the web.'
    pagePath = '/blog'
  } else if (pathname.startsWith('/projects/')) {
    const slug = pathname.slice('/projects/'.length)
    const project = (db.projects || []).find((item) => item.published && item.slug === slug)
    if (project) {
      title = `${project.name} — Case Study — ${siteName}`
      description = project.description || `A project case study from ${siteName}.`
      pagePath = `/projects/${encodeURIComponent(project.slug)}`
      image = project.cover || image
    }
  } else if (pathname.startsWith('/blog/') || pathname.startsWith('/journal/')) {
    const slug = pathname.startsWith('/blog/') ? pathname.slice('/blog/'.length) : pathname.slice('/journal/'.length)
    const post = (db.posts || []).find((item) => item.status === 'published' && item.slug === slug)
    if (post) {
      title = post.seoTitle || `${post.title} — ${siteName}`
      description = post.metaDescription || post.excerpt || `${post.title} by ${siteName}.`
      pagePath = `/blog/${encodeURIComponent(post.slug)}`
      type = 'article'
      image = post.cover || image
    }
  }
  if (!/^https?:\/\//i.test(image)) {
    if (!image.startsWith('/')) image = `/${image}`
    image = `${origin}${image}`
  } else {
    try { const parsed = new URL(image); image = ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : `${origin}/og-card.png` }
    catch { image = `${origin}/og-card.png` }
  }
  return { title, description, canonical: `${origin}${pagePath}`, type, image }
}

async function injectPageMetadata(html, pathname, req) {
  const metadata = await pageMetadata(pathname, req)
  const replaceMeta = (attribute, key, value) => {
    const safeValue = htmlEscape(value)
    const pattern = new RegExp(`<meta\\s+${attribute}=[\"']${key}[\"'][^>]*>`, 'i')
    const tag = `<meta ${attribute}="${key}" content="${safeValue}" />`
    if (pattern.test(html)) html = html.replace(pattern, tag)
    else html = html.replace(/<\/head>/i, `    ${tag}\n  </head>`)
  }
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${htmlEscape(metadata.title)}</title>`)
  replaceMeta('name', 'description', metadata.description)
  replaceMeta('property', 'og:title', metadata.title)
  replaceMeta('property', 'og:description', metadata.description)
  replaceMeta('property', 'og:url', metadata.canonical)
  replaceMeta('property', 'og:type', metadata.type)
  replaceMeta('property', 'og:image', metadata.image)
  replaceMeta('name', 'twitter:card', 'summary_large_image')
  const canonicalTag = `<link rel="canonical" href="${htmlEscape(metadata.canonical)}" />`
  if (/<link\s+rel=["']canonical["'][^>]*>/i.test(html)) html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, canonicalTag)
  else html = html.replace(/<\/head>/i, `    ${canonicalTag}\n  </head>`)
  return html
}

async function handle(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const pathname = decodeURIComponent(url.pathname)
  if (req.method === 'GET' && (pathname === '/robots.txt' || pathname === '/sitemap.xml')) {
    const configured = process.env.SITE_URL || process.env.VITE_SITE_URL || ''
    let baseUrl = ''
    if (configured) {
      try { const parsed = new URL(configured); if (parsed.protocol === 'https:' || parsed.protocol === 'http:') baseUrl = parsed.origin } catch { /* site URL is optional during local development */ }
    }
    if (pathname === '/robots.txt') {
      const body = `User-agent: *\nAllow: /\n${baseUrl ? `Sitemap: ${baseUrl}/sitemap.xml\n` : '# Set SITE_URL in .env to publish the absolute sitemap URL.\n'}`
      return send(res, 200, body, { 'Content-Type': 'text/plain; charset=utf-8' })
    }
    if (!baseUrl) return send(res, 503, 'Set SITE_URL in .env to generate canonical sitemap URLs.', { 'Content-Type': 'text/plain; charset=utf-8' })
    const db = await getPublicData()
    const urls = [{ loc: `${baseUrl}/`, lastmod: new Date().toISOString().slice(0, 10) }, { loc: `${baseUrl}/blog`, lastmod: new Date().toISOString().slice(0, 10) }, ...db.projects.map((item) => ({ loc: `${baseUrl}/projects/${encodeURIComponent(item.slug)}`, lastmod: String(item.updatedAt || `${item.year || ''}-01-01`).slice(0, 10) })), ...db.posts.map((item) => ({ loc: `${baseUrl}/blog/${encodeURIComponent(item.slug)}`, lastmod: String(item.updatedAt || item.date || new Date().toISOString()).slice(0, 10) }))]
    const xmlEscape = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((item) => `  <url><loc>${xmlEscape(item.loc)}</loc><lastmod>${/^\d{4}-\d{2}-\d{2}$/.test(item.lastmod) ? item.lastmod : new Date().toISOString().slice(0, 10)}</lastmod></url>`).join('\n')}\n</urlset>`
    return send(res, 200, body, { 'Content-Type': 'application/xml; charset=utf-8' })
  }
  if (req.method === 'OPTIONS') return send(res, 204, '', { 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' })
  if (req.method !== 'GET' && !csrfOkay(req)) return send(res, 403, { error: 'Request origin check failed.' })

  if (pathname === '/api/health' && req.method === 'GET') return send(res, 200, { ok: true, service: 'krish-portfolio-api' })
  if (pathname === '/api/public/data' && req.method === 'GET') {
    const data = await getPublicData()
    return send(res, 200, { settings: publicSettings(data.settings), projects: data.projects, posts: data.posts })
  }
  if (pathname.startsWith('/api/public/posts/') && req.method === 'GET') {
    const slug = pathname.slice('/api/public/posts/'.length)
    const post = await getPublishedPost(slug)
    return post ? send(res, 200, post) : send(res, 404, { error: 'Article not found.' })
  }
  if (pathname === '/api/contact' && req.method === 'POST') {
    const contactIp = req.socket.remoteAddress || 'unknown'
    const contactAttempt = contactAttempts.get(contactIp) || { count: 0, start: Date.now() }
    if (Date.now() - contactAttempt.start > 10 * 60 * 1000) { contactAttempt.count = 0; contactAttempt.start = Date.now() }
    if (contactAttempt.count >= 5) return send(res, 429, { error: 'Too many messages from this connection. Please try again later or use the public email address.' })
    let body
    try { body = await readBody(req) } catch (error) { return send(res, error.status || 400, { error: error.message }) }
    const name = safeText(body.name, 100)
    const email = safeText(body.email, 240)
    const message = safeText(body.message, 8000)
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10) return send(res, 400, { error: 'Please provide your name, a valid email, and a message of at least 10 characters.' })
    if (safeText(body.website, 300)) return send(res, 200, { ok: true }) // honeypot field
    const inquiry = { id: randomId(), name, email, company: safeText(body.company, 140), type: safeText(body.type, 120), budget: safeText(body.budget, 100), message, createdAt: new Date().toISOString(), readAt: null }
    contactAttempt.count += 1; contactAttempts.set(contactIp, contactAttempt)
    await createInquiry(inquiry)
    let notification = 'not-configured'
    if (process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL && process.env.CONTACT_FROM_EMAIL) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.CONTACT_FROM_EMAIL,
            to: [process.env.CONTACT_TO_EMAIL],
            subject: `Portfolio inquiry: ${name}${inquiry.company ? ` — ${inquiry.company}` : ''}`,
            text: `Name: ${name}\nEmail: ${email}\nCompany/project: ${inquiry.company || 'Not provided'}\nType: ${inquiry.type || 'Not specified'}\nBudget: ${inquiry.budget || 'Not specified'}\n\n${message}`,
            reply_to: email,
          }),
        })
        notification = emailResponse.ok ? 'sent' : 'failed'
        if (!emailResponse.ok) console.error('[contact-email] Resend returned', emailResponse.status, await emailResponse.text())
      } catch (error) { notification = 'failed'; console.error('[contact-email] notification failed', error) }
    }
    return send(res, 201, { ok: true, notification, message: 'Inquiry saved. Thanks for reaching out.' })
  }

  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const ip = req.socket.remoteAddress || 'unknown'
    const attempt = loginAttempts.get(ip) || { count: 0, until: 0 }
    if (attempt.until > Date.now() && attempt.count >= 8) return send(res, 429, { error: 'Too many sign-in attempts. Wait 10 minutes and try again.' })
    let body
    try { body = await readBody(req) } catch (error) { return send(res, error.status || 400, { error: error.message }) }
    const admin = await getAdmin()
    if (!admin) return send(res, 503, { error: 'Admin account is not configured. Create it in Convex or run the local admin setup command.' })
    const valid = safeText(body.email, 240).toLowerCase() === admin.email.toLowerCase() && verifyPassword(typeof body.password === 'string' ? body.password : '', admin.passwordHash)
    if (!valid) {
      attempt.count += 1; attempt.until = attempt.count >= 8 ? Date.now() + 10 * 60 * 1000 : Date.now() + 60 * 1000; loginAttempts.set(ip, attempt)
      return send(res, 401, { error: 'Email or password is incorrect.' })
    }
    loginAttempts.delete(ip)
    const token = newSessionToken()
    await createSession(hashToken(token), Date.now() + SESSION_MS)
    return send(res, 200, { ok: true, email: admin.email }, { 'Set-Cookie': sessionCookie(token) })
  }
  if (pathname === '/api/admin/logout' && req.method === 'POST') {
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME]
    if (token) await deleteSession(hashToken(token))
    return send(res, 200, { ok: true }, { 'Set-Cookie': cleanSessionCookie() })
  }
  if (pathname === '/api/admin/me' && req.method === 'GET') {
    const admin = await getSessionAdmin(req)
    if (!admin) return send(res, 401, { error: 'Not signed in.' })
    return send(res, 200, { email: admin.email })
  }

  if (pathname.startsWith('/api/admin/')) {
    const admin = await requireAdmin(req, res)
    if (!admin) return
    const db = await getAdminData()
    if (pathname === '/api/admin/dashboard' && req.method === 'GET') return send(res, 200, adminSummary(db))
    if (pathname === '/api/admin/settings' && req.method === 'GET') return send(res, 200, db.settings)
    if (pathname === '/api/admin/settings' && req.method === 'PUT') {
      let body; try { body = await readBody(req) } catch (error) { return send(res, error.status || 400, { error: error.message }) }
      const allowed = ['name', 'title', 'eyebrow', 'headlineA', 'headlineB', 'headlineC', 'heroPrimaryLabel', 'heroSecondaryLabel', 'profileImage', 'seoTitle', 'seoDescription', 'intro', 'about', 'email', 'location', 'availability', 'github', 'linkedin', 'instagram', 'resumeUrl', 'accent']
      const settings = { ...db.settings }
      for (const key of allowed) if (typeof body[key] === 'string') settings[key] = safeText(body[key], key === 'about' || key === 'intro' ? 3000 : 500)
      if (Array.isArray(body.services)) settings.services = body.services.slice(0, 5).map((item) => ({ title: safeText(item?.title, 120), description: safeText(item?.description, 700) })).filter((item) => item.title && item.description)
      await setSettings(settings)
      return send(res, 200, publicSettings(settings))
    }

    if (pathname === '/api/admin/projects' && req.method === 'GET') return send(res, 200, db.projects)
    if (pathname === '/api/admin/projects' && req.method === 'POST') {
      let body; try { body = await readBody(req) } catch (error) { return send(res, error.status || 400, { error: error.message }) }
      try {
        const project = validateProject(body)
        const result = await createProject(project)
        return send(res, 201, result)
      } catch (error) { return send(res, error.status || 400, { error: error.message }) }
    }
    const projectMatch = pathname.match(/^\/api\/admin\/projects\/([^/]+)$/)
    if (projectMatch && req.method === 'PUT') {
      let body; try { body = await readBody(req) } catch (error) { return send(res, error.status || 400, { error: error.message }) }
      try {
        const existing = db.projects.find((project) => project.id === projectMatch[1])
        if (!existing) throw Object.assign(new Error('Project not found.'), { status: 404 })
        const next = validateProject(body, existing)
        const result = await updateProject(projectMatch[1], next)
        return send(res, 200, result)
      } catch (error) { return send(res, error.status || 400, { error: error.message }) }
    }
    if (projectMatch && req.method === 'DELETE') {
      try { await deleteProject(projectMatch[1]); return send(res, 200, { ok: true }) }
      catch (error) { return send(res, error.status || 400, { error: error.message }) }
    }

    if (pathname === '/api/admin/posts' && req.method === 'GET') return send(res, 200, db.posts.sort((a, b) => String(b.date).localeCompare(String(a.date))) )
    if (pathname === '/api/admin/posts' && req.method === 'POST') {
      let body; try { body = await readBody(req) } catch (error) { return send(res, error.status || 400, { error: error.message }) }
      try {
        const post = validatePost(body)
        const result = await createPost(post)
        return send(res, 201, result)
      } catch (error) { return send(res, error.status || 400, { error: error.message }) }
    }
    const postMatch = pathname.match(/^\/api\/admin\/posts\/([^/]+)$/)
    if (postMatch && req.method === 'PUT') {
      let body; try { body = await readBody(req) } catch (error) { return send(res, error.status || 400, { error: error.message }) }
      try {
        const existing = db.posts.find((post) => post.id === postMatch[1])
        if (!existing) throw Object.assign(new Error('Article not found.'), { status: 404 })
        const next = validatePost(body, existing)
        const result = await updatePost(postMatch[1], next)
        return send(res, 200, result)
      } catch (error) { return send(res, error.status || 400, { error: error.message }) }
    }
    if (postMatch && req.method === 'DELETE') {
      try { await deletePost(postMatch[1]); return send(res, 200, { ok: true }) }
      catch (error) { return send(res, error.status || 400, { error: error.message }) }
    }

    if (pathname === '/api/admin/messages' && req.method === 'GET') return send(res, 200, db.messages)
    const messageMatch = pathname.match(/^\/api\/admin\/messages\/([^/]+)$/)
    if (messageMatch && req.method === 'PUT') {
      let body; try { body = await readBody(req) } catch (error) { return send(res, error.status || 400, { error: error.message }) }
      try { const result = await updateInquiry(messageMatch[1], body.read === false ? null : new Date().toISOString()); return send(res, 200, result) }
      catch (error) { return send(res, error.status || 400, { error: error.message }) }
    }
    if (messageMatch && req.method === 'DELETE') {
      try { await deleteInquiry(messageMatch[1]); return send(res, 200, { ok: true }) }
      catch (error) { return send(res, error.status || 400, { error: error.message }) }
    }

    if (pathname === '/api/admin/upload' && req.method === 'POST') {
      let body; try { body = await readBody(req) } catch (error) { return send(res, error.status || 400, { error: error.message }) }
      const match = typeof body.dataUrl === 'string' ? body.dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/) : null
      if (!match) return send(res, 400, { error: 'Use a PNG, JPG, WEBP, or GIF image.' })
      const bytes = Buffer.from(match[2], 'base64')
      if (!bytes.length || bytes.length > 5 * 1024 * 1024) return send(res, 413, { error: 'Images must be smaller than 5 MB.' })
      const imageUrl = await uploadImage(bytes, match[1])
      return send(res, 201, { url: imageUrl })
    }
    return send(res, 404, { error: 'Admin endpoint not found.' })
  }

  if (pathname.startsWith('/uploads/')) {
    const filename = path.basename(pathname.slice('/uploads/'.length))
    const file = path.join(UPLOAD_DIR, filename)
    if (!filename || filename !== pathname.slice('/uploads/'.length) || !fs.existsSync(file)) return send(res, 404, 'Not found')
    const ext = path.extname(filename).toLowerCase()
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' })
    return fs.createReadStream(file).pipe(res)
  }

  // Static frontend in production. Vite handles the SPA fallback in development.
  const dist = path.join(ROOT, 'dist')
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '')
  const candidate = path.resolve(dist, relative)
  if (candidate.startsWith(`${dist}${path.sep}`) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    const ext = path.extname(candidate).toLowerCase()
    const hashedAsset = candidate.startsWith(`${path.join(dist, 'assets')}${path.sep}`)
    // Vite assets have content hashes and can be cached immutably. Stable public
    // paths (for example favicon.svg or images replaced by the owner) must revalidate.
    const cacheControl = ext === '.html'
      ? 'no-cache'
      : hashedAsset
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=3600, stale-while-revalidate=86400'
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream', 'Cache-Control': cacheControl, 'X-Content-Type-Options': 'nosniff' })
    if (ext === '.html') return res.end(await injectPageMetadata(fs.readFileSync(candidate, 'utf8'), pathname, req))
    return fs.createReadStream(candidate).pipe(res)
  }
  const entry = path.join(dist, 'index.html')
  if (fs.existsSync(entry)) {
    res.writeHead(200, { 'Content-Type': mime['.html'], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' })
    return res.end(await injectPageMetadata(fs.readFileSync(entry, 'utf8'), pathname, req))
  }
  return send(res, 503, 'Frontend is not built yet. Run npm run build first.')
}

export async function handler(req, res) {
  try {
    await handle(req, res)
  } catch (error) {
    console.error('[portfolio-api]', error)
    if (!res.headersSent) send(res, error.status || 500, { error: error.status ? error.message : 'Unexpected server error.' })
    else res.destroy()
  }
}

if (!process.env.VERCEL) {
  const server = http.createServer(handler)
  server.listen(PORT, '0.0.0.0', () => console.log(`Portfolio API listening on http://localhost:${PORT}`))
  process.on('SIGTERM', () => server.close(() => process.exit(0)))
  process.on('SIGINT', () => server.close(() => process.exit(0)))
}
