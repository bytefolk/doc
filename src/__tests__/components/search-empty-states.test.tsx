import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Search from '@/app/[locale]/work/(dialog-pages)/search'
import { get } from '@/lib/ajax'
import { useDialogStore } from '@/stores/dialog-store'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'

vi.mock('@/lib/ajax', () => ({ get: vi.fn() }))

afterEach(() => {
  cleanup()
  useDialogStore.setState({ searchDialogOpen: false })
  vi.clearAllMocks()
})

test('search keeps loading and failure separate from an empty result', async () => {
  let rejectRequest: (reason: Error) => void = () => {}
  vi.mocked(get).mockImplementation(
    () =>
      new Promise((_, reject) => {
        rejectRequest = reject
      })
  )
  useDialogStore.setState({ searchDialogOpen: true })
  render(
    <NextIntlClientProviderWrapper>
      <Search />
    </NextIntlClientProviderWrapper>
  )

  expect(await screen.findByRole('heading', { name: 'Find a document' })).toBeDefined()
  fireEvent.change(screen.getByPlaceholderText('Input keywords...'), { target: { value: 'report' } })
  expect(screen.getByRole('status').textContent).toBe('Loading...')
  expect(screen.queryByRole('heading', { name: 'No matching documents' })).toBeNull()
  await waitFor(() => expect(get).toHaveBeenCalledOnce())
  rejectRequest(new Error('Network unavailable'))
  expect((await screen.findByRole('alert')).textContent).toContain('Could not load documents')
  expect(screen.queryByRole('status')).toBeNull()
  expect(screen.queryByRole('heading', { name: 'No matching documents' })).toBeNull()
})

test('an empty search result offers one working clear action', async () => {
  vi.mocked(get).mockResolvedValue({ errno: 0, data: [] })
  useDialogStore.setState({ searchDialogOpen: true })
  render(
    <NextIntlClientProviderWrapper>
      <Search />
    </NextIntlClientProviderWrapper>
  )

  const input = screen.getByPlaceholderText('Input keywords...')
  fireEvent.change(input, { target: { value: 'no match' } })
  expect(await screen.findByRole('heading', { name: 'No matching documents' })).toBeDefined()
  const clear = screen.getAllByRole('button', { name: 'Clear search' })
  expect(clear).toHaveLength(1)
  fireEvent.click(clear[0])
  expect((input as HTMLInputElement).value).toBe('')
  expect(screen.getByRole('heading', { name: 'Find a document' })).toBeDefined()
  expect(screen.queryByRole('alert')).toBeNull()
})
