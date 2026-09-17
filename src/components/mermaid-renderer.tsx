'use client'

import { useEffect, useId, useState } from 'react'
import mermaid from 'mermaid'
import { useTranslations } from 'next-intl'
import { useDSMode } from '@fullstack-ai-infra/ui'

interface MermaidRendererProps {
  code: string
  className?: string
}

export default function MermaidRenderer(props: MermaidRendererProps) {
  const { code, className } = props
  const t = useTranslations('editor')
  const mode = useDSMode()
  const reactId = useId()
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(async () => {
      const source = code.trim()
      if (!source) {
        setSvg('')
        setError('')
        return
      }

      try {
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: mode === 'dark' ? 'dark' : 'default' })
        const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}-${Date.now()}`
        const result = await mermaid.render(id, source)
        if (cancelled) return
        setSvg(result.svg)
        setError('')
      } catch (err) {
        if (cancelled) return
        setSvg('')
        setError(err instanceof Error ? err.message : t('mermaidRenderFailed'))
      }
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [code, mode, reactId, t])

  if (error) {
    return (
      <div className={className}>
        <div className="rounded border border-danger bg-danger-soft p-3 text-sm text-danger">
          <p className="font-medium">{t('mermaidRenderFailedTip')}</p>
          <pre className="mt-2 whitespace-pre-wrap text-xs">{error}</pre>
        </div>
      </div>
    )
  }

  if (!svg) {
    return <div className={className} />
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: svg }} />
}
