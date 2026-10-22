import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import pg from 'pg'

// Names and extension memberships were confirmed on the managed server. This
// list never exempts tables or an entire namespace. Canonical definitions,
// owners and dependencies must also match that server's template1 below.
const monitoringViews = new Map([
  ['public.pg_stat_statements', 'pg_stat_statements'],
  ['public.pg_stat_statements_info', 'pg_stat_statements'],
  ['public.pg_stat_kcache', 'pg_stat_kcache'],
  ['public.pg_stat_kcache_detail', 'pg_stat_kcache'],
  ['metric_helpers.index_bloat', null],
  ['metric_helpers.nearly_exhausted_sequences', null],
  ['metric_helpers.pg_stat_statements', null],
  ['metric_helpers.table_bloat', null],
])

const relationMetadataQuery = `
  SELECT namespace.nspname AS schema_name, relation.relname AS relation_name,
         relation.relkind AS kind, pg_get_userbyid(relation.relowner) AS owner_name,
         CASE WHEN relation.relkind = 'v' THEN pg_get_viewdef(relation.oid, true) END AS definition,
         extension.extname AS extension_name,
         COALESCE((
           SELECT json_agg(pg_describe_object(dependency.refclassid, dependency.refobjid, dependency.refobjsubid)
                           ORDER BY pg_describe_object(dependency.refclassid, dependency.refobjid, dependency.refobjsubid))
           FROM pg_rewrite AS rewrite
           JOIN pg_depend AS dependency ON dependency.classid = 'pg_rewrite'::regclass
             AND dependency.objid = rewrite.oid AND dependency.deptype = 'n'
           WHERE rewrite.ev_class = relation.oid
             AND NOT (dependency.refclassid = 'pg_class'::regclass AND dependency.refobjid = relation.oid)
         ), '[]'::json) AS dependencies
  FROM pg_class AS relation
  JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
  LEFT JOIN pg_depend AS extension_dependency ON extension_dependency.classid = 'pg_class'::regclass
    AND extension_dependency.objid = relation.oid
    AND extension_dependency.refclassid = 'pg_extension'::regclass AND extension_dependency.deptype = 'e'
  LEFT JOIN pg_extension AS extension ON extension.oid = extension_dependency.refobjid
  WHERE namespace.nspname !~ '^pg_' AND namespace.nspname <> 'information_schema'
    AND relation.relkind IN ('r', 'p', 'v', 'm', 'f')
  ORDER BY namespace.nspname, relation.relname
`

function isMonitoringCandidate(relation) {
  const key = `${relation.schema_name}.${relation.relation_name}`
  return (
    relation.kind === 'v' &&
    monitoringViews.has(key) &&
    relation.extension_name === monitoringViews.get(key) &&
    typeof relation.owner_name === 'string' &&
    typeof relation.definition === 'string' &&
    Array.isArray(relation.dependencies)
  )
}

function monitoringFingerprint(relation) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        owner: relation.owner_name,
        definition: relation.definition,
        extension: relation.extension_name,
        dependencies: relation.dependencies,
      })
    )
    .digest('hex')
}

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
  const databaseUrl = new URL(environment.DATABASE_URL)
  const databaseName = decodeURIComponent(databaseUrl.pathname).slice(1).toLowerCase()
  if (!databaseName || ['template0', 'template1', 'postgres'].includes(databaseName)) {
    throw new Error('A template or maintenance database cannot be initialized')
  }

  const client = createClient(environment.DATABASE_URL)
  try {
    await client.connect()
    const { rows: relations } = await client.query(relationMetadataQuery)
    if (relations.length) {
      if (
        environment.DOC_FRESH_PREVIEW_ALLOW_MANAGED_MONITORING !== '1' ||
        relations.some((relation) => !isMonitoringCandidate(relation))
      ) {
        throw new Error('Preview initialization requires an empty database')
      }
      const baselineUrl = new URL(databaseUrl)
      baselineUrl.pathname = '/template1'
      const baselineClient = createClient(baselineUrl.toString())
      try {
        await baselineClient.connect()
        const { rows: baseline } = await baselineClient.query(relationMetadataQuery)
        const baselineByName = new Map(
          baseline
            .filter(isMonitoringCandidate)
            .map((relation) => [`${relation.schema_name}.${relation.relation_name}`, relation])
        )
        for (const relation of relations) {
          const reference = baselineByName.get(`${relation.schema_name}.${relation.relation_name}`)
          if (!reference || monitoringFingerprint(reference) !== monitoringFingerprint(relation)) {
            throw new Error('Preview monitoring views differ from the managed template database')
          }
        }
      } finally {
        await baselineClient.end()
      }
    }
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
