'use client'

import { Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { clearWorkspaceEntryPoint } from '@/lib/workspace-navigation'
import { useTranslations } from 'next-intl'

export default function ResetEntryPointButton(props: { className?: string }) {
  const t = useTranslations('common')
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn('h-8 w-full justify-start p-2', props.className)}
      onClick={() => clearWorkspaceEntryPoint()}
    >
      <Undo2 className="mr-1 h-4 w-4" />
      {t('resetEntryPoint')}
    </Button>
  )
}
