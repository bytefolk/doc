import { describe, expect, test } from 'vitest'
import { ENTRY_DOC_ID_KEY, LAST_DOC_ID_KEY } from '@/constants'
import {
  ancestorTrail,
  bumpNavDepth,
  clearWorkspaceEntryPoint,
  dropNavDepth,
  readNavDepth,
  recordWorkspaceDocumentOpen,
} from '@/lib/workspace-navigation'

function memoryStorage(initial: Record<string, string> = {}) {
  const store = { ...initial }
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    store,
  }
}

describe('workspace navigation persistence', () => {
  test('writes the entry once and ignores in-session pushState navigation', () => {
    const storage = memoryStorage()
    recordWorkspaceDocumentOpen('doc-a', null, storage)
    recordWorkspaceDocumentOpen('doc-b', { docId: 'doc-b' }, storage)
    expect(storage.store[ENTRY_DOC_ID_KEY]).toBe('doc-a')
    expect(storage.store[LAST_DOC_ID_KEY]).toBe('doc-a')
  })

  test('clears both persisted positions', () => {
    const storage = memoryStorage({ [ENTRY_DOC_ID_KEY]: 'doc-a', [LAST_DOC_ID_KEY]: 'doc-a' })
    clearWorkspaceEntryPoint(storage)
    expect(storage.store[ENTRY_DOC_ID_KEY]).toBeUndefined()
    expect(storage.store[LAST_DOC_ID_KEY]).toBeUndefined()
  })

  test('tracks in-app history depth', () => {
    const storage = memoryStorage()
    expect(readNavDepth(storage)).toBe(0)
    expect(bumpNavDepth(storage)).toBe(1)
    expect(dropNavDepth(storage)).toBe(0)
    expect(dropNavDepth(storage)).toBe(0)
  })

  test('walks parent ancestors for breadcrumbs', () => {
    const trail = ancestorTrail('c', [
      { id: 'a', title: 'Root', icon: null, parentId: null },
      { id: 'b', title: 'Child', icon: null, parentId: 'a' },
      { id: 'c', title: 'Leaf', icon: null, parentId: 'b' },
    ])
    expect(trail.map((doc) => doc.id)).toEqual(['a', 'b', 'c'])
  })
})
