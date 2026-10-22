import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), findUnique: vi.fn(), issue: vi.fn(), setCookie: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('auth', () => ({ auth: mocks.auth }))
vi.mock('@/db/db', () => ({ db: { user: { findUnique: mocks.findUnique } } }))
vi.mock('@/lib/session', () => ({ getUserInfo: vi.fn() }))
vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [{ name: 'authjs.session-token', value: 'session' }], set: mocks.setCookie }),
}))
vi.mock('@/lib/github-account-link', () => ({
  GITHUB_LINK_COOKIE: 'doc.github-link-intent',
  issueGitHubLinkIntent: mocks.issue,
}))

import { POST } from '@/app/api/account-connections/github/route'

function request(origin = 'https://doc.test') {
  return new Request('https://doc.test/api/account-connections/github', { method: 'POST', headers: { origin } })
}

describe('GitHub account-link start', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('AUTH_URL', 'https://doc.test')
    vi.stubEnv('NEXTAUTH_URL', 'https://doc.test')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://doc.test')
    vi.stubEnv('AUTH_GITHUB_ID', 'configured-client')
    vi.stubEnv('AUTH_GITHUB_SECRET', 'configured-secret')
    mocks.auth.mockResolvedValue({ user: { id: 'actor-a' } })
    mocks.findUnique.mockResolvedValue({ id: 'actor-a' })
    mocks.issue.mockResolvedValue('signed-intent')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('requires same-origin intent and an authenticated actor', async () => {
    expect((await POST(request('https://other.test'))).status).toBe(403)
    expect(mocks.issue).not.toHaveBeenCalled()
    mocks.auth.mockResolvedValue(null)
    expect((await POST(request())).status).toBe(401)
    expect(mocks.issue).not.toHaveBeenCalled()
  })

  it('binds to the stable session user and stores an HttpOnly HTTPS cookie', async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { id: 'actor-a' }, select: { id: true } })
    expect(mocks.issue).toHaveBeenCalledWith('actor-a', [{ name: 'authjs.session-token', value: 'session' }])
    expect(mocks.setCookie).toHaveBeenCalledWith('doc.github-link-intent', 'signed-intent', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 900,
    })
    expect(await response.json()).toEqual({ data: { ready: true } })
  })

  it('does not issue an intent for unconfigured OAuth', async () => {
    vi.stubEnv('AUTH_GITHUB_SECRET', '')
    expect((await POST(request())).status).toBe(503)
    expect(mocks.issue).not.toHaveBeenCalled()
  })
})
