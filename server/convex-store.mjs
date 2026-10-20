import { ConvexHttpClient } from 'convex/browser'
import { makeFunctionReference } from 'convex/server'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { DB_FILE, UPLOAD_DIR, readDb, mutateDb } from './db.mjs'

const functionRef = (name) => makeFunctionReference(`portfolio:${name}`)
let client

export function convexConfigured() {
  return Boolean((process.env.CONVEX_URL || process.env.VITE_CONVEX_URL) && process.env.CONVEX_DEPLOY_KEY)
}

function getClient() {
  if (!convexConfigured()) throw new Error('Convex is not configured. Set CONVEX_URL and CONVEX_DEPLOY_KEY on the API server.')
  if (!client) {
    client = new ConvexHttpClient(process.env.CONVEX_URL || process.env.VITE_CONVEX_URL, { logger: false })
    client.setAdminAuth(process.env.CONVEX_DEPLOY_KEY)
  }
  return client
}

const query = (name, args = {}) => getClient().query(functionRef(name), args)
const mutation = async (name, args = {}) => {
  try {
    return await getClient().mutation(functionRef(name), args)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Convex mutation failed.'
    const status = /already exists/i.test(message) ? 409 : /not found/i.test(message) ? 404 : undefined
    throw Object.assign(new Error(message), status ? { status } : {})
  }
}

export async function getPublicData() {
  if (convexConfigured()) {
    const data = await query('getPublicData')
    data.projects.sort((a, b) => Number(b.featured) - Number(a.featured) || String(a.number).localeCompare(String(b.number)))
    data.posts.sort((a, b) => String(b.date).localeCompare(String(a.date)))
    return data
  }
  const db = readDb()
  return {
    settings: db.settings,
    projects: db.projects.filter((item) => item.published).sort((a, b) => Number(b.featured) - Number(a.featured) || String(a.number).localeCompare(String(b.number))),
    posts: db.posts.filter((item) => item.status === 'published').sort((a, b) => String(b.date).localeCompare(String(a.date))),
  }
}

export async function getPublishedPost(slug) {
  if (convexConfigured()) return query('getPublishedPost', { slug })
  return readDb().posts.find((item) => item.slug === slug && item.status === 'published') || null
}

export async function getAdminData() {
  if (convexConfigured()) {
    const data = await query('getAdminData')
    data.posts.sort((a, b) => String(b.date).localeCompare(String(a.date)))
    data.messages.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    return data
  }
  return readDb()
}

export async function getAdmin() {
  if (convexConfigured()) return query('getAdmin')
  return readDb().admin
}

export async function getAdminForSession(hash) {
  if (convexConfigured()) return query('getAdminForSession', { hash, now: Date.now() })
  const db = readDb()
  const session = db.sessions.find((item) => item.hash === hash && item.expiresAt > Date.now())
  return session && db.admin ? { email: db.admin.email, sessionHash: hash } : null
}

export async function setAdmin(admin) {
  if (convexConfigured()) return mutation('setAdmin', { admin })
  return mutateDb((db) => { db.admin = admin; db.sessions = []; return admin })
}

export async function createSession(hash, expiresAt) {
  if (convexConfigured()) return mutation('createSession', { hash, expiresAt })
  return mutateDb((db) => {
    db.sessions = db.sessions.filter((session) => session.expiresAt > Date.now()).slice(-20)
    db.sessions.push({ hash, createdAt: Date.now(), expiresAt })
    return true
  })
}

export async function deleteSession(hash) {
  if (convexConfigured()) return mutation('deleteSession', { hash })
  return mutateDb((db) => { db.sessions = db.sessions.filter((session) => session.hash !== hash); return true })
}

export async function setSettings(settings) {
  if (convexConfigured()) return mutation('setSettings', { settings })
  return mutateDb((db) => { db.settings = settings; return settings })
}

export async function createProject(record) {
  if (convexConfigured()) return mutation('createProject', { record })
  return mutateDb((db) => {
    if (db.projects.some((item) => item.slug === record.slug)) throw Object.assign(new Error('A project with this slug already exists.'), { status: 409 })
    db.projects.unshift(record)
    return record
  })
}

