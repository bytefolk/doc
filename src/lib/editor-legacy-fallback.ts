export type LegacyFallbackResult = 'applied' | 'not-needed' | 'preserved-newer-content' | 'retryable-error'

interface PersistedDocumentResponse {
  errno: number
  data?: {
    contentBinary?: unknown
    content?: string | null
  }
}

interface LegacyFallbackOptions {
  needsFallback: boolean
  isEditorEmpty: () => boolean
  getDocumentVersion: () => string
  hasHydrated: () => boolean
  fetchPersistedDocument: () => Promise<PersistedDocumentResponse>
  applyPersistedContent: (content: any) => void
  markHydrated: () => void
}

export async function hydrateLegacyEditorContent({
  needsFallback,
  isEditorEmpty,
  getDocumentVersion,
  hasHydrated,
  fetchPersistedDocument,
  applyPersistedContent,
  markHydrated,
}: LegacyFallbackOptions): Promise<LegacyFallbackResult> {
  const confirmHydrated = () => {
    try {
      markHydrated()
    } catch {}
  }

  if (!isEditorEmpty() || !needsFallback) {
    confirmHydrated()
    return 'not-needed'
  }
  if (hasHydrated()) return 'not-needed'

  const versionBeforeFetch = getDocumentVersion()
  let response: PersistedDocumentResponse
  try {
    response = await fetchPersistedDocument()
  } catch {
    return 'retryable-error'
  }
  if (response.errno !== 0) return 'retryable-error'

  // IndexedDB, another collaborator, or a local command may update the Y.Doc while the request is in flight.
  // Preserve that newer state instead of replacing it with the legacy JSON snapshot.
  if (!isEditorEmpty() || getDocumentVersion() !== versionBeforeFetch) {
    confirmHydrated()
    return 'preserved-newer-content'
  }

  const { contentBinary, content } = response.data || {}
  if (contentBinary == null && content) {
    try {
      applyPersistedContent(JSON.parse(content))
    } catch {
      return 'retryable-error'
    }
    confirmHydrated()
    return 'applied'
  }

  confirmHydrated()
  return 'not-needed'
}
