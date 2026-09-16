import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ContentHome from '@/app/[locale]/work/[id]/(content)/content-home'
import { useDialogStore } from '@/stores/dialog-store'
import { useDocsStore } from '@/stores/docs-store'
import { useShareStore } from '@/stores/share-store'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'

vi.mock('@/app/[locale]/work/[id]/hooks/useDocs', () => ({ default: () => ({ createDoc: vi.fn() }) }))

afterEach(() => {
  cleanup()
  useDialogStore.setState({ searchDialogOpen: false })
})

test('the real design-system input opens search on focus without assuming a DOM ref', () => {
  useDocsStore.setState({ docs: [], loading: false })
  useShareStore.setState({ myShareRelations: [] })
  render(
    <NextIntlClientProviderWrapper>
      <ContentHome />
    </NextIntlClientProviderWrapper>
  )
  expect(screen.getByRole('heading', { name: 'Create your first document' })).toBeDefined()
  expect(screen.getAllByRole('button', { name: 'New Document' })).toHaveLength(1)
  fireEvent.focus(screen.getByRole('textbox'))
  expect(useDialogStore.getState().searchDialogOpen).toBe(true)
})

test('loading documents does not show the first-document empty state', () => {
  useDocsStore.setState({ docs: [], loading: true })
  render(
    <NextIntlClientProviderWrapper>
      <ContentHome />
    </NextIntlClientProviderWrapper>
  )
  expect(screen.getByRole('status')).toBeDefined()
  expect(screen.queryByRole('heading', { name: 'Create your first document' })).toBeNull()
})
