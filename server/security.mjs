import crypto from 'node:crypto'

export function makePasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string' || !stored.includes(':')) return false
  const [salt, expectedHex] = stored.split(':')
  try {
    const expected = Buffer.from(expectedHex, 'hex')
    const actual = crypto.scryptSync(password, salt, expected.length)
    return expected.length > 0 && crypto.timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

export function newSessionToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function randomId() {
  return crypto.randomUUID()
}

export function safeText(value, max = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function safeSlug(value) {
  return safeText(value, 120).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90)
}
