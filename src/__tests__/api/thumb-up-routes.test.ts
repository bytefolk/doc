import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  pubFindUnique: vi.fn(),
  pubUpdate: vi.fn(),
  pubUpdateMany: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/db/db', () => ({
  db: {
    pubDoc: {
      findUnique: mocks.pubFindUnique,
      update: mocks.pubUpdate,
      updateMany: mocks.pubUpdateMany,
    },
  },
}))

import { PATCH as increase } from '@/app/api/pub/thumb-up/[publishId]/route'
import { PATCH as decrease } from '@/app/api/pub/thumb-up-decrease/[publishId]/route'

const params = { params: { publishId: 'published-doc' } }

describe('published document like persistence', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
  })

  it('persists a like increment', async () => {
    mocks.pubUpdate.mockResolvedValue({
      publishId: 'published-doc',
      thumbUpCount: 2,
    })

    const response = await increase(new Request('http://doc.test/api/pub/thumb-up/published-doc'), params)

    expect(mocks.pubUpdate).toHaveBeenCalledWith({
      where: { publishId: 'published-doc' },
      data: { thumbUpCount: { increment: 1 } },
    })
    await expect(response.json()).resolves.toEqual({
      errno: 0,
      data: { publishId: 'published-doc', thumbUpCount: 2 },
    })
  })

  it('persists a like cancellation and returns the decremented count', async () => {
    mocks.pubUpdateMany.mockResolvedValue({ count: 1 })
    mocks.pubFindUnique.mockResolvedValue({
      publishId: 'published-doc',
      thumbUpCount: 1,
    })

    const response = await decrease(new Request('http://doc.test/api/pub/thumb-up-decrease/published-doc'), params)

    expect(mocks.pubUpdateMany).toHaveBeenCalledWith({
      where: { publishId: 'published-doc', thumbUpCount: { gt: 0 } },
      data: { thumbUpCount: { decrement: 1 } },
    })
    await expect(response.json()).resolves.toEqual({
      errno: 0,
      data: { publishId: 'published-doc', thumbUpCount: 1 },
    })
  })

  it('keeps a zero count nonnegative on duplicate cancellation', async () => {
    mocks.pubUpdateMany.mockResolvedValue({ count: 0 })
    mocks.pubFindUnique.mockResolvedValue({
      publishId: 'published-doc',
      thumbUpCount: 0,
    })

    const response = await decrease(new Request('http://doc.test/api/pub/thumb-up-decrease/published-doc'), params)

    await expect(response.json()).resolves.toEqual({
      errno: 0,
      data: { publishId: 'published-doc', thumbUpCount: 0 },
    })
  })

  it('does not report success when the publication is missing', async () => {
    mocks.pubUpdateMany.mockResolvedValue({ count: 0 })
    mocks.pubFindUnique.mockResolvedValue(null)

    const response = await decrease(new Request('http://doc.test/api/pub/thumb-up-decrease/published-doc'), params)

    await expect(response.json()).resolves.toEqual({
      errno: -1,
      msg: 'Publication not found',
    })
  })

  it('does not expose storage errors from like cancellation', async () => {
    mocks.pubUpdateMany.mockRejectedValue(new Error('database host and password'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await decrease(new Request('http://doc.test/api/pub/thumb-up-decrease/published-doc'), params)

    await expect(response.json()).resolves.toEqual({
      errno: -1,
      msg: 'Unable to update like count',
    })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
