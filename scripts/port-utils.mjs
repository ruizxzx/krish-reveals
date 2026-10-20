import net from 'node:net'

export async function findAvailablePort(startPort = 8787, maxAttempts = 25) {
  let currentPort = Number(startPort)

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const port = await new Promise((resolve, reject) => {
      const server = net.createServer()

      server.once('error', (error) => {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'EADDRINUSE') {
          resolve(null)
          return
        }
        reject(error)
      })

      server.listen(currentPort, '127.0.0.1', () => {
        const address = server.address()
        server.close(() => resolve(typeof address === 'object' && address ? address.port : currentPort))
      })
    })

    if (port !== null) return port
    currentPort += 1
  }

  throw new Error(`Could not find an available port starting from ${startPort}.`)
}
