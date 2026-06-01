import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import pg from 'pg'

const { Client } = pg
const here = dirname(fileURLToPath(import.meta.url))
const schemaPath = resolve(here, '../db/schema.sql')
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!connectionString) {
  console.error('DATABASE_URL or POSTGRES_URL is required.')
  process.exit(1)
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

try {
  const sql = await readFile(schemaPath, 'utf8')
  await client.connect()
  await client.query(sql)
  const { rows } = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `)
  console.log(`Initialized ${rows.length} public tables:`)
  console.log(rows.map((row) => `- ${row.table_name}`).join('\n'))
} finally {
  await client.end().catch(() => {})
}
