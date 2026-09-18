import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUserInfo: vi.fn(),
  findMany: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/session', () => ({ getUserInfo: mocks.getUserInfo }))
vi.mock('@/db/db', () => ({
  db: {
    doc: {
      findMany: mocks.findMany,
    },
  },
}))
vi.mock('@/lib/mailer', () => ({ sendEmail: vi.fn() }))

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/doc/route'

function searchRequest(query: string) {
  return new NextRequest(`http://doc.test/api/doc?${query}`)
}

describe('GET /api/doc search', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
    mocks.getUserInfo.mockResolvedValue({ id: 'user-1' })
  })

  it('searches title or content and returns matchField', async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: 'doc-1',
        title: 'Runbook',
        parentId: null,
        isDeleted: false,
        createdAt: new Date('2026-09-01T00:00:00.000Z'),
        updatedAt: new Date('2026-09-02T00:00:00.000Z'),
        content: JSON.stringify({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'secret token' }] }],
        }),
      },
    ])

    const response = await GET(searchRequest('keyword=secret'))
    await expect(response.json()).resolves.toEqual({
      errno: 0,
      data: [
        expect.objectContaining({
          id: 'doc-1',
          title: 'Runbook',
          matchField: 'content',
        }),
      ],
    })
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          OR: [
            { title: { contains: 'secret', mode: 'insensitive' } },
            { content: { contains: 'secret', mode: 'insensitive' } },
          ],
        }),
      })
    )
  })
})
