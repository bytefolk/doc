import { describe, expect, it, vi } from 'vitest'
import { initializeFreshPreviewDatabase } from '../../../services/collaboration/scripts/initialize-preview-database.mjs'

function dependencies(count: number) {
  const client = {
    connect: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue({ rows: [{ count }] }),
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
})
