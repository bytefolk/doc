import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'
import MermaidRenderer from '@/components/mermaid-renderer'
import PubMermaidBlocks from '@/components/pub-mermaid-blocks'

const mocks = vi.hoisted(() => ({ mode: 'light', initialize: vi.fn(), render: vi.fn() }))
vi.mock('@fullstack-ai-infra/ui', () => ({ useDSMode: () => mocks.mode }))
vi.mock('mermaid', () => ({ default: { initialize: mocks.initialize, render: mocks.render } }))

afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  mocks.mode = 'light'
})

test('an editor diagram rerenders for the selected theme and ignores stale rendering', async () => {
  let finishOldRender!: (value: { svg: string }) => void
  mocks.render
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finishOldRender = resolve
      })
    )
    .mockResolvedValue({ svg: '<svg data-diagram-theme="dark"></svg>' })
  const ui = () => (
    <NextIntlClientProviderWrapper>
      <MermaidRenderer code="graph LR; A-->B" />
    </NextIntlClientProviderWrapper>
  )
  const { container, rerender } = render(ui())
  await waitFor(() => expect(mocks.render).toHaveBeenCalledTimes(1))

  mocks.mode = 'dark'
  rerender(ui())
  await waitFor(() => expect(container.querySelector('[data-diagram-theme="dark"]')).not.toBeNull())
  expect(mocks.initialize).toHaveBeenLastCalledWith({ startOnLoad: false, securityLevel: 'strict', theme: 'dark' })

  await act(async () => finishOldRender({ svg: '<svg data-diagram-theme="light"></svg>' }))
  expect(container.querySelector('[data-diagram-theme="dark"]')).not.toBeNull()
  expect(container.querySelector('[data-diagram-theme="light"]')).toBeNull()
})

test('published diagrams change theme after hydration without retaining an error surface', async () => {
  mocks.render.mockRejectedValueOnce(new Error('Invalid diagram')).mockResolvedValue({ svg: '<svg></svg>' })
  const ui = () => (
    <>
      <div data-type="mermaid-block" data-code="graph LR; A-->B" />
      <PubMermaidBlocks />
    </>
  )
  const { container, rerender } = render(ui())
  const block = container.querySelector<HTMLElement>('[data-type="mermaid-block"]')!
  await waitFor(() => expect(block.dataset.rendered).toBe('light'))
  expect(block.classList.contains('bg-danger-soft')).toBe(true)

  mocks.mode = 'dark'
  rerender(ui())
  await waitFor(() => expect(block.dataset.rendered).toBe('dark'))
  expect(block.querySelector('svg')).not.toBeNull()
  expect(block.classList.contains('bg-card')).toBe(true)
  expect(block.classList.contains('bg-danger-soft')).toBe(false)
  expect(mocks.initialize).toHaveBeenLastCalledWith({ startOnLoad: false, securityLevel: 'strict', theme: 'dark' })
})
