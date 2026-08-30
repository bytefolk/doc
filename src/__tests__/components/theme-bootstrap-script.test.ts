import { beforeEach, expect, test, vi } from 'vitest'
import { THEME_BOOTSTRAP_SCRIPT } from '@/components/theme-bootstrap-script'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
  delete document.documentElement.dataset.theme
})

test('sets stored theme on both shared data attribute and next-themes class before hydration', () => {
  localStorage.setItem('theme', 'dark')

  Function(THEME_BOOTSTRAP_SCRIPT)()

  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(document.documentElement.classList.contains('dark')).toBe(true)
})

test('resolves system theme before hydration', () => {
  localStorage.setItem('theme', 'system')
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true }))
  )

  Function(THEME_BOOTSTRAP_SCRIPT)()

  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  vi.unstubAllGlobals()
})
