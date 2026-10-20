import test from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import { findAvailablePort } from './port-utils.mjs'

async function reservePort(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

test('findAvailablePort skips occupied ports', async () => {
  const occupied = await reservePort(45678)
  const freePort = await findAvailablePort(45678, 3)

  assert.notEqual(freePort, 45678)
  assert.ok(freePort >= 45678)

  await new Promise((resolve, reject) => occupied.close((error) => (error ? reject(error) : resolve())))
})
