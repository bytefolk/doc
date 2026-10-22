import { describe, expect, it, vi } from 'vitest'
import { fetchVerifiedGitHubProfile } from '@/lib/github-identity'

function responses(emails: unknown) {
  return vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ id: 47820304, login: 'PeterGuy326', email: 'unverified-public@example.test' })
    )
    .mockResolvedValueOnce(Response.json(emails))
}

describe('verified GitHub identity', () => {
  it('uses only the primary verified email, overriding the public profile field', async () => {
    const fetcher = responses([
      { email: 'secondary@example.test', primary: false, verified: true },
      { email: 'verified@example.test', primary: true, verified: true },
    ])
    expect(await fetchVerifiedGitHubProfile('synthetic-token', fetcher)).toMatchObject({
      id: 47820304,
      email: 'verified@example.test',
    })
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.objectContaining({ redirect: 'error', signal: expect.any(AbortSignal) })
    )
  })

  it('rejects unverified primary and verified secondary emails instead of silently selecting one', async () => {
    const fetcher = responses([
      { email: 'unverified@example.test', primary: true, verified: false },
      { email: 'secondary@example.test', primary: false, verified: true },
    ])
    await expect(fetchVerifiedGitHubProfile('synthetic-token', fetcher)).rejects.toThrow('identity verification failed')
  })

  it('fails closed if GitHub email lookup is unavailable', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: 47820304, login: 'PeterGuy326' }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
    await expect(fetchVerifiedGitHubProfile('synthetic-token', fetcher)).rejects.toThrow('identity verification failed')
  })

  it.each([
    { id: 0, login: 'PeterGuy326' },
    { id: 47820304, login: ' ' },
  ])('rejects a malformed stable GitHub identity', async (profile) => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json(profile))
      .mockResolvedValueOnce(Response.json([{ email: 'verified@example.test', primary: true, verified: true }]))
    await expect(fetchVerifiedGitHubProfile('synthetic-token', fetcher)).rejects.toThrow('identity verification failed')
  })
})
