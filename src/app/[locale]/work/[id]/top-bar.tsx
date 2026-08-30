'use client'

import { useMemo, useState } from 'react'
import { Ellipsis } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import Logo from '@/components/logo-component'
import ChangeTheme from '@/components/change-theme'
import ChangeLocale from '@/components/change-locale'
import ShareDocButton from '@/components/share-doc-button2'
import StarDocButton from '@/components/star-doc-button'
import PubDocButton from '@/components/pub-doc-button'
import DocUpdateStatus from '@/components/doc-update-status'
import AIPanelButton from '@/components/ai-panel-button'
import { Separator } from '@/components/ui/separator'
import DocDeleteButton from '@/components/delete-doc-button'
import DuplicateDocButton from '@/components/duplicate-doc-button'
import MoveDocButton from '@/components/move-doc-button'
import ExportPdfButton from '@/components/export-pdf-button'
import VersionDialog from '@/components/doc-version/version-dialog'
import VersionEntryButton from '@/components/doc-version/version-entry-button'
import { useDocsStore } from '@/stores/docs-store'
import { useUserStore } from '@/stores/user-store'
import { Topbar } from '@fullstack-ai-infra/ui'
import { useTranslations } from 'next-intl'
import { useCompactWorkspace } from '@/hooks/use-compact-workspace'

export default function TopBar() {
  const t = useTranslations('common')
  const isCompact = useCompactWorkspace()
  const docs = useDocsStore((s) => s.docs)
  const id = useDocsStore((s) => s.curDocId)
  const doc = useMemo(() => docs.find((d) => d.id === id), [docs, id])
  const userInfo = useUserStore((s) => s.userInfo)

  return (
    <Topbar
      aria-label={t('documentToolbar')}
      className="max-[1023px]:pl-14 max-[480px]:pr-2"
      breadcrumbs={
        <div className="inline-flex items-center gap-3">
          <Logo />
          <div className="max-[479px]:hidden">
            <DocUpdateStatus id={id} />
          </div>
        </div>
      }
      actions={
        <>
          {id !== '0' && (
            <>
              <AIPanelButton />
              {isCompact ? (
                <CompactDocumentActions id={id} disabled={doc?.userId !== userInfo?.id} />
              ) : (
                <>
                  <StarDocButton id={id} disabled={doc?.userId !== userInfo?.id} />
                  <ShareDocButton id={id} disabled={doc?.userId !== userInfo?.id} />
                  <PubDocButton id={id} disabled={doc?.userId !== userInfo?.id} />
                  <TopBarHandlers id={id} disabled={doc?.userId !== userInfo?.id} />
                </>
              )}
            </>
          )}
          <ChangeLocale />
          <ChangeTheme />
        </>
      }
    />
  )
}

function CompactDocumentActions(props: { id: string; disabled?: boolean }) {
  const { id, disabled = false } = props
  const t = useTranslations('common')
  const [open, setOpen] = useState(false)

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label={t('documentActions')} disabled={disabled}>
            <Ellipsis aria-hidden="true" className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 space-y-1 p-1">
          <StarDocButton id={id} disabled={disabled} className="w-full justify-start" />
          <ShareDocButton id={id} disabled={disabled} className="w-full justify-start" />
          <PubDocButton id={id} disabled={disabled} className="w-full justify-start" />
          <Separator className="my-1" />
          <TopBarHandlerItems id={id} onVersionEntry={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
      <VersionDialog id={id} />
    </>
  )
}

function TopBarHandlers(props: { id: string; disabled?: boolean }) {
  const { id, disabled = false } = props
  const [open, setOpen] = useState(false)
  const t = useTranslations('common')

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label={t('moreDocumentActions')} disabled={disabled}>
            <Ellipsis aria-hidden="true" className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-32 p-1">
          <TopBarHandlerItems id={id} onVersionEntry={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
      <VersionDialog id={id} />
    </>
  )
}

function TopBarHandlerItems(props: { id: string; onVersionEntry?: () => void }) {
  const { id, onVersionEntry } = props
  return (
    <>
      <DuplicateDocButton id={id} />
      <MoveDocButton id={id} />
      <ExportPdfButton id={id} />
      <VersionEntryButton onEntryClick={onVersionEntry} />
      <Separator className="my-1" />
      <DocDeleteButton id={id} />
    </>
  )
}
