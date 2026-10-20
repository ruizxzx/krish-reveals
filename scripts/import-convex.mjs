import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ConvexHttpClient } from 'convex/browser'
import { makeFunctionReference } from 'convex/server'
import { DB_FILE, UPLOAD_DIR } from '../server/db.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
for (const envName of ['.env', '.env.local']) {
  const envPath = path.join(root, envName)
  if (!fs.existsSync(envPath)) continue
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator < 1) continue
    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    if (!(key in process.env)) process.env[key] = value
  }
}

const productionImport = process.argv.includes('--production')
if (productionImport) {
  const envPath = path.join(root, '.env.convex.production')
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const separator = trimmed.indexOf('=')
      if (separator < 1) continue
      const key = trimmed.slice(0, separator).trim()
      let value = trimmed.slice(separator + 1).trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
      process.env[key] = value
    }
  }
}

const url = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL
const deployKey = process.env.CONVEX_DEPLOY_KEY
if (!url || !deployKey) throw new Error('Set CONVEX_URL and CONVEX_DEPLOY_KEY in the environment before importing.')
if (!fs.existsSync(DB_FILE)) throw new Error('Local data/db.json was not found; there is no local snapshot to import.')

const client = new ConvexHttpClient(url, { logger: false })
client.setAdminAuth(deployKey)
const ref = (name) => makeFunctionReference(`portfolio:${name}`)
if (await client.query(ref('isInitialized'), {})) throw new Error('Convex already contains imported data. Refusing to overwrite it.')

const snapshot = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
const uploads = new Map()
const imageFiles = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR, { withFileTypes: true }).filter((item) => item.isFile()) : []

for (const entry of imageFiles) {
  const filePath = path.join(UPLOAD_DIR, entry.name)
  const bytes = fs.readFileSync(filePath)
  if (bytes.length > 20 * 1024 * 1024) throw new Error(`Image ${entry.name} exceeds Convex's 20 MB storage upload limit.`)
  const extension = path.extname(entry.name).toLowerCase()
  const contentType = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' }[extension]
  if (!contentType) continue
  const uploadUrl = await client.mutation(ref('generateUploadUrl'), {})
  const response = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': contentType }, body: bytes })
  if (!response.ok) throw new Error(`Convex upload failed for ${entry.name}.`)
  const { storageId } = await response.json()
  const publicUrl = await client.query(ref('getStorageUrl'), { storageId })
  if (publicUrl) uploads.set(`/uploads/${entry.name}`, publicUrl)
}

const replaceUpload = (value) => typeof value === 'string' ? uploads.get(value) || value : value
snapshot.settings.profileImage = replaceUpload(snapshot.settings.profileImage)
for (const project of snapshot.projects || []) project.cover = replaceUpload(project.cover)
for (const post of snapshot.posts || []) post.cover = replaceUpload(post.cover)

const result = await client.mutation(ref('importSnapshot'), {
  settings: snapshot.settings,
  projects: snapshot.projects || [],
  posts: snapshot.posts || [],
  messages: snapshot.messages || [],
  admin: snapshot.admin || null,
})
console.log(`Imported ${result.projects} projects, ${result.posts} posts, and ${result.inquiries} inquiries; admin ${result.adminImported ? 'credentials copied' : 'not configured'}; ${uploads.size} uploaded files moved to Convex storage.`)
console.log('Existing sessions were intentionally not imported. Sign in again after setting the Vercel Convex environment variables.')
