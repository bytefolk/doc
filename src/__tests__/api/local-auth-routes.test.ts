import { afterEach, describe, expect, it } from 'vitest'
import { GET as guidance } from '@/app/api/local-auth/guidance/route'
import { GET as magicLink } from '@/app/api/local-auth/magic-link/route'

describe('local auth convenience routes', () => {
  const original = { ...process.env }
  const env = process.env as unknown as Record<string, string | undefined>

  afterEach(() => {
    env.NODE_ENV = original.NODE_ENV
    env.DOC_MAILPIT_URL = original.DOC_MAILPIT_URL
    env.DOC_LOCAL_AUTH_HINT = original.DOC_LOCAL_AUTH_HINT
  })

  it('does not expose Mailpit guidance in production', async () => {
    env.NODE_ENV = 'production'
    env.DOC_MAILPIT_URL = 'http://localhost:8025'
    const response = await guidance()
    await expect(response.json()).resolves.toEqual({ enabled: false, mailpitUrl: null })
  })

  it('does not invent a magic link when Mailpit is unavailable', async () => {
    env.NODE_ENV = 'development'
    env.DOC_MAILPIT_URL = 'http://127.0.0.1:1'
    const response = await magicLink(new Request('http://doc.test/api/local-auth/magic-link?email=a@b.c'))
    await expect(response.json()).resolves.toEqual({ enabled: true, url: null })
  })
})
