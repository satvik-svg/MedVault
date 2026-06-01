import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const here = dirname(fileURLToPath(import.meta.url))

for (const envPath of [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
  resolve(here, '../../../.env'),
]) {
  if (existsSync(envPath)) dotenv.config({ path: envPath, override: false })
}

const prismaBin = resolve(here, '../node_modules/.bin/prisma')
const result = spawnSync(prismaBin, process.argv.slice(2), {
  cwd: resolve(here, '..'),
  env: process.env,
  stdio: 'inherit',
})

process.exit(result.status ?? 1)
