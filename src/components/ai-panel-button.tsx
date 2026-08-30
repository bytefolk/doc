'use client'

import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDialogStore } from '@/stores/dialog-store'
import { useTranslations } from 'next-intl'

export default function AIPanelButton() {
  const AIPanelOpen = useDialogStore((s) => s.AIPanelOpen)
  const setAIPanelOpen = useDialogStore((s) => s.setAIPanelOpen)
  const t = useTranslations('AIInput')
  return (
    <Button
      variant={AIPanelOpen ? 'secondary' : 'ghost'}
      size="sm"
      aria-label={t('AIWriting')}
      aria-expanded={AIPanelOpen}
      aria-controls="ai-assistant-panel"
      onClick={() => setAIPanelOpen(!AIPanelOpen)}
    >
      <Sparkles aria-hidden="true" className="h-4 w-4 min-[720px]:mr-1" />
      <span className="hidden min-[720px]:inline">{t('AIWriting')}</span>
    </Button>
  )
}
