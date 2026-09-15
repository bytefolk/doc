import { expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach } from 'vitest'
import { useTheme } from 'next-themes'
import { useDSMode } from '@fullstack-ai-infra/ui'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'
import ChangeTheme from '@/components/change-theme'
import { ThemeProvider } from '@/components/theme-provider'

afterEach(cleanup)

vi.stubGlobal(
  'matchMedia',
  vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
)

test('Change theme component', async () => {
  const theme = 'light'

  render(
    <ThemeProvider attribute="class" defaultTheme={theme}>
      <NextIntlClientProviderWrapper>
        <ChangeTheme />
      </NextIntlClientProviderWrapper>
    </ThemeProvider>
  )
  const button = screen.getByRole('button', { name: 'Change theme' })
  expect(button.getAttribute('data-title')).toBe(theme)
  await waitFor(() => expect(document.documentElement.dataset.theme).toBe(theme))
})

test('changing theme updates both semantic CSS tokens and shared control colors', async () => {
  function ThemeProbe() {
    const { setTheme } = useTheme()
    const mode = useDSMode()
    return <button onClick={() => setTheme(mode === 'light' ? 'dark' : 'light')}>{mode}</button>
  }

  render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ThemeProbe />
    </ThemeProvider>
  )

  fireEvent.click(await screen.findByRole('button', { name: 'light' }))
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'dark' })).toBeTruthy()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  fireEvent.click(screen.getByRole('button', { name: 'dark' }))
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'light' })).toBeTruthy()
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
