'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { History } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/components/ui/use-toast'
import { fetchDocVersionDetail, fetchDocVersions } from '@/lib/doc-version/api'
import DiffBlockRenderer from '@/components/doc-version/diff-block-renderer'
import { getCurrentDocSnapshot, restoreDocVersion } from '@/lib/doc-version/client'
import { buildRenderBlocks, RenderBlock } from '@/lib/doc-version/block-diff'
import { buildTextDiffSegments, extractPlainText } from '@/lib/doc-version/diff'
import { IDocVersionDetail, IDocVersionListItem } from '@/lib/doc-version/types'
import { useDocVersionStore } from '@/stores/doc-version-store'
import { useDocsStore } from '@/stores/docs-store'
import { useUserStore } from '@/stores/user-store'
import { CONTENT_WIDTH } from '@/constants'

const VERSION_LIST_WIDTH = 280
const VERSION_DIALOG_GAP = 16
const VERSION_DIALOG_HORIZONTAL_PADDING = 48
const VERSION_PREVIEW_TARGET_WIDTH = CONTENT_WIDTH + 80
const VERSION_DIALOG_MAX_WIDTH =
  VERSION_PREVIEW_TARGET_WIDTH + VERSION_LIST_WIDTH + VERSION_DIALOG_GAP + VERSION_DIALOG_HORIZONTAL_PADDING

