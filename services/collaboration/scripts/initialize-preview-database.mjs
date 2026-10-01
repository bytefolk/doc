import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import pg from 'pg'

export async function initializeFreshPreviewDatabase({
  environment = process.env,
  createClient = (connectionString) => new pg.Client({ connectionString }),
  runCommand = () => {
    const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'db:push'], {
      stdio: 'inherit',
      env: environment,
      shell: process.platform === 'win32',
    })
    return result.status ?? 1
  },
} = {}) {
  if (environment.DOC_FRESH_PREVIEW_DATABASE !== '1') {
    throw new Error('Explicit fresh-preview database initialization is required')
  }
  if (!environment.DATABASE_URL) throw new Error('Preview database is not configured')

  const client = createClient(environment.DATABASE_URL)
  try {
    await client.connect()
    // Reject any user relation, including views and tables in non-public schemas.
    const result = await client.query(`
      SELECT COUNT(*)::int AS count
      FROM pg_class AS relation
      JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname !~ '^pg_'
        AND namespace.nspname <> 'information_schema'
        AND relation.relkind IN ('r', 'p', 'v', 'm', 'f')
    `)
    if (result.rows[0]?.count !== 0) throw new Error('Preview initialization requires an empty database')
  } finally {
    await client.end()
  }

  if (runCommand() !== 0) throw new Error('Preview schema initialization failed')
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  initializeFreshPreviewDatabase().catch(() => {
    // Connection errors can contain credentials. Keep deployment logs bounded.
    console.error('doc preview schema initialization failed; verify the fresh database and configuration')
    process.exitCode = 1
  })
}
