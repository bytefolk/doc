import { describe, expect, it, vi } from 'vitest'
import { initializeFreshPreviewDatabase } from '../../../services/collaboration/scripts/initialize-preview-database.mjs'

function relation(schemaName: string, relationName: string, kind = 'v', extensionName: string | null = null) {
  return {
    schema_name: schemaName,
    relation_name: relationName,
    kind,
    extension_name: extensionName,
    owner_name: 'postgres',
    definition: ' SELECT metric_helpers.monitor();',
    dependencies: ['function metric_helpers.monitor()'],
  }
}

function dependencies(count: number) {
  const client = {
    connect: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue({ rows: count ? [relation('public', 'existing', 'r')] : [] }),
    end: vi.fn().mockResolvedValue(undefined),
  }
  return {
    client,
    options: {
      environment: {
        NODE_ENV: 'test' as const,
        DOC_FRESH_PREVIEW_DATABASE: '1',
        DATABASE_URL: 'postgresql://preview.test/empty',
      },
      createClient: vi.fn().mockReturnValue(client),
      runCommand: vi.fn().mockReturnValue(0),
    },
  }
}

function managedDependencies() {
  const setup = dependencies(0)
  const views = [
    relation('public', 'pg_stat_statements', 'v', 'pg_stat_statements'),
    relation('public', 'pg_stat_statements_info', 'v', 'pg_stat_statements'),
    relation('public', 'pg_stat_kcache', 'v', 'pg_stat_kcache'),
    relation('public', 'pg_stat_kcache_detail', 'v', 'pg_stat_kcache'),
    ...['index_bloat', 'nearly_exhausted_sequences', 'pg_stat_statements', 'table_bloat'].map((name) =>
      relation('metric_helpers', name)
    ),
  ]
  setup.client.query.mockResolvedValue({ rows: views })
  const baseline = {
    connect: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue({ rows: structuredClone(views) }),
    end: vi.fn().mockResolvedValue(undefined),
  }
  setup.options.createClient.mockReset().mockReturnValueOnce(setup.client).mockReturnValueOnce(baseline)
  return {
    ...setup,
    baseline,
    views,
    options: {
      ...setup.options,
      environment: { ...setup.options.environment, DOC_FRESH_PREVIEW_ALLOW_MANAGED_MONITORING: '1' },
    },
  }
}

