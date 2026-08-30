'use client'

import { useMemo } from 'react'
import { useDocsStore } from '@/stores/docs-store'
import AITokenInfo from '@/components/ai-token-info'
import { useTranslations, useLocale } from 'next-intl'

export default function BottomBar() {
  const t = useTranslations('docItem')
  const locale = useLocale()

  const docs = useDocsStore((s) => s.docs)
  const id = useDocsStore((s) => s.curDocId)
  const doc = useMemo(() => docs.find((d) => d.id === id), [docs, id])

  return (
    <footer className="flex min-h-9 min-w-0 items-center justify-between gap-2 overflow-hidden border-t border-border bg-surface px-2 py-1 text-xs text-foreground-muted sm:px-4">
      <div className="min-w-0 flex-1 truncate">
        <span>
          {t('createdAt')} {doc?.createdAt?.toLocaleDateString(locale)}, {doc?.createdAt?.toLocaleTimeString(locale)}
        </span>
        <span> , </span>
        <span>
          {t('updatedAt')} {doc?.updatedAt?.toLocaleDateString(locale)} {doc?.updatedAt?.toLocaleTimeString(locale)}
        </span>
      </div>
      <div className="max-w-[42%] shrink-0 truncate text-xs text-foreground-subtle">
        <AITokenInfo />
      </div>
    </footer>
  )
}
