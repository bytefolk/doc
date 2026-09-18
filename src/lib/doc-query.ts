import 'server-only'

import { Prisma } from '@prisma/client'
import { ApiV1Error } from '@/lib/api-v1'

const VALID_SORT_VALUES = ['updated_desc', 'updated_asc', 'created_desc', 'created_asc'] as const
export type SortValue = (typeof VALID_SORT_VALUES)[number]

export function parseOptionalDate(value: string | null, name: string): Date | null {
  if (value == null) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new ApiV1Error(400, 'invalid_query', `${name} must be an ISO 8601 date`)
  }
  return date
}

export function parseSort(value: string | null): SortValue {
  if (value == null) return 'updated_desc'
  if (!VALID_SORT_VALUES.includes(value as SortValue)) {
    throw new ApiV1Error(400, 'invalid_query', `sort must be one of: ${VALID_SORT_VALUES.join(', ')}`)
  }
  return value as SortValue
}

export function buildSearchWhere(query: string): Prisma.DocWhereInput {
  if (!query) return {}
  return {
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { content: { contains: query, mode: 'insensitive' } },
    ],
  }
}

export function buildDateWhere(after: Date | null, before: Date | null): Prisma.DocWhereInput {
  if (!after && !before) return {}
  return {
    updatedAt: {
      ...(after ? { gt: after } : {}),
      ...(before ? { lt: before } : {}),
    },
  }
}

export function getOrderBy(sort: SortValue): Prisma.DocOrderByWithRelationInput[] {
  switch (sort) {
    case 'updated_asc':
      return [{ updatedAt: 'asc' }, { id: 'asc' }]
    case 'created_desc':
      return [{ createdAt: 'desc' }, { id: 'desc' }]
    case 'created_asc':
      return [{ createdAt: 'asc' }, { id: 'asc' }]
    case 'updated_desc':
    default:
      return [{ updatedAt: 'desc' }, { id: 'desc' }]
  }
}
