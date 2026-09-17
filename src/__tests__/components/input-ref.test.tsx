import { createRef } from 'react'
import { afterEach, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Input } from '@/components/ui/input'

afterEach(cleanup)

test('shared input exposes a native input for focus, selection, and unmount cleanup', () => {
  const ref = createRef<HTMLInputElement>()
  const { unmount } = render(<Input ref={ref} defaultValue="document" />)
  const input = screen.getByRole('textbox') as HTMLInputElement
  expect(ref.current).toBe(input)
  ref.current?.focus()
  expect(document.activeElement).toBe(input)
  ref.current?.select()
  expect(input.selectionStart).toBe(0)
  expect(input.selectionEnd).toBe(8)
  unmount()
  expect(ref.current).toBeNull()
})
