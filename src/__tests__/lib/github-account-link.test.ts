import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ create: vi.fn(), deleteMany: vi.fn(), findUnique: vi.fn(), findUser: vi.fn() }))
vi.mock('@/db/db', () => ({
  db: {
    verificationToken: { create: mocks.create, deleteMany: mocks.deleteMany },
    account: { findUnique: mocks.findUnique },
    user: { findUnique: mocks.findUser },
  },
}))

import {
  authSessionDigest,
  authorizeGitHubLink,
  consumeGitHubLinkIntent,
  GITHUB_LINK_COOKIE,
  issueGitHubLinkIntent,
} from '@/lib/github-account-link'

const session = [{ name: '__Secure-authjs.session-token', value: 'actor-a-session' }]

describe('explicit GitHub linking intent', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('AUTH_SECRET', 'test-only-signing-secret-for-account-linking')
    mocks.create.mockResolvedValue({})
    mocks.deleteMany.mockResolvedValue({ count: 1 })
    mocks.findUnique.mockResolvedValue(null)
    mocks.findUser.mockResolvedValue({ id: 'actor-a' })
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it('binds the intent to the actor/session and consumes its server record once', async () => {
    const intent = await issueGitHubLinkIntent('actor-a', session)
    expect(await consumeGitHubLinkIntent(intent, 'actor-a', session)).toBe(true)
    const stored = mocks.create.mock.calls[0][0].data
    expect(stored.identifier).toBe('github-link:actor-a')
    expect(stored.token).toMatch(/^[a-f0-9]{64}$/)
    mocks.deleteMany.mockResolvedValue({ count: 0 })
    expect(await consumeGitHubLinkIntent(intent, 'actor-a', session)).toBe(false)
  })

  it('rejects account switching, logout and session rotation before any consume or link', async () => {
    const intent = await issueGitHubLinkIntent('actor-a', session)
    expect(await consumeGitHubLinkIntent(intent, 'actor-b', session)).toBe(false)
    expect(await consumeGitHubLinkIntent(intent, undefined, [])).toBe(false)
    expect(await consumeGitHubLinkIntent(intent, 'actor-a', [{ ...session[0], value: 'new-session' }])).toBe(false)
    expect(mocks.deleteMany).not.toHaveBeenCalled()
  })

  it('rejects modified and expired challenges', async () => {
    vi.useFakeTimers()
    const intent = await issueGitHubLinkIntent('actor-a', session)
    expect(await consumeGitHubLinkIntent(`${intent}x`, 'actor-a', session)).toBe(false)
    vi.advanceTimersByTime(5 * 60 * 1000)
    expect(await consumeGitHubLinkIntent(intent, 'actor-a', session)).toBe(false)
    expect(mocks.deleteMany).not.toHaveBeenCalled()
  })

  it('requires explicit intent to link a new subject while logged in', async () => {
    expect(await authorizeGitHubLink('47820304', 'actor-a', session)).toBe(false)
    mocks.findUnique.mockResolvedValue({ userId: 'actor-b' })
    expect(await authorizeGitHubLink('47820304', 'actor-a', session)).toBe(false)
    mocks.findUnique.mockResolvedValue({ userId: 'actor-a' })
    expect(await authorizeGitHubLink('47820304', 'actor-a', session)).toBe(true)
  })

  it('permits ordinary anonymous login but never downgrades an interrupted link into login', async () => {
    expect(await authorizeGitHubLink('47820304', undefined, [])).toBe(true)
    const intent = await issueGitHubLinkIntent('actor-a', session)
    expect(await authorizeGitHubLink('47820304', undefined, [{ name: GITHUB_LINK_COOKIE, value: intent }])).toBe(false)
  })

  it('does not recreate an actor deleted while OAuth was in progress', async () => {
    const intent = await issueGitHubLinkIntent('actor-a', session)
    mocks.findUser.mockResolvedValue(null)
    expect(
      await authorizeGitHubLink('47820304', 'actor-a', [...session, { name: GITHUB_LINK_COOKIE, value: intent }])
    ).toBe(false)
    expect(mocks.deleteMany).not.toHaveBeenCalled()
  })

  it('hashes ordered cookie chunks and rejects missing or ambiguous chunks', () => {
    const chunks = [
      { name: '__Secure-authjs.session-token.1', value: 'session' },
      { name: '__Secure-authjs.session-token.0', value: 'actor-a-' },
    ]
    expect(authSessionDigest(chunks)).toBe(authSessionDigest(session))
    expect(authSessionDigest(chunks.slice(0, 1))).toBeNull()
    expect(authSessionDigest([...chunks, session[0]])).toBeNull()
    expect(authSessionDigest([])).toBeNull()
  })
})
