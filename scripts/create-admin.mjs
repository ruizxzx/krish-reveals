import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { ensureStorage, readDb, mutateDb } from '../server/db.mjs'
import { makePasswordHash } from '../server/security.mjs'

ensureStorage()
const rl = readline.createInterface({ input, output })
try {
  const current = readDb().admin
  if (current) {
    const replace = (await rl.question(`An admin exists (${current.email}). Replace its credentials? Type RESET to continue: `)).trim()
    if (replace !== 'RESET') { console.log('No changes made.'); process.exitCode = 0 }
    else await create()
  } else await create()
} finally { rl.close() }

async function create() {
  const email = (await rl.question('Admin email: ')).trim().toLowerCase()
  const password = await rl.question('Password (minimum 12 characters): ')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.')
  if (password.length < 12) throw new Error('Password must be at least 12 characters.')
  mutateDb((db) => { db.admin = { email, passwordHash: makePasswordHash(password), createdAt: new Date().toISOString() }; db.sessions = [] })
  console.log(`Admin account saved for ${email}. Sign in at /admin.`)
}
