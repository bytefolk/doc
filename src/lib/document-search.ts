import { Prisma } from '@prisma/client'
import { ApiV1Error } from '@/lib/api-v1'
import { extractPlainText } from '@/lib/doc-version/diff'

export type MatchField = 'title' | 'content' | 'both'
export type DocumentSort = 'updated_asc' | 'updated_desc' | 'created_asc' | 'created_desc'
export type DocumentTypeFilter = 'tiptap' | 'markdown' | 'json'

export const DEFAULT_DOCUMENT_SORT: DocumentSort = 'updated_desc'
export const TIPTAP_MIME_TYPE = 'application/tiptap'

const SORT_VALUES: DocumentSort[] = ['updated_asc', 'updated_desc', 'created_asc', 'created_desc']
const TYPE_VALUES: DocumentTypeFilter[] = ['tiptap', 'markdown', 'json']

export function parseIsoDateParam(value: string | null, name: string): Date | undefined {
  if (value == null || value.trim() === '') return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiV1Error(400, 'invalid_query', `${name} must be an ISO date`)
  }
  return parsed
}

export function parseDocumentSort(value: string | null): DocumentSort {
  if (value == null || value.trim() === '') return DEFAULT_DOCUMENT_SORT
  if (!SORT_VALUES.includes(value as DocumentSort)) {
    throw new ApiV1Error(400, 'invalid_query', 'sort must be updated_asc, updated_desc, created_asc, or created_desc')
  }
  return value as DocumentSort
}

export function parseDocumentType(value: string | null): DocumentTypeFilter | undefined {
  if (value == null || value.trim() === '') return undefined
  if (!TYPE_VALUES.includes(value as DocumentTypeFilter)) {
    throw new ApiV1Error(400, 'invalid_query', 'type must be tiptap, markdown, or json')
  }
  return value as DocumentTypeFilter
}

export function parseByteSizeParam(value: string | null, name: string): number | undefined {
  if (value == null || value.trim() === '') return undefined
  if (!/^\d+$/.test(value)) {
    throw new ApiV1Error(400, 'invalid_query', `${name} must be a non-negative integer`)
  }
  return Number(value)
}

export function documentQueryWhere(query: string): Prisma.DocWhereInput | undefined {
  if (!query) return undefined
  return {
    OR: [{ title: { contains: query, mode: 'insensitive' } }, { content: { contains: query, mode: 'insensitive' } }],
  }
}

export function documentUpdatedAtWhere(after?: Date, before?: Date): Prisma.DateTimeFilter | undefined {
  if (!after && !before) return undefined
  return {
    ...(after ? { gte: after } : {}),
    ...(before ? { lte: before } : {}),
  }
}

export function documentSortOrder(sort: DocumentSort): Prisma.DocOrderByWithRelationInput[] {
  if (sort === 'updated_asc') return [{ updatedAt: 'asc' }, { id: 'asc' }]
  if (sort === 'created_desc') return [{ createdAt: 'desc' }, { id: 'desc' }]
  if (sort === 'created_asc') return [{ createdAt: 'asc' }, { id: 'asc' }]
  return [{ updatedAt: 'desc' }, { id: 'desc' }]
}

export function matchFieldFor(title: string, content: string, query: string): MatchField | undefined {
  if (!query) return undefined
  const needle = query.toLowerCase()
  const inTitle = title.toLowerCase().includes(needle)
  const plain = extractPlainText(content).toLowerCase()
  const inContent = plain.includes(needle) || content.toLowerCase().includes(needle)
  if (inTitle && inContent) return 'both'
  if (inTitle) return 'title'
  if (inContent) return 'content'
  return undefined
}

export function inferredDocType(): DocumentTypeFilter {
  return 'tiptap'
}

export function contentByteSize(content: string): number {
  return Buffer.byteLength(content, 'utf8')
}

export function passesSizeFilter(content: string, minSize?: number, maxSize?: number): boolean {
  const size = contentByteSize(content)
  if (minSize !== undefined && size < minSize) return false
  if (maxSize !== undefined && size > maxSize) return false
  return true
}