describe('fresh preview database initializer', () => {
  it('refuses to connect without explicit preview initialization intent', async () => {
    const { options } = dependencies(0)
    await expect(initializeFreshPreviewDatabase({ ...options, environment: { NODE_ENV: 'test' } })).rejects.toThrow(
      'Explicit fresh-preview'
    )
    expect(options.createClient).not.toHaveBeenCalled()
    expect(options.runCommand).not.toHaveBeenCalled()
  })

  it('refuses schema mutation when any existing relation is present', async () => {
    const { options, client } = dependencies(1)
    await expect(initializeFreshPreviewDatabase(options)).rejects.toThrow('empty database')
    expect(options.runCommand).not.toHaveBeenCalled()
    expect(client.end).toHaveBeenCalled()
  })

  it.each(['template0', 'template1', '%74emplate1', 'postgres'])(
    'rejects empty protected database %s before connecting',
    async (name) => {
      const { options } = dependencies(0)
      options.environment.DATABASE_URL = `postgresql://preview.test/${name}`
      await expect(initializeFreshPreviewDatabase(options)).rejects.toThrow('maintenance database')
      expect(options.createClient).not.toHaveBeenCalled()
      expect(options.runCommand).not.toHaveBeenCalled()
    }
  )

  it('runs the guarded repository schema command only after checking an empty database', async () => {
    const { options, client } = dependencies(0)
    await initializeFreshPreviewDatabase(options)
    expect(client.query).toHaveBeenCalled()
    expect(client.end).toHaveBeenCalled()
    expect(options.runCommand).toHaveBeenCalledOnce()
  })

  it('never reports success when the schema command fails', async () => {
    const { options } = dependencies(0)
    options.runCommand.mockReturnValue(1)
    await expect(initializeFreshPreviewDatabase(options)).rejects.toThrow('schema initialization failed')
  })

  it('allows only confirmed monitoring views identical to template1 with explicit opt-in', async () => {
    const { options, client, baseline } = managedDependencies()
    await initializeFreshPreviewDatabase(options)
    expect(options.createClient).toHaveBeenNthCalledWith(2, 'postgresql://preview.test/template1')
    expect(client.query.mock.calls[0][0]).toContain("extension_dependency.refclassid = 'pg_extension'::regclass")
    expect(client.query.mock.calls[0][0]).toContain("extension_dependency.deptype = 'e'")
    expect(baseline.end).toHaveBeenCalledOnce()
    expect(client.end).toHaveBeenCalledOnce()
    expect(options.runCommand).toHaveBeenCalledOnce()
  })

  it('retains strict relation rejection without the monitoring opt-in', async () => {
    const { options } = managedDependencies()
    options.environment.DOC_FRESH_PREVIEW_ALLOW_MANAGED_MONITORING = '0'
    await expect(initializeFreshPreviewDatabase(options)).rejects.toThrow('empty database')
    expect(options.createClient).toHaveBeenCalledOnce()
    expect(options.runCommand).not.toHaveBeenCalled()
  })

  it.each(['r', 'p', 'm', 'f'])(
    'never exempts %s relations even with a monitoring name and extension',
    async (kind) => {
      const { options, client } = managedDependencies()
      client.query.mockResolvedValue({ rows: [relation('public', 'pg_stat_statements', kind, 'pg_stat_statements')] })
      await expect(initializeFreshPreviewDatabase(options)).rejects.toThrow('empty database')
      expect(options.runCommand).not.toHaveBeenCalled()
    }
  )

  it.each([
    relation('metric_helpers', 'unknown_view'),
    relation('public', 'unknown_view', 'v', 'pg_stat_statements'),
    relation('public', 'pg_stat_statements'),
    relation('public', 'pg_stat_statements', 'v', 'unconfirmed_extension'),
  ])('rejects unknown views and incorrect extension membership', async (extra) => {
    const { options, client, views } = managedDependencies()
    client.query.mockResolvedValue({ rows: [...views, extra] })
    await expect(initializeFreshPreviewDatabase(options)).rejects.toThrow('empty database')
    expect(options.runCommand).not.toHaveBeenCalled()
  })

  it.each(['definition', 'owner_name', 'dependencies'])('rejects a changed monitoring %s', async (field) => {
    const { options, baseline, views } = managedDependencies()
    const changed = structuredClone(views)
    Object.assign(changed[4], { [field]: field === 'dependencies' ? ['function user_data.changed()'] : 'changed' })
    baseline.query.mockResolvedValue({ rows: changed })
    await expect(initializeFreshPreviewDatabase(options)).rejects.toThrow('differ from')
    expect(options.runCommand).not.toHaveBeenCalled()
    expect(baseline.end).toHaveBeenCalledOnce()
  })

  it('rejects missing baseline views and closes both clients', async () => {
    const { options, client, baseline } = managedDependencies()
    baseline.query.mockResolvedValue({ rows: [] })
    await expect(initializeFreshPreviewDatabase(options)).rejects.toThrow('differ from')
    expect(options.runCommand).not.toHaveBeenCalled()
    expect(client.end).toHaveBeenCalledOnce()
    expect(baseline.end).toHaveBeenCalledOnce()
  })

  it('refuses schema mutation if reading the template database fails', async () => {
    const { options, client, baseline } = managedDependencies()
    baseline.query.mockRejectedValue(new Error('baseline unavailable'))
    await expect(initializeFreshPreviewDatabase(options)).rejects.toThrow('baseline unavailable')
    expect(options.runCommand).not.toHaveBeenCalled()
    expect(client.end).toHaveBeenCalledOnce()
    expect(baseline.end).toHaveBeenCalledOnce()
  })
})
