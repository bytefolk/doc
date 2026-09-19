import 'server-only'

import { db } from '@/db/db'

export type MatchField = 'title' | 'content' | 'both'

/**
 * Process-lifetime probe of the trigger-maintained `search_vector` column.
 * The first success or failure sticks until this Node process exits, so a
 * freshly applied `ensure-search-index.sql` is invisible until restart.
 * Tests call {@link resetSearchVectorCacheForTests}.
 */
let searchVectorAvailable: boolean | null = null

export function resetSearchVectorCacheForTests(): void {
  searchVectorAvailable = null
}

export async function hasSearchVector(): Promise<boolean> {
  if (searchVectorAvailable !== null) return searchVectorAvailable
  try {
    const result = await db.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Doc' AND column_name = 'search_vector'
      ) AS exists
    `
    searchVectorAvailable = result[0]?.exists === true
    return searchVectorAvailable
  } catch (error) {
    console.warn('hasSearchVector probe failed; using contains fallback', error)
    searchVectorAvailable = false
    return false
  }
}

export interface SearchHit {
  id: string
  matchField: MatchField
}

export async function fullTextSearch(
  userId: string,
  query: string,
  filters: { isDeleted?: boolean; isStar?: boolean }
): Promise<SearchHit[] | null> {
  if (!(await hasSearchVector())) return null

  try {
    const conditions = [`"userId" = $1`]
    const values: unknown[] = [userId]
    let idx = 2

    if (filters.isDeleted !== undefined) {
      conditions.push(`"isDeleted" = $${idx++}`)
      values.push(filters.isDeleted)
    }
    if (filters.isStar !== undefined) {
      conditions.push(`"isStar" = $${idx++}`)
      values.push(filters.isStar)
    }

    conditions.push(`"search_vector" @@ websearch_to_tsquery('english', $${idx})`)
    values.push(query)

    const sql = `SELECT id, title, "contentSearch" FROM "Doc" WHERE ${conditions.join(' AND ')}`
    const rows = await db.$queryRawUnsafe<{ id: string; title: string; contentSearch: string | null }[]>(sql, ...values)

    const q = query.toLowerCase()
    return rows.map((row) => ({
      id: row.id,
      matchField: computeMatchField(row.title, row.contentSearch, q),
    }))
  } catch (error) {
    console.warn('fullTextSearch failed; falling back to contains', error)
    return null
  }
}

/**
 * Substring heuristic on `title` / `contentSearch`, not ts_rank / ts_headline.
 * Callers use this both for contains fallback rows and to label FTS hits.
 */
export function computeMatchField(
  title: string,
  contentSearch: string | null | undefined,
  queryLower: string
): MatchField {
  const titleMatch = title.toLowerCase().includes(queryLower)
  const contentMatch = (contentSearch ?? '').toLowerCase().includes(queryLower)
  if (titleMatch && contentMatch) return 'both'
  if (titleMatch) return 'title'
  return 'content'
}
