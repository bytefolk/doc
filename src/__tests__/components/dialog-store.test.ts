import { beforeEach, expect, test } from 'vitest'
import { useDialogStore } from '@/stores/dialog-store'

beforeEach(() => {
  useDialogStore.setState({ AIPanelOpen: false })
})

test('keeps the AI panel closed until the user opens it', () => {
  expect(useDialogStore.getState().AIPanelOpen).toBe(false)
  useDialogStore.getState().setAIPanelOpen(true)
  expect(useDialogStore.getState().AIPanelOpen).toBe(true)
})
