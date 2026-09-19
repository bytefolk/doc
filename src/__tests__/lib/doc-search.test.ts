// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  queryRawUnsafe: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/db/db', () => ({
  db: {
    $queryRaw: mocks.queryRaw,
    $queryRawUnsafe: mocks.queryRawUnsafe,
  },
}))

import { computeMatchField, fullTextSearch, hasSearchVector } from '@/lib/doc-search'

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('computeMatchField', () => {
  test('returns "title" when query matches only title', () => {
    expect(computeMatchField('My Document', 'some content', 'document')).toBe('title')
  })

  test('returns "content" when query matches only content', () => {
    expect(computeMatchField('My Document', 'some content about testing', 'testing')).toBe('content')
  })

  test('returns "both" when query matches title and content', () => {
    expect(computeMatchField('My Document', 'document content', 'document')).toBe('both')
  })

  test('returns "content" when contentSearch is null', () => {
    expect(computeMatchField('My Document', null, 'content')).toBe('content')
  })

  test('is case-insensitive', () => {
    expect(computeMatchField('MY DOCUMENT', 'SOME CONTENT', 'document')).toBe('title')
    expect(computeMatchField('my document', 'some content', 'document')).toBe('title')
  })
})

describe('hasSearchVector', () => {
  test('returns true when search_vector column exists', async () => {
    const { hasSearchVector: freshHasSearchVector } = await import('@/lib/doc-search')
    mocks.queryRaw.mockResolvedValueOnce([{ exists: true }])
    expect(await freshHasSearchVector()).toBe(true)
  })

  test('returns false when search_vector column does not exist', async () => {
    const { hasSearchVector: freshHasSearchVector } = await import('@/lib/doc-search')
    mocks.queryRaw.mockResolvedValueOnce([{ exists: false }])
    expect(await freshHasSearchVector()).toBe(false)
  })

  test('returns false on database error', async () => {
    const { hasSearchVector: freshHasSearchVector } = await import('@/lib/doc-search')
    mocks.queryRaw.mockRejectedValueOnce(new Error('connection failed'))
    expect(await freshHasSearchVector()).toBe(false)
  })
})

describe('fullTextSearch', () => {
  test('returns null when search_vector is not available', async () => {
    const { fullTextSearch: freshFullTextSearch } = await import('@/lib/doc-search')
    mocks.queryRaw.mockResolvedValueOnce([{ exists: false }])
    const result = await freshFullTextSearch('user-1', 'test', { isDeleted: false })
    expect(result).toBeNull()
  })

  test('returns search hits with matchField when search_vector is available', async () => {
    const { fullTextSearch: freshFullTextSearch } = await import('@/lib/doc-search')
    mocks.queryRaw.mockResolvedValueOnce([{ exists: true }])
    mocks.queryRawUnsafe.mockResolvedValueOnce([
      { id: 'doc-1', title: 'Test Document', contentSearch: 'some content' },
      { id: 'doc-2', title: 'Another Doc', contentSearch: 'test content here' },
    ])

    const result = await freshFullTextSearch('user-1', 'test', { isDeleted: false })
    expect(result).toEqual([
      { id: 'doc-1', matchField: 'title' },
      { id: 'doc-2', matchField: 'content' },
    ])
  })

  test('returns null on query error', async () => {
    const { fullTextSearch: freshFullTextSearch } = await import('@/lib/doc-search')
    mocks.queryRaw.mockResolvedValueOnce([{ exists: true }])
    mocks.queryRawUnsafe.mockRejectedValueOnce(new Error('query failed'))

    const result = await freshFullTextSearch('user-1', 'test', { isDeleted: false })
    expect(result).toBeNull()
  })

  test('returns an empty array when tsquery matches nothing (caller must fall back)', async () => {
    const { fullTextSearch: freshFullTextSearch } = await import('@/lib/doc-search')
    mocks.queryRaw.mockResolvedValueOnce([{ exists: true }])
    mocks.queryRawUnsafe.mockResolvedValueOnce([])

    const result = await freshFullTextSearch('user-1', '中文关键词', { isDeleted: false })
    expect(result).toEqual([])
  })
})
