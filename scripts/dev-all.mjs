import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const args = new Set(process.argv.slice(2))
const backendRoot = resolve(root, 'apps/backend')
const abdmMockRoot = resolve(root, 'apps/abdm-mock')
const blockchainWorkerRoot = resolve(root, 'apps/blockchain-worker')
const aiServiceRoot = resolve(root, 'apps/ai-service')
const aiServiceVenvPython = resolve(aiServiceRoot, '.venv/bin/python')

if (args.has('--help') || args.has('-h')) {
  console.log(`MedVault dev runner

Usage:
  pnpm dev
  pnpm dev:all
  node scripts/dev-all.mjs

Options:
  --no-ai        Skip FastAPI AI service
  --no-worker    Skip blockchain worker
  --no-mock      Skip ABDM mock service
  --no-frontend  Skip frontend
  --no-backend   Skip backend
`)
  process.exit(0)
}

const services = [
  {
    name: 'backend',
    enabled: !args.has('--no-backend'),
    command: resolve(backendRoot, 'node_modules/.bin/tsx'),
    args: ['watch', 'src/server.ts'],
    cwd: backendRoot,
  },
  {
    name: 'frontend',
    enabled: !args.has('--no-frontend'),
    command: process.execPath,
    args: [resolve(root, 'scripts/dev-web.mjs')],
    cwd: root,
    inheritStdin: true,
  },
  {
    name: 'abdm-mock',
    enabled: !args.has('--no-mock'),
    command: resolve(abdmMockRoot, 'node_modules/.bin/tsx'),
    args: ['watch', 'src/server.ts'],
    cwd: abdmMockRoot,
  },
  {
    name: 'blockchain-worker',
    enabled: !args.has('--no-worker'),
    command: resolve(blockchainWorkerRoot, 'node_modules/.bin/tsx'),
    args: ['watch', 'src/index.ts'],
    cwd: blockchainWorkerRoot,
  },
  {
    name: 'ai-service',
    enabled: !args.has('--no-ai'),
    command:
      process.env.PYTHON ||
      (existsSync(aiServiceVenvPython)
        ? aiServiceVenvPython
        : existsSync('/opt/homebrew/bin/python3.11')
          ? '/opt/homebrew/bin/python3.11'
          : 'python3.11'),
    args: ['-m', 'uvicorn', 'src.main:app', '--host', '0.0.0.0', '--port', '8000', '--reload'],
    cwd: aiServiceRoot,
  },
].filter((service) => service.enabled)

if (services.length === 0) {
  console.error('No services selected.')
  process.exit(1)
}

let shuttingDown = false
const children = new Map()

function prefixLines(serviceName, stream, writer) {
  let buffer = ''
  stream.on('data', (chunk) => {
    buffer += chunk.toString()
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (line.trim().length > 0) writer.write(`[${serviceName}] ${line}\n`)
    }
  })
  stream.on('end', () => {
    if (buffer.trim().length > 0) writer.write(`[${serviceName}] ${buffer}\n`)
  })
}

function stopAll(signal = 'SIGTERM') {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`\n[dev] Stopping ${children.size} service(s)...`)
  for (const child of children.values()) {
    if (!child.killed) child.kill(signal)
  }
}

process.on('SIGINT', () => stopAll('SIGINT'))
process.on('SIGTERM', () => stopAll('SIGTERM'))

console.log('[dev] Starting MedVault services:')
for (const service of services) {
  console.log(`[dev] - ${service.name}`)
}
console.log('[dev] Press Ctrl+C to stop all services.\n')

for (const service of services) {
  const child = spawn(service.command, service.args, {
    cwd: service.cwd,
    env: { ...process.env, ...service.env },
    // Vite 8 treats stdin ending as a parent shutdown signal. When the frontend
    // is included in the all-in-one runner, attach it to the real terminal.
    stdio: [service.inheritStdin ? 'inherit' : 'pipe', 'pipe', 'pipe'],
  })

  children.set(service.name, child)
  prefixLines(service.name, child.stdout, process.stdout)
  prefixLines(service.name, child.stderr, process.stderr)

  child.on('error', (error) => {
    console.error(`[${service.name}] Failed to start: ${error.message}`)
  })

  child.on('exit', (code, signal) => {
    children.delete(service.name)
    if (!shuttingDown) {
      const reason = signal ? `signal ${signal}` : `code ${code}`
      console.error(`[${service.name}] exited with ${reason}`)
      console.error('[dev] Other services are still running. Press Ctrl+C to stop them.')
    }
    if (shuttingDown && children.size === 0) process.exit(0)
  })
}
