'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DOC_NAV_DEPTH_EVENT } from '@/constants'
import { readNavDepth } from '@/lib/workspace-navigation'
import { useTranslations } from 'next-intl'

export default function WorkspaceBackButton() {
  const t = useTranslations('common')
  const [canBack, setCanBack] = useState(false)

  useEffect(() => {
    const sync = () => setCanBack(readNavDepth() > 0)
    sync()
    window.addEventListener('popstate', sync)
    window.addEventListener(DOC_NAV_DEPTH_EVENT, sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener(DOC_NAV_DEPTH_EVENT, sync)
    }
  }, [])

  if (!canBack) return null

  return (
    <Button type="button" variant="ghost" size="icon" aria-label={t('goBack')} onClick={() => window.history.back()}>
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
    </Button>
  )
}
