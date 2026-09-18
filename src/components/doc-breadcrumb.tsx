'use client'

import { useMemo } from 'react'
import { nav } from '@/app/[locale]/work/[id]/@directory/util'
import { ancestorTrail } from '@/lib/workspace-navigation'
import { useDocsStore } from '@/stores/docs-store'
import { useTranslations } from 'next-intl'

export default function DocBreadcrumb() {
  const t = useTranslations('common')
  const docs = useDocsStore((s) => s.docs)
  const id = useDocsStore((s) => s.curDocId)
  const trail = useMemo(() => ancestorTrail(id, docs), [docs, id])

  if (trail.length <= 1) return null

  return (
    <nav
      aria-label={t('breadcrumb')}
      className="hidden min-w-0 items-center gap-1 text-sm text-foreground-muted md:flex"
    >
      {trail.map((doc, index) => {
        const isLast = index === trail.length - 1
        return (
          <span key={doc.id} className="inline-flex min-w-0 items-center gap-1">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {isLast ? (
              <span className="truncate text-foreground">{doc.title || t('untitledDocument')}</span>
            ) : (
              <button type="button" className="truncate hover:text-foreground" onClick={() => nav(doc.id)}>
                {doc.title || t('untitledDocument')}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
