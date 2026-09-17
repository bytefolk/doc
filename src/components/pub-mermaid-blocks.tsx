'use client'

import { useEffect } from 'react'
import mermaid from 'mermaid'
import { useDSMode } from '@fullstack-ai-infra/ui'

export default function PubMermaidBlocks() {
  const mode = useDSMode()
  useEffect(() => {
    let cancelled = false
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: mode === 'dark' ? 'dark' : 'default' })
    // Mermaid blocks are saved as HTML placeholders by Tiptap, so the public page renders them after hydration.
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('div[data-type="mermaid-block"][data-code]'))

    blocks.forEach((block, index) => {
      const code = block.getAttribute('data-code')?.trim()
      if (!code || block.dataset.rendered === mode) return

      block.classList.remove('border-danger', 'bg-danger-soft', 'text-danger-strong')
      block.classList.add(
        'my-4',
        'overflow-auto',
        'rounded',
        'border',
        'border-border',
        'bg-card',
        'text-card-foreground',
        'p-4'
      )

      const render = async () => {
        try {
          const result = await mermaid.render(`pub-mermaid-${index}-${Date.now()}`, code)
          if (cancelled) return
          block.dataset.rendered = mode
          block.innerHTML = result.svg
          block.querySelector('svg')?.classList.add('mx-auto', 'max-w-full')
        } catch (error) {
          if (cancelled) return
          block.dataset.rendered = mode
          block.classList.remove('border-border', 'bg-card', 'text-card-foreground')
          block.classList.add('border-danger', 'bg-danger-soft', 'text-danger-strong')
          block.textContent = error instanceof Error ? error.message : 'Mermaid render failed'
        }
      }

      void render()
    })
    return () => {
      cancelled = true
    }
  }, [mode])

  return null
}