// 打开版本中心弹窗后，拉取并展示当前文档的版本列表。
export default function VersionDialog(props: { id: string }) {
  const { id } = props
  const t = useTranslations('docVersion')
  const locale = useLocale()
  const { toast } = useToast()
  const open = useDocVersionStore((s) => s.open)
  const setOpen = useDocVersionStore((s) => s.setOpen)
  const selectedVersionId = useDocVersionStore((s) => s.selectedVersionId)
  const setSelectedVersionId = useDocVersionStore((s) => s.setSelectedVersionId)
  const updateDocTitle = useDocsStore((s) => s.updateDocTitle)
  const userInfo = useUserStore((s) => s.userInfo)

  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [versions, setVersions] = useState<IDocVersionListItem[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [selectedVersionDetail, setSelectedVersionDetail] = useState<IDocVersionDetail | null>(null)
  const [baseVersionDetail, setBaseVersionDetail] = useState<IDocVersionDetail | null>(null)
  const detailRequestKeyRef = useRef('')

  useEffect(() => {
    if (!open) return

    let mounted = true
    setLoading(true)
    setLoadFailed(false)
    setVersions([])
    detailRequestKeyRef.current = ''
    setSelectedVersionId('')
    setSelectedVersionDetail(null)
    setBaseVersionDetail(null)
    setDetailLoading(false)
    fetchDocVersions(id)
      .then((list) => {
        if (!mounted) return
        setVersions(list)
        if (list.length === 0) {
          return
        }
        setSelectedVersionId(list[0].id)
      })
      .catch((ex) => {
        if (!mounted) return
        console.error('Fetch doc versions error', ex)
        setLoadFailed(true)
        setVersions([])
        detailRequestKeyRef.current = ''
        setSelectedVersionId('')
        setSelectedVersionDetail(null)
        setBaseVersionDetail(null)
        setDetailLoading(false)
        toast({
          variant: 'destructive',
          description: t('loadFailed'),
        })
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [id, open, setSelectedVersionId, t, toast])

  useEffect(() => {
    if (!open || !selectedVersionId) {
      setDetailLoading(false)
      setSelectedVersionDetail(null)
      setBaseVersionDetail(null)
      return
    }

    const selectedVersionIndex = versions.findIndex((version) => version.id === selectedVersionId)
    if (selectedVersionIndex === -1) {
      setDetailLoading(false)
      setSelectedVersionDetail(null)
      setBaseVersionDetail(null)
      return
    }

    const baseVersionId = versions[selectedVersionIndex + 1]?.id || ''
    const requestKey = `${selectedVersionId}::${baseVersionId}`

    if (detailRequestKeyRef.current === requestKey) return
    detailRequestKeyRef.current = requestKey

    let mounted = true
    setDetailLoading(true)
    setSelectedVersionDetail(null)
    setBaseVersionDetail(null)

    Promise.all([
      fetchDocVersionDetail(selectedVersionId),
      baseVersionId ? fetchDocVersionDetail(baseVersionId) : Promise.resolve(null),
    ])
      .then(([selectedDetail, baseDetail]) => {
        if (!mounted) return
        setSelectedVersionDetail(selectedDetail)
        setBaseVersionDetail(baseDetail)
      })
      .catch((ex) => {
        if (!mounted) return
        console.error('Fetch doc version detail error', ex)
        detailRequestKeyRef.current = ''
        setSelectedVersionDetail(null)
        setBaseVersionDetail(null)
        toast({
          variant: 'destructive',
          description: t('loadFailed'),
        })
      })
      .finally(() => {
        if (mounted) setDetailLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [open, selectedVersionId, t, toast, versions])

  useEffect(() => {
    if (!open) {
      detailRequestKeyRef.current = ''
      setVersions([])
      setSelectedVersionId('')
      setSelectedVersionDetail(null)
      setBaseVersionDetail(null)
      setDetailLoading(false)
    }
  }, [open, setSelectedVersionId])

  const currentTitle = selectedVersionDetail?.title || ''
  const currentContentText = selectedVersionDetail ? extractPlainText(selectedVersionDetail.content) : ''
  // 首个版本没有上一版本可比时，直接按当前内容预览，避免展示为全量新增。
  const previousTitle = baseVersionDetail?.title || currentTitle
  const previousContent = baseVersionDetail?.content || selectedVersionDetail?.content || ''
  const previousContentText = extractPlainText(previousContent)
  const titleSegments = buildTextDiffSegments(previousTitle, currentTitle)
  const contentBlocks = selectedVersionDetail ? buildRenderBlocks(previousContent, selectedVersionDetail.content) : []
  const previewBlocks = buildPreviewBlocks({
    previousTitle,
    currentTitle,
    titleSegments,
    previousContentText,
    currentContentText,
    contentBlocks,
  })
  const currentUserName = userInfo?.name || userInfo?.email || t('currentUser')
  const isVersionListEmpty = !loading && !loadFailed && versions.length === 0

  const formatVersionTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    } catch {
      return iso
    }
  }

  async function handleRestore() {
    if (!selectedVersionId) return

    const currentSnapshot = getCurrentDocSnapshot()
    if (!currentSnapshot) {
      toast({
        variant: 'destructive',
        description: t('snapshotMissing'),
      })
      return
    }
    if (!window.confirm(t('restoreConfirm'))) {
      return
    }

    try {
      setRestoring(true)
      const data = await restoreDocVersion({
        docId: id,
        targetVersionId: selectedVersionId,
        currentSnapshot,
      })
      updateDocTitle(id, data.title || '')
      setOpen(false)
      toast({
        description: t('restoreSuccess'),
      })
    } catch (ex) {
      console.error('Restore doc version error', ex)
      toast({
        variant: 'destructive',
        description: t('restoreFailed'),
      })
    } finally {
      setRestoring(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="w-[calc(100vw-2rem)] h-[80vh] flex flex-col"
        style={{ maxWidth: `${VERSION_DIALOG_MAX_WIDTH}px` }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-start">
            <History className="size-4 shrink-0 mr-1" />
            {t('entry')}
          </DialogTitle>
          <DialogDescription>{t('dialogDescription')}</DialogDescription>
        </DialogHeader>
        {loadFailed ? (
          <p role="alert" className="py-8 text-sm text-danger">
            {t('loadFailed')}
          </p>
        ) : isVersionListEmpty ? (
          <EmptyState className="flex-1" icon={<History />} title={t('noVersions')} description={t('noVersionsDesc')} />
        ) : (
          <div className="grid flex-1 min-h-0 grid-cols-1 grid-rows-[minmax(6rem,0.7fr)_minmax(0,1fr)] gap-4 sm:grid-cols-[280px_minmax(0,1fr)] sm:grid-rows-1">
            <div className="min-w-0 border rounded-md overflow-y-auto p-2">
              {loading && <p className="text-sm text-muted-foreground">{t('loading')}</p>}
              {!loading &&
                versions.map((version) => (
                  <button
                    key={version.id}
                    className="w-full text-left rounded-md p-2 text-foreground hover:bg-muted data-[active=true]:bg-muted"
                    onClick={() => setSelectedVersionId(version.id)}
                    aria-label={formatVersionTime(version.createdAt)}
                    data-active={selectedVersionId === version.id}
                    type="button"
                  >
                    <p className="text-sm text-muted-foreground">{formatVersionTime(version.createdAt)}</p>
                    <p className="text-xs font-medium">{currentUserName}</p>
                  </button>
                ))}
            </div>
            <div className="min-w-0 border rounded-md bg-background p-3 sm:p-4 flex flex-col min-h-0">
              <div className="h-full min-h-0 overflow-auto rounded-md bg-background px-3 py-4 sm:px-6 sm:py-5 text-foreground">
                {detailLoading && t('loading')}
                {!detailLoading && selectedVersionDetail && (
                  <div data-testid="doc-version-preview-content" className="mx-auto w-full max-w-[840px] space-y-4">
                    {previewBlocks.map((block, index) => (
                      <DiffBlockRenderer key={`${block.kind}-${index}`} block={block} />
                    ))}
                  </div>
                )}
              </div>
              <div className="pt-4 text-right">
                <Button disabled={!selectedVersionId || restoring} onClick={handleRestore}>
                  {restoring ? t('restoring') : t('restore')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function buildPreviewBlocks(input: {
  previousTitle: string
  currentTitle: string
  titleSegments: Array<{ type: 'added' | 'removed' | 'unchanged'; text: string }>
  previousContentText: string
  currentContentText: string
  contentBlocks: RenderBlock[]
}): RenderBlock[] {
  const { previousTitle, currentTitle, titleSegments, previousContentText, currentContentText, contentBlocks } = input
  const titleFallback = previousTitle || currentTitle
  const titleRenderSegments = currentTitle
    ? titleSegments
    : titleFallback
      ? [{ type: 'unchanged' as const, text: titleFallback }]
      : []
  const titleChanged = titleRenderSegments.some((segment) => segment.type !== 'unchanged')
  const blocks: RenderBlock[] = []

  if (titleRenderSegments.length > 0) {
    blocks.push({
      kind: 'heading',
      changeType: titleChanged ? 'modified' : 'unchanged',
      attrs: { level: 1 },
      segments: titleRenderSegments,
    })
  }

  if (contentBlocks.length > 0) {
    return [...blocks, ...contentBlocks]
  }

  const contentFallback = previousContentText || currentContentText
  if (!contentFallback) return blocks
  const contentChangeType: RenderBlock['changeType'] =
    currentContentText && currentContentText !== previousContentText ? 'modified' : 'unchanged'

  return [
    ...blocks,
    {
      kind: 'paragraph' as const,
      changeType: contentChangeType,
      segments: [{ type: 'unchanged', text: contentFallback }],
    },
  ]
}
