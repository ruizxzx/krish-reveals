import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import process from 'node:process'
import { findAvailablePort } from './port-utils.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const children = []

async function start() {
  const preferredPort = Number(process.env.PORT || 8787)
  const apiPort = await findAvailablePort(preferredPort)

  if (apiPort !== preferredPort) {
    console.log(`[dev] Port ${preferredPort} is in use, switching API server to ${apiPort}.`)
  }

  function launch(label, args, extraEnv = {}) {
    const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', env: { ...process.env, PORT: String(apiPort), ...extraEnv } })
    child.on('exit', (code) => {
      if (code && code !== 0) console.error(`${label} exited with code ${code}`)
    })
    children.push(child)
  }

  launch('API server', ['server/index.mjs'])
  launch('Vite', [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '0.0.0.0'])
}

start().catch((error) => {
  console.error('Failed to start the dev environment:', error)
  process.exit(1)
})

function shutdown() {
  for (const child of children) child.kill('SIGTERM')
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
