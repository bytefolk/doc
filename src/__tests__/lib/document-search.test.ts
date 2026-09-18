// @vitest-environment node

import { describe, expect, test, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { ApiV1Error } from '@/lib/api-v1'
import {
  contentByteSize,
  documentQueryWhere,
  documentSortOrder,
  documentUpdatedAtWhere,
  matchFieldFor,
  parseDocumentSort,
  parseDocumentType,
  parseIsoDateParam,
  passesSizeFilter,
} from '@/lib/document-search'

const body = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'alpha payload' }] }],
})

describe('document search helpers', () => {
  test('builds a title-or-content contains filter', () => {
    expect(documentQueryWhere('')).toBeUndefined()
    expect(documentQueryWhere('alpha')).toEqual({
      OR: [
        { title: { contains: 'alpha', mode: 'insensitive' } },
        { content: { contains: 'alpha', mode: 'insensitive' } },
      ],
    })
  })

  test('classifies matchField from title and TipTap body text', () => {
    expect(matchFieldFor('alpha notes', body, 'alpha')).toBe('both')
    expect(matchFieldFor('notes', body, 'payload')).toBe('content')
    expect(matchFieldFor('alpha notes', '{"type":"doc"}', 'alpha')).toBe('title')
    expect(matchFieldFor('notes', body, '')).toBeUndefined()
  })

  test('parses time, sort, type, and size filters', () => {
    expect(parseIsoDateParam('2026-09-01', 'after')?.toISOString()).toBe('2026-09-01T00:00:00.000Z')
    expect(() => parseIsoDateParam('nope', 'after')).toThrow(ApiV1Error)
    expect(parseDocumentSort(null)).toBe('updated_desc')
    expect(documentSortOrder('created_asc')).toEqual([{ createdAt: 'asc' }, { id: 'asc' }])
    expect(parseDocumentType('tiptap')).toBe('tiptap')
    expect(() => parseDocumentType('pdf')).toThrow(ApiV1Error)
    expect(documentUpdatedAtWhere(new Date('2026-09-01'), undefined)).toEqual({
      gte: new Date('2026-09-01'),
    })
    expect(passesSizeFilter('abc', 1, 10)).toBe(true)
    expect(passesSizeFilter('abc', contentByteSize('abc') + 1, undefined)).toBe(false)
  })
})
