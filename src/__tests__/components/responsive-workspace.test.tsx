import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import ResponsiveWorkspace from '@/components/responsive-workspace'

vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizablePanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResizableHandle: () => <div aria-hidden="true" />,
}))

let compactMediaQuery: MediaQueryList

beforeEach(() => {
  const listeners = new Set<EventListener>()
  compactMediaQuery = {
    matches: true,
    media: '(max-width: 1023px)',
    onchange: null,
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') listeners.add(listener)
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') listeners.delete(listener)
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: (event) => {
      listeners.forEach((listener) => listener(event))
      return true
    },
  }
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => compactMediaQuery) })
})

afterEach(cleanup)

function renderWorkspace() {
  return render(
    <ResponsiveWorkspace
      navigation={
        <nav>
          Documents
          <button type="button">Last navigation action</button>
          <span role="link" tabIndex={0}>
            Selected document
          </span>
        </nav>
      }
      labels={{
        open: 'Open document navigation',
        close: 'Close document navigation',
        navigation: 'Document navigation',
      }}
    >
      Editor
    </ResponsiveWorkspace>
  )
}

function resizeToCompact(matches: boolean) {
  Object.defineProperty(compactMediaQuery, 'matches', { configurable: true, value: matches })
  act(() => compactMediaQuery.dispatchEvent(new Event('change')))
}

test('keeps the closed compact navigation out of the accessibility tree and closes it after selection', () => {
  renderWorkspace()

  const openButton = screen.getByRole('button', { name: 'Open document navigation' })
  expect(screen.queryByText('Documents')).toBeNull()
  expect(document.querySelector('[inert][aria-hidden="true"]')).toBeTruthy()
  fireEvent.click(openButton)
  expect(screen.getByRole('dialog', { name: 'Document navigation' })).toBeTruthy()

  fireEvent.click(screen.getByRole('link', { name: 'Selected document' }))
  expect(openButton.getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByText('Documents')).toBeNull()
})

test('traps drawer focus without stealing focus or Escape from a nested portal dialog', () => {
  renderWorkspace()

  const openButton = screen.getByRole('button', { name: 'Open document navigation' })
  fireEvent.click(openButton)
  expect(screen.getByRole('button', { name: 'Close document navigation' })).toBe(document.activeElement)

  const nestedDialog = document.createElement('div')
  nestedDialog.setAttribute('role', 'dialog')
  const nestedInput = document.createElement('input')
  nestedDialog.appendChild(nestedInput)
  document.body.appendChild(nestedDialog)
  nestedInput.focus()

  fireEvent.keyDown(nestedInput, { key: 'Tab' })
  expect(nestedInput).toBe(document.activeElement)
  fireEvent.keyDown(nestedInput, { key: 'Escape' })
  expect(openButton.getAttribute('aria-expanded')).toBe('true')

  nestedDialog.remove()
  screen.getByRole('link', { name: 'Selected document' }).focus()
  fireEvent.keyDown(window, { key: 'Tab' })
  expect(screen.getByRole('button', { name: 'Close document navigation' })).toBe(document.activeElement)

  fireEvent.keyDown(window, { key: 'Escape' })
  expect(openButton.getAttribute('aria-expanded')).toBe('false')
  expect(openButton).toBe(document.activeElement)
})

test('automatically closes the drawer when resizing wide and returns compact in the closed state', () => {
  renderWorkspace()
  fireEvent.click(screen.getByRole('button', { name: 'Open document navigation' }))
  expect(screen.getByRole('dialog', { name: 'Document navigation' })).toBeTruthy()

  resizeToCompact(false)
  expect(screen.queryByRole('button', { name: 'Open document navigation' })).toBeNull()
  expect(screen.queryByRole('dialog', { name: 'Document navigation' })).toBeNull()
  expect(screen.getByText('Documents')).toBeTruthy()

  resizeToCompact(true)
  const openButton = screen.getByRole('button', { name: 'Open document navigation' })
  expect(openButton.getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByText('Documents')).toBeNull()
})
