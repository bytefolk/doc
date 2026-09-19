// @vitest-environment node

import { describe, expect, test } from 'vitest'

import { extractPlainText, extractPlainTextFromJson } from '@/lib/tiptap-text-extractor'

describe('extractPlainText', () => {
  test('extracts text from a simple TipTap document', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
    }
    expect(extractPlainText(doc)).toBe('Hello world')
  })

  test('extracts text from multiple paragraphs', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'First paragraph' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Second paragraph' }],
        },
      ],
    }
    expect(extractPlainText(doc)).toBe('First paragraph Second paragraph')
  })

  test('extracts text from nested structures', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Quoted text' }],
            },
          ],
        },
      ],
    }
    expect(extractPlainText(doc)).toBe('Quoted text')
  })

  test('handles text with marks (bold, italic, etc.)', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Normal ' },
            { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' text' },
          ],
        },
      ],
    }
    expect(extractPlainText(doc)).toBe('Normal bold text')
  })

  test('returns empty string for null or invalid input', () => {
    expect(extractPlainText(null)).toBe('')
    expect(extractPlainText(undefined)).toBe('')
    expect(extractPlainText('string')).toBe('')
    expect(extractPlainText([])).toBe('')
  })

  test('returns empty string for document with no text', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'horizontalRule' }],
    }
    expect(extractPlainText(doc)).toBe('')
  })

  test('collapses multiple whitespace', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '  Multiple   spaces  ' }],
        },
      ],
    }
    expect(extractPlainText(doc)).toBe('Multiple spaces')
  })
})

describe('extractPlainTextFromJson', () => {
  test('extracts text from JSON string', () => {
    const json = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'From JSON' }],
        },
      ],
    })
    expect(extractPlainTextFromJson(json)).toBe('From JSON')
  })

  test('returns empty string for invalid JSON', () => {
    expect(extractPlainTextFromJson('not json')).toBe('')
    expect(extractPlainTextFromJson('')).toBe('')
  })

  test('returns empty string for empty input', () => {
    expect(extractPlainTextFromJson('')).toBe('')
    expect(extractPlainTextFromJson('  ')).toBe('')
  })
})
