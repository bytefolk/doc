'use client'

import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCompactWorkspace } from '@/hooks/use-compact-workspace'

interface ResponsiveWorkspaceProps {
  navigation: React.ReactNode
  children: React.ReactNode
  labels: {
    open: string
    close: string
    navigation: string
  }
}

export default function ResponsiveWorkspace({ navigation, children, labels }: ResponsiveWorkspaceProps) {
  const isCompact = useCompactWorkspace()
  const [navigationOpen, setNavigationOpen] = useState(false)
  const openButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const navigationRef = useRef<HTMLDivElement>(null)
  const navigationShellRef = useRef<HTMLDivElement>(null)
  const wasNavigationOpenRef = useRef(false)

  useEffect(() => {
    if (!isCompact) setNavigationOpen(false)
  }, [isCompact])

  useEffect(() => {
    navigationShellRef.current?.toggleAttribute('inert', isCompact && !navigationOpen)
  }, [isCompact, navigationOpen])

  useEffect(() => {
    if (!navigationOpen) {
      if (wasNavigationOpenRef.current) openButtonRef.current?.focus()
      wasNavigationOpenRef.current = false
      return
    }
    wasNavigationOpenRef.current = true
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const target = event.target instanceof HTMLElement ? event.target : null
      const focusIsInNestedLayer =
        target != null &&
        !navigationRef.current?.contains(target) &&
        Boolean(
          target.closest(
            '[data-radix-popper-content-wrapper], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'
          )
        )
      if (focusIsInNestedLayer) return

      if (event.key === 'Escape') {
        event.preventDefault()
        setNavigationOpen(false)
        return
      }
      if (event.key !== 'Tab') return

      const focusable = navigationRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable?.length) {
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
      } else if (!navigationRef.current?.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigationOpen])

  function handleNavigationSelection(event: React.MouseEvent<HTMLDivElement>) {
    if (!isCompact) return
    const target = event.target instanceof HTMLElement ? event.target : null
    if (target?.closest('a[href], [role="link"]')) setNavigationOpen(false)
  }

  return (
    <div className="h-screen overflow-hidden bg-canvas">
      {isCompact && (
        <Button
          ref={openButtonRef}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={labels.open}
          aria-expanded={navigationOpen}
          aria-controls="document-navigation"
          className="fixed left-2 top-3 z-40"
          onClick={() => setNavigationOpen(true)}
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </Button>
      )}

      {isCompact && navigationOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-overlay"
          onMouseDown={() => setNavigationOpen(false)}
        />
      )}

      <ResizablePanelGroup direction="horizontal" className="h-screen overflow-hidden">
        <ResizablePanel
          defaultSize={15}
          className={cn(
            'z-50',
            isCompact
              ? 'fixed inset-y-0 left-0 !w-[min(86vw,20rem)] !flex-none bg-navigation shadow-lg'
              : 'min-w-44 max-w-[500px]',
            isCompact && !navigationOpen && '-translate-x-full'
          )}
        >
          <div
            ref={navigationShellRef}
            className="h-full"
            aria-hidden={isCompact && !navigationOpen ? true : undefined}
          >
            {(!isCompact || navigationOpen) && (
              <div
                ref={navigationRef}
                id="document-navigation"
                role={isCompact ? 'dialog' : undefined}
                aria-modal={isCompact ? true : undefined}
                aria-label={labels.navigation}
                className="relative h-full"
                onClickCapture={handleNavigationSelection}
              >
                {isCompact && (
                  <Button
                    ref={closeButtonRef}
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={labels.close}
                    className="absolute right-2 top-3 z-10"
                    onClick={() => setNavigationOpen(false)}
                  >
                    <X aria-hidden="true" className="h-5 w-5" />
                  </Button>
                )}
                {navigation}
              </div>
            )}
          </div>
        </ResizablePanel>
        {!isCompact && <ResizableHandle withHandle />}
        <ResizablePanel defaultSize={85} className={cn('min-w-0', isCompact && '!flex-[1_1_100%]')}>
          {children}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