export async function updateProject(id, record) {
  if (convexConfigured()) return mutation('updateProject', { id, record })
  return mutateDb((db) => {
    const index = db.projects.findIndex((item) => item.id === id)
    if (index < 0) throw Object.assign(new Error('Project not found.'), { status: 404 })
    if (db.projects.some((item, itemIndex) => itemIndex !== index && item.slug === record.slug)) throw Object.assign(new Error('A project with this slug already exists.'), { status: 409 })
    db.projects[index] = record
    return record
  })
}

export async function deleteProject(id) {
  if (convexConfigured()) return mutation('deleteProject', { id })
  return mutateDb((db) => {
    const index = db.projects.findIndex((item) => item.id === id)
    if (index < 0) throw Object.assign(new Error('Project not found.'), { status: 404 })
    db.projects.splice(index, 1)
    return true
  })
}

export async function createPost(record) {
  if (convexConfigured()) return mutation('createPost', { record })
  return mutateDb((db) => {
    if (db.posts.some((item) => item.slug === record.slug)) throw Object.assign(new Error('An article with this slug already exists.'), { status: 409 })
    db.posts.unshift(record)
    return record
  })
}

export async function updatePost(id, record) {
  if (convexConfigured()) return mutation('updatePost', { id, record })
  return mutateDb((db) => {
    const index = db.posts.findIndex((item) => item.id === id)
    if (index < 0) throw Object.assign(new Error('Article not found.'), { status: 404 })
    if (db.posts.some((item, itemIndex) => itemIndex !== index && item.slug === record.slug)) throw Object.assign(new Error('An article with this slug already exists.'), { status: 409 })
    db.posts[index] = record
    return record
  })
}

export async function deletePost(id) {
  if (convexConfigured()) return mutation('deletePost', { id })
  return mutateDb((db) => {
    const index = db.posts.findIndex((item) => item.id === id)
    if (index < 0) throw Object.assign(new Error('Article not found.'), { status: 404 })
    db.posts.splice(index, 1)
    return true
  })
}

export async function createInquiry(record) {
  if (convexConfigured()) return mutation('createInquiry', { record })
  return mutateDb((db) => { db.messages.unshift(record); db.messages = db.messages.slice(0, 1000); return record })
}

export async function updateInquiry(id, readAt) {
  if (convexConfigured()) return mutation('updateInquiry', { id, readAt })
  return mutateDb((db) => {
    const inquiry = db.messages.find((item) => item.id === id)
    if (!inquiry) throw Object.assign(new Error('Inquiry not found.'), { status: 404 })
    inquiry.readAt = readAt
    return inquiry
  })
}

export async function deleteInquiry(id) {
  if (convexConfigured()) return mutation('deleteInquiry', { id })
  return mutateDb((db) => {
    const index = db.messages.findIndex((item) => item.id === id)
    if (index < 0) throw Object.assign(new Error('Inquiry not found.'), { status: 404 })
    db.messages.splice(index, 1)
    return true
  })
}

export async function uploadImage(bytes, contentType) {
  if (convexConfigured()) {
    const uploadUrl = await mutation('generateUploadUrl')
    const response = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': contentType }, body: bytes })
    if (!response.ok) throw new Error('Convex storage upload failed.')
    const { storageId } = await response.json()
    const url = await query('getStorageUrl', { storageId })
    if (!url) throw new Error('Convex storage did not return a public file URL.')
    return url
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[contentType]
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${extension}`
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), bytes, { flag: 'wx' })
  return `/uploads/${filename}`
}

export async function importSnapshot(snapshot) {
  if (!convexConfigured()) throw new Error('Set CONVEX_URL and CONVEX_DEPLOY_KEY before importing data.')
  return mutation('importSnapshot', snapshot)
}

export async function isInitialized() {
  if (!convexConfigured()) throw new Error('Set CONVEX_URL and CONVEX_DEPLOY_KEY before checking Convex.')
  return query('isInitialized')
}

export function readLocalSnapshot() {
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  return {
    settings: db.settings,
    projects: db.projects || [],
    posts: db.posts || [],
    messages: db.messages || [],
    admin: db.admin || null,
  }
}
