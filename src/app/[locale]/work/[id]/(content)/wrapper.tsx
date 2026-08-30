'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { User } from 'next-auth'
import { Skeleton } from '@/components/ui/skeleton'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useDocsStore, IDoc } from '@/stores/docs-store'
import { useShareStore, IShareRelationDoc } from '@/stores/share-store'
import { useUserStore } from '@/stores/user-store'
import { CONTENT_WIDTH, WORK_CONTENT_PANEL_ID, WORK_CONTENT_SCROLL_CONTAINER } from '@/constants'
import useDocs from '../hooks/useDocs'
import ContentForMyDoc from './content-for-my-doc'
import ContentForShareDoc from './content-for-share-doc'
import ContentHome from './content-home'
import { useTranslations } from 'next-intl'
import RightBottomBar from '@/components/right-bottom-bar'
import AIPanel from '@/components/ai-panel'
import { useDialogStore } from '@/stores/dialog-store'
import { Button } from '@/components/ui/button'
import { useCompactWorkspace } from '@/hooks/use-compact-workspace'
interface IProps {
  id: string
  userInfo: User | null
  collabAPIToken: string
}

export default function ContentWrapper(props: IProps) {
  const { userInfo: userInfoProp, id: idProp, collabAPIToken } = props

  // set userInfo
  const userInfo = useUserStore((s) => s.userInfo)
  const setUserInfo = useUserStore((s) => s.setUserInfo)
  useEffect(() => {
    if (userInfoProp) {
      setUserInfo(userInfoProp)
    }
  }, [userInfoProp, setUserInfo])
  // set collabAPIToken
  const setCollabAPIToken = useUserStore((s) => s.setCollabAPIToken)
  useEffect(() => {
    if (collabAPIToken) setCollabAPIToken(collabAPIToken)
  }, [collabAPIToken, setCollabAPIToken])

  // if curDoc is my doc
  const loading = useDocsStore((s) => s.loading)
  const creating = useDocsStore((s) => s.creating)
  const curDocId = useDocsStore((s) => s.curDocId)
  const docs = useDocsStore((s) => s.docs)
  const curDoc = useMemo(() => docs.find((d) => d.id === curDocId), [docs, curDocId])
  const setCurDocId = useDocsStore((s) => s.setCurDocId)
  useEffect(() => {
    setCurDocId(idProp)
  }, [idProp, setCurDocId])

  // if home page
  const [isHome, setIsHome] = useState(false)
  useEffect(() => {
    if (curDocId === '0') {
      setIsHome(true)
    } else {
      setIsHome(false)
    }
  }, [curDocId])

  // if curDoc is shared doc
  const shareRelations = useShareStore((s) => s.shareRelations)
  const [notFound, setNotFound] = useState(false)
  const [shareDoc, setShareDoc] = useState<IShareRelationDoc>()
  useEffect(() => {
    if (loading) return
    if (curDoc != null) return

    const isSharedDoc = shareRelations.some((r) => {
      if (r.docId === curDocId && r.userId === userInfo?.id) {
        setShareDoc(r.doc)
        return true
      }
    })
    if (!isSharedDoc) {
      setNotFound(true)
    } else {
      setNotFound(false)
    }
  }, [curDoc, loading, curDocId, shareRelations, userInfo])

  const { createDoc } = useDocs()

  const t = useTranslations('docItem')
  const aiT = useTranslations('AIInput')

  const AIPanelOpen = useDialogStore((s) => s.AIPanelOpen)
  const setAIPanelOpen = useDialogStore((s) => s.setAIPanelOpen)
  const isCompact = useCompactWorkspace()
  const compactAiPanelRef = useRef<HTMLElement>(null)
  const compactAiWasOpenRef = useRef(false)

  useEffect(() => {
    if (!AIPanelOpen || !isCompact) return
    compactAiWasOpenRef.current = true
    const panel = compactAiPanelRef.current
    panel
      ?.querySelector<HTMLElement>('button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
      ?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const target = event.target instanceof HTMLElement ? event.target : null
      const focusIsInNestedLayer =
        target != null &&
        !panel?.contains(target) &&
        Boolean(
          target.closest(
            '[data-radix-popper-content-wrapper], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'
          )
        )
      if (focusIsInNestedLayer) return
      if (event.key === 'Escape') {
        event.preventDefault()
        setAIPanelOpen(false)
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable.length) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (!panel.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [AIPanelOpen, isCompact, setAIPanelOpen])

  useEffect(() => {
    if (compactAiWasOpenRef.current && !AIPanelOpen) {
      document.querySelector<HTMLElement>('[aria-controls="ai-assistant-panel"]')?.focus()
      compactAiWasOpenRef.current = false
    }
    if (!isCompact) compactAiWasOpenRef.current = false
  }, [AIPanelOpen, isCompact])

  if (loading || creating || userInfo == null) {
    return (
      <div className="flex">
        <div className="flex-auto flex flex-col space-y-3 mx-auto mt-8" style={{ maxWidth: `${CONTENT_WIDTH}px` }}>
          <Skeleton className="h-12 w-full mb-1" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </div>
        <div className="w-1/5 mt-8 px-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (isHome) {
    return <ContentHome />
  }

  function getContentComponent() {
    if (curDoc) {
      return <ContentForMyDoc />
    } else if (shareDoc) {
      return <ContentForShareDoc />
    }
    return null
  }

  if (curDoc || shareDoc) {
    return (
      <ResizablePanelGroup id="document-ai-panel-group" direction="horizontal" className="relative flex min-w-0">
        <ResizablePanel
          id={WORK_CONTENT_PANEL_ID}
          order={1}
          defaultSize={68}
          minSize={40}
          className="relative min-w-0 flex-auto"
        >
          <div
            id={WORK_CONTENT_SCROLL_CONTAINER}
            className="overflow-y-auto"
            style={{ height: 'calc(100vh - var(--ui-topbar-height) - 2.25rem)' }}
          >
            {getContentComponent()}
          </div>
          <RightBottomBar />
        </ResizablePanel>
        {AIPanelOpen && !isCompact && <ResizableHandle id="document-ai-resize-handle" />}
        {AIPanelOpen && !isCompact && (
          <ResizablePanel
            id="ai-assistant-panel"
            order={2}
            defaultSize={32}
            minSize={28}
            className="min-w-[340px] border-l border-border bg-surface"
            style={{ height: 'calc(100vh - var(--ui-topbar-height) - 2.25rem)' }}
          >
            <AIPanel />
          </ResizablePanel>
        )}
        {AIPanelOpen && isCompact && (
          <>
            <div
              aria-hidden="true"
              className="fixed inset-x-0 bottom-0 top-[var(--ui-topbar-height)] z-20 bg-overlay"
              onMouseDown={() => setAIPanelOpen(false)}
            />
            <aside
              ref={compactAiPanelRef}
              id="ai-assistant-panel"
              role="dialog"
              aria-modal="true"
              aria-label={aiT('AIWritingChat')}
              data-testid="ai-panel-drawer"
              className="fixed bottom-0 right-0 top-[var(--ui-topbar-height)] z-30 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-lg"
            >
              <AIPanel />
            </aside>
          </>
        )}
      </ResizablePanelGroup>
    )
  }

  if (notFound) {
    return (
      <div className="p-8 text-center text-foreground-muted" role="alert">
        <p>
          {t('notFound')}
          <Button variant="link" className="ml-1" onClick={() => createDoc()}>
            {t('create')}
          </Button>
        </p>
      </div>
    )
  }
}
