import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defaultSettings, defaultProjects, defaultPosts, defaultServices } from './seed.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(here, '..')
export const DATA_DIR = path.join(ROOT, 'data')
export const DB_FILE = path.join(DATA_DIR, 'db.json')
export const UPLOAD_DIR = path.join(ROOT, 'public', 'uploads')

export function ensureStorage() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      version: 1,
      settings: defaultSettings,
      projects: defaultProjects,
      posts: defaultPosts,
      messages: [],
      admin: null,
      sessions: [],
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), { mode: 0o600 })
    return
  }
  // Additive migration only: preserve owner-edited values while filling newly introduced settings.
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    if (!db.settings || typeof db.settings !== 'object') db.settings = { ...defaultSettings }
    let changed = false
    for (const [key, value] of Object.entries(defaultSettings)) {
      if (db.settings[key] === undefined) { db.settings[key] = value; changed = true }
    }
    if (changed) {
      const temp = `${DB_FILE}.${process.pid}.migration.tmp`
      fs.writeFileSync(temp, JSON.stringify(db, null, 2), { mode: 0o600 })
      fs.renameSync(temp, DB_FILE)
    }
  } catch (error) {
    throw new Error(`Cannot migrate data/db.json. Back up the file and repair the JSON before restarting. ${error instanceof Error ? error.message : ''}`)
  }
}

export function readDb() {
  ensureStorage()
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  } catch (error) {
    throw new Error(`Cannot read data/db.json. Back up the file and repair the JSON before restarting. ${error instanceof Error ? error.message : ''}`)
  }
}

export function writeDb(db) {
  ensureStorage()
  const temp = `${DB_FILE}.${process.pid}.tmp`
  fs.writeFileSync(temp, JSON.stringify(db, null, 2), { mode: 0o600 })
  fs.renameSync(temp, DB_FILE)
}

export function mutateDb(mutator) {
  const db = readDb()
  const result = mutator(db)
  writeDb(db)
  return result
}

export function publicSettings(settings) {
  const { name, title, eyebrow, headlineA, headlineB, headlineC, heroPrimaryLabel, heroSecondaryLabel, profileImage, seoTitle, seoDescription, intro, about, email, location, availability, github, linkedin, instagram, resumeUrl, accent, services } = settings
  return { name, title, eyebrow, headlineA, headlineB, headlineC, heroPrimaryLabel, heroSecondaryLabel, profileImage, seoTitle, seoDescription, intro, about, email, location, availability, github, linkedin, instagram, resumeUrl, accent, services: Array.isArray(services) && services.length ? services : defaultServices }
}
