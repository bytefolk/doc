import { describe, expect, it, vi } from 'vitest'
import { hydrateLegacyEditorContent } from '@/lib/editor-legacy-fallback'

describe('hydrateLegacyEditorContent', () => {
  it('preserves an edit made while the legacy request is in flight', async () => {
    let resolveFetch!: (value: { errno: number; data: { content: string } }) => void
    const fetchPersistedDocument = vi.fn(
      () =>
        new Promise<{ errno: number; data: { content: string } }>((resolve) => {
          resolveFetch = resolve
        })
    )
    let empty = true
    let version = 'before'
    const applyPersistedContent = vi.fn()
    const markHydrated = vi.fn()

    const hydration = hydrateLegacyEditorContent({
      needsFallback: true,
      isEditorEmpty: () => empty,
      getDocumentVersion: () => version,
      hasHydrated: () => false,
      fetchPersistedDocument,
      applyPersistedContent,
      markHydrated,
    })

    empty = false
    version = 'after-local-edit'
    resolveFetch({ errno: 0, data: { content: JSON.stringify({ type: 'doc' }) } })

    await expect(hydration).resolves.toBe('preserved-newer-content')
    expect(applyPersistedContent).not.toHaveBeenCalled()
    expect(markHydrated).toHaveBeenCalledOnce()
  })

  it('preserves a changed Y document even while the editor still reports empty', async () => {
    let version = 'before'
    const applyPersistedContent = vi.fn()

    await expect(
      hydrateLegacyEditorContent({
        needsFallback: true,
        isEditorEmpty: () => true,
        getDocumentVersion: () => version,
        hasHydrated: () => false,
        fetchPersistedDocument: async () => {
          version = 'after-indexeddb-update'
          return { errno: 0, data: { content: JSON.stringify({ type: 'doc' }) } }
        },
        applyPersistedContent,
        markHydrated: vi.fn(),
      })
    ).resolves.toBe('preserved-newer-content')
    expect(applyPersistedContent).not.toHaveBeenCalled()
  })

  it('marks hydration only after persisted content is applied', async () => {
    const events: string[] = []

    await expect(
      hydrateLegacyEditorContent({
        needsFallback: true,
        isEditorEmpty: () => true,
        getDocumentVersion: () => 'stable',
        hasHydrated: () => false,
        fetchPersistedDocument: async () => ({
          errno: 0,
          data: { content: JSON.stringify({ type: 'doc', content: [] }) },
        }),
        applyPersistedContent: () => events.push('apply'),
        markHydrated: () => events.push('mark'),
      })
    ).resolves.toBe('applied')
    expect(events).toEqual(['apply', 'mark'])
  })

  it('does not mark hydration after a failed request or invalid JSON', async () => {
    const markHydrated = vi.fn()
    const base = {
      needsFallback: true,
      isEditorEmpty: () => true,
      getDocumentVersion: () => 'stable',
      hasHydrated: () => false,
      applyPersistedContent: vi.fn(),
      markHydrated,
    }

    await expect(
      hydrateLegacyEditorContent({ ...base, fetchPersistedDocument: async () => ({ errno: -1 }) })
    ).resolves.toBe('retryable-error')
    await expect(
      hydrateLegacyEditorContent({
        ...base,
        fetchPersistedDocument: async () => ({ errno: 0, data: { content: '{' } }),
      })
    ).resolves.toBe('retryable-error')
    expect(markHydrated).not.toHaveBeenCalled()
  })

  it('finishes hydration when marking storage is unavailable', async () => {
    await expect(
      hydrateLegacyEditorContent({
        needsFallback: false,
        isEditorEmpty: () => false,
        getDocumentVersion: () => 'stable',
        hasHydrated: () => false,
        fetchPersistedDocument: vi.fn(),
        applyPersistedContent: vi.fn(),
        markHydrated: () => {
          throw new DOMException('Quota exceeded', 'QuotaExceededError')
        },
      })
    ).resolves.toBe('not-needed')
  })
})
