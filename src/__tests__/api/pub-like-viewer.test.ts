import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveViewerId: vi.fn(),
  pubFindUnique: vi.fn(),
  likeFindUnique: vi.fn(),
  likeCreate: vi.fn(),
  likeDeleteMany: vi.fn(),
  pubUpdate: vi.fn(),
  pubUpdateMany: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/viewer-id', () => ({ resolveViewerId: mocks.resolveViewerId }))
vi.mock('@/db/db', () => ({
  db: {
    pubDoc: {
      findUnique: mocks.pubFindUnique,
      update: mocks.pubUpdate,
      updateMany: mocks.pubUpdateMany,
    },
    pubDocLike: {
      findUnique: mocks.likeFindUnique,
      create: mocks.likeCreate,
      deleteMany: mocks.likeDeleteMany,
    },
    $transaction: mocks.transaction,
  },
}))

import { GET, PATCH as increase } from '@/app/api/pub/thumb-up/[publishId]/route'
import { PATCH as decrease } from '@/app/api/pub/thumb-up-decrease/[publishId]/route'

const params = { publishId: 'pub-1' }
const request = new Request('http://doc.test/api/pub/thumb-up/pub-1', { method: 'PATCH' })

describe('published like GET/PATCH', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
    mocks.resolveViewerId.mockResolvedValue({ viewerId: 'anon-1', setCookie: false })
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        pubDoc: {
          findUnique: mocks.pubFindUnique,
          update: mocks.pubUpdate,
          updateMany: mocks.pubUpdateMany,
        },
        pubDocLike: {
          create: mocks.likeCreate,
          deleteMany: mocks.likeDeleteMany,
        },
      }),
    )
  })

  it('GET reports whether this viewer currently holds a like', async () => {
    mocks.pubFindUnique.mockResolvedValue({ id: 'doc-pub', thumbUpCount: 3 })
    mocks.likeFindUnique.mockResolvedValue({ id: 'like-1' })

    const response = await GET(request, { params })
    await expect(response.json()).resolves.toEqual({
      errno: 0,
      data: { liked: true, count: 3 },
    })
  })

  it('PATCH increase creates the like row before incrementing', async () => {
    mocks.pubFindUnique.mockResolvedValue({ id: 'doc-pub', thumbUpCount: 0 })
    mocks.likeCreate.mockResolvedValue({ id: 'like-1' })
    mocks.pubUpdate.mockResolvedValue({ thumbUpCount: 1 })

    const response = await increase(request, { params })
    await expect(response.json()).resolves.toEqual({
      errno: 0,
      data: { liked: true, count: 1 },
    })
    expect(mocks.likeCreate).toHaveBeenCalledWith({
      data: { viewerId: 'anon-1', pubDocId: 'doc-pub' },
    })
    expect(mocks.pubUpdate).toHaveBeenCalledWith({
      where: { publishId: 'pub-1' },
      data: { thumbUpCount: { increment: 1 } },
      select: { thumbUpCount: true },
    })
  })

  it('PATCH increase is idempotent when create hits the unique constraint', async () => {
    mocks.pubFindUnique
      .mockResolvedValueOnce({ id: 'doc-pub', thumbUpCount: 1 })
      .mockResolvedValueOnce({ id: 'doc-pub', thumbUpCount: 1 })
    mocks.likeCreate.mockRejectedValue({ code: 'P2002' })

    const response = await increase(request, { params })
    await expect(response.json()).resolves.toEqual({
      errno: 0,
      data: { liked: true, count: 1 },
    })
    expect(mocks.pubUpdate).not.toHaveBeenCalled()
  })

  it('PATCH decrease deletes and decrements in one transaction', async () => {
    mocks.pubFindUnique
      .mockResolvedValueOnce({ id: 'doc-pub', thumbUpCount: 2 })
      .mockResolvedValueOnce({ id: 'doc-pub', thumbUpCount: 1 })
    mocks.likeDeleteMany.mockResolvedValue({ count: 1 })
    mocks.pubUpdateMany.mockResolvedValue({ count: 1 })

    const response = await decrease(request, { params })
    await expect(response.json()).resolves.toEqual({
      errno: 0,
      data: { liked: false, count: 1 },
    })
    expect(mocks.likeDeleteMany).toHaveBeenCalledWith({
      where: { viewerId: 'anon-1', pubDocId: 'doc-pub' },
    })
    expect(mocks.pubUpdateMany).toHaveBeenCalledWith({
      where: { publishId: 'pub-1', thumbUpCount: { gt: 0 } },
      data: { thumbUpCount: { decrement: 1 } },
    })
  })

  it('PATCH decrease does not decrement when this viewer has no like', async () => {
    mocks.pubFindUnique.mockResolvedValue({ id: 'doc-pub', thumbUpCount: 2 })
    mocks.likeDeleteMany.mockResolvedValue({ count: 0 })

    const response = await decrease(request, { params })
    await expect(response.json()).resolves.toEqual({
      errno: 0,
      data: { liked: false, count: 2 },
    })
    expect(mocks.pubUpdateMany).not.toHaveBeenCalled()
  })
})
