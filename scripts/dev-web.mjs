import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(new URL('..', import.meta.url).pathname)
const frontendRoot = resolve(root, 'apps/frontend')
const viteEntry = resolve(frontendRoot, 'node_modules/vite/dist/node/index.js')
const preferredPort = Number.parseInt(process.env.FRONTEND_PORT || process.env.PORT || '3000', 10)
process.env.CI ||= 'true'
const vite = await import(pathToFileURL(viteEntry).href)
const createServer = vite.createServer || vite.default?.createServer

if (!createServer) {
  throw new Error('Unable to load Vite createServer API')
}

const server = await createServer({
  root: frontendRoot,
  server: {
    host: '127.0.0.1',
    port: preferredPort,
    strictPort: false,
  },
})

await server.listen()
console.log('[frontend] MedVault web app is running. Open the URL below, not the API server URL.')
server.printUrls()

const keepAlive = setInterval(() => {}, 2 ** 31 - 1)

async function stop(signal) {
  console.log(`\n[frontend] received ${signal}, stopping Vite...`)
  clearInterval(keepAlive)
  await server.close()
  process.exit(0)
}

process.once('SIGINT', () => void stop('SIGINT'))
// Vite's dev server registers its own SIGTERM listener and may close the HTTP
// server when pnpm sends a wrapper-level signal. For local dev, keep the web
// server alive and let Ctrl+C (SIGINT) be the explicit stop path.
process.removeAllListeners('SIGTERM')
process.on('SIGTERM', () => {
  console.log('\n[frontend] ignored SIGTERM from parent wrapper; press Ctrl+C to stop Vite.')
})
