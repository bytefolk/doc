import { describe, expect, it, vi } from 'vitest'
import { hasDocParsedContent, markDocParsedContent } from '@/lib/editor-parsed-content'

describe('editor parsed-content storage', () => {
  it('does not throw or claim success when localStorage rejects a write', () => {
    const storage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      }),
    } as unknown as Storage

    expect(() => markDocParsedContent('doc-1', storage)).not.toThrow()
    expect(markDocParsedContent('doc-1', storage)).toBe(false)
  })

  it('reads only a valid parsed id list', () => {
    const storage = {
      getItem: vi.fn(() => JSON.stringify(['doc-1'])),
    } as unknown as Storage

    expect(hasDocParsedContent('doc-1', storage)).toBe(true)
    expect(hasDocParsedContent('doc-2', storage)).toBe(false)
  })
})
