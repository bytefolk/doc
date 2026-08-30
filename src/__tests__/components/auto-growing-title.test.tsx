import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AutoGrowingTitle from '@/components/auto-growing-title'

describe('AutoGrowingTitle', () => {
  let resize: (() => void) | undefined
  const disconnect = vi.fn()

  beforeEach(() => {
    resize = undefined
    disconnect.mockReset()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = () => callback([], this as unknown as ResizeObserver)
        }
        observe() {}
        disconnect() {
          disconnect()
        }
      }
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('is an accessible multiline field and forwards title edits', () => {
    const onChange = vi.fn()
    render(<AutoGrowingTitle aria-label="Document title" value="A long title" onChange={onChange} />)

    const title = screen.getByRole('textbox', { name: 'Document title' })
    expect(title.tagName).toBe('TEXTAREA')
    fireEvent.change(title, { target: { value: 'Updated title' } })
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('recalculates height when wrapping width changes', () => {
    render(<AutoGrowingTitle aria-label="Document title" value="A long title that wraps" readOnly />)
    const title = screen.getByRole('textbox', { name: 'Document title' }) as HTMLTextAreaElement
    Object.defineProperty(title, 'scrollHeight', { configurable: true, value: 112 })

    act(() => resize?.())

    expect(title.style.height).toBe('112px')
  })
})
