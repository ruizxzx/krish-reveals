import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { ensureStorage } from '../server/db.mjs'
import { convexConfigured, getAdmin, setAdmin } from '../server/convex-store.mjs'
import { makePasswordHash } from '../server/security.mjs'

if (!convexConfigured()) ensureStorage()
const rl = readline.createInterface({ input, output })
try {
  const current = await getAdmin()
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
  await setAdmin({ email, passwordHash: makePasswordHash(password), createdAt: new Date().toISOString() })
  console.log(`Admin account saved for ${email}. Sign in at /admin.`)
}
