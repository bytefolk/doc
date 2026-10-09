import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getUserInfo: vi.fn(), findFirst: vi.fn() }))
vi.mock('@/lib/session', () => ({ getUserInfo: mocks.getUserInfo }))
vi.mock('@/db/db', () => ({ db: { account: { findFirst: mocks.findFirst } } }))

import { GET } from '@/app/api/account-connections/route'

describe('account connections', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.getUserInfo.mockResolvedValue({ id: 'user-1' })
    mocks.findFirst.mockResolvedValue(null)
    vi.stubEnv('AUTH_GITHUB_ID', 'configured-client')
    vi.stubEnv('AUTH_GITHUB_SECRET', 'configured-secret')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('requires a session before reading any provider accounts', async () => {
    mocks.getUserInfo.mockResolvedValue(null)
    const response = await GET()
    expect(response.status).toBe(401)
    expect(mocks.findFirst).not.toHaveBeenCalled()
  })

  it('selects only the current user and returns no provider credentials', async () => {
    mocks.findFirst.mockResolvedValue({ provider: 'github', access_token: 'must-not-leak' })
    const response = await GET()
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', provider: 'github' },
      select: { provider: true },
    })
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ data: { github: { enabled: true, connected: true } } })
  })

  it('does not offer connection with partially configured OAuth', async () => {
    vi.stubEnv('AUTH_GITHUB_SECRET', '')
    expect(await (await GET()).json()).toEqual({ data: { github: { enabled: false, connected: false } } })
  })

  it('reports unavailable instead of claiming an account is disconnected after database failure', async () => {
    mocks.findFirst.mockRejectedValue(new Error('private connection details'))
    const response = await GET()
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      error: { code: 'unavailable', message: 'Could not load connected accounts' },
    })
  })
})
