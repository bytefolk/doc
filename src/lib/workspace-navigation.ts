import { ENTRY_DOC_ID_KEY, LAST_DOC_ID_KEY, DOC_NAV_DEPTH_KEY } from '@/constants'
import { IDoc } from '@/stores/docs-store'

export function recordWorkspaceDocumentOpen(
  id: string,
  historyState: { docId?: string } | null,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage
) {
  if (!id || id === '0') return
  if (!storage.getItem(ENTRY_DOC_ID_KEY)) {
    storage.setItem(ENTRY_DOC_ID_KEY, id)
  }
  // In-session sidebar navigation uses pushState({ docId }). Do not let that
  // overwrite the entry point used by Get Started.
  if (!historyState?.docId) {
    storage.setItem(LAST_DOC_ID_KEY, id)
  }
}

export function clearWorkspaceEntryPoint(storage: Pick<Storage, 'removeItem'> = localStorage) {
  storage.removeItem(LAST_DOC_ID_KEY)
  storage.removeItem(ENTRY_DOC_ID_KEY)
}

export function readNavDepth(storage: Pick<Storage, 'getItem'> = sessionStorage) {
  const raw = Number(storage.getItem(DOC_NAV_DEPTH_KEY) || '0')
  return Number.isFinite(raw) && raw > 0 ? raw : 0
}

export function writeNavDepth(depth: number, storage: Pick<Storage, 'setItem'> = sessionStorage) {
  storage.setItem(DOC_NAV_DEPTH_KEY, String(Math.max(0, depth)))
}

export function bumpNavDepth(storage: Pick<Storage, 'getItem' | 'setItem'> = sessionStorage) {
  const next = readNavDepth(storage) + 1
  writeNavDepth(next, storage)
  return next
}

export function dropNavDepth(storage: Pick<Storage, 'getItem' | 'setItem'> = sessionStorage) {
  const next = Math.max(0, readNavDepth(storage) - 1)
  writeNavDepth(next, storage)
  return next
}

export function ancestorTrail(id: string, docs: IDoc[]): IDoc[] {
  const trail: IDoc[] = []
  const seen = new Set<string>()
  let current = docs.find((doc) => doc.id === id)
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    trail.unshift(current)
    current = current.parentId ? docs.find((doc) => doc.id === current?.parentId) : undefined
  }
  return trail
}
