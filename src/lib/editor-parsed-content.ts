const PARSED_CONTENT_IDS_KEY = 'EDITOR_PARSED_CONTENT_IDS'

export function hasDocParsedContent(docId: string, storage: Storage = window.localStorage) {
  try {
    const parsedIdsStr = storage.getItem(PARSED_CONTENT_IDS_KEY)
    const parsedIds = parsedIdsStr ? JSON.parse(parsedIdsStr) : []
    return Array.isArray(parsedIds) && parsedIds.includes(docId)
  } catch {
    return false
  }
}

export function markDocParsedContent(docId: string, storage: Storage = window.localStorage) {
  try {
    const parsedIdsStr = storage.getItem(PARSED_CONTENT_IDS_KEY)
    const parsed = parsedIdsStr ? JSON.parse(parsedIdsStr) : []
    const parsedIds: string[] = Array.isArray(parsed) ? parsed : []
    if (parsedIds.includes(docId)) return true
    storage.setItem(PARSED_CONTENT_IDS_KEY, JSON.stringify([...parsedIds, docId]))
    return true
  } catch {
    return false
  }
}
