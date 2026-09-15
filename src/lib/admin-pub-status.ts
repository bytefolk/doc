import { PUB_DOC_STATUS, PubDocStatusValue } from '@/lib/pub-doc-status'

type LatestPubDocLike = {
  status: PubDocStatusValue
  statusReason?: string | null
  statusUpdatedAt?: Date | null
} | null

type AdminPublishAction = {
  targetStatus: PubDocStatusValue
  label: string
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link'
  className?: string
  confirmText?: string
}

export function getAdminPublishStatusMeta(latestPubDoc: LatestPubDocLike, isPublished: boolean) {
  if (isPublished) {
    return {
      code: 'published',
      label: '已发布',
      variant: 'default' as const,
      badgeClassName: 'whitespace-nowrap border-transparent bg-success-soft text-success-strong',
      description: '公开访问正常',
    }
  }

  if (latestPubDoc?.status === PUB_DOC_STATUS.FROZEN) {
    return {
      code: 'frozen',
      label: '已冻结',
      variant: 'outline' as const,
      badgeClassName: 'whitespace-nowrap border-transparent bg-warning-soft text-warning-strong',
      description: latestPubDoc.statusReason || '公开访问已暂停',
    }
  }

  if (latestPubDoc?.status === PUB_DOC_STATUS.UNPUBLISHED) {
    return {
      code: 'unpublished',
      label: '已撤销',
      variant: 'outline' as const,
      badgeClassName: 'whitespace-nowrap border-transparent bg-secondary text-foreground',
      description: '发布链接已下线',
    }
  }

  return {
    code: 'never',
    label: '未发布',
    variant: 'outline' as const,
    badgeClassName: 'whitespace-nowrap border-border bg-card text-muted-foreground',
    description: '暂无发布记录',
  }
}

export function getAdminPublishAction(latestPubDoc: { status: PubDocStatusValue } | null): AdminPublishAction | null {
  if (latestPubDoc == null) return null

  if (latestPubDoc.status === PUB_DOC_STATUS.PUBLISHED) {
    return {
      targetStatus: PUB_DOC_STATUS.FROZEN,
      label: '冻结发布',
      variant: 'outline',
      className: 'h-7 px-2 text-xs border-border bg-warning-soft text-warning-strong hover:bg-warning-soft',
    }
  }

  if (latestPubDoc.status === PUB_DOC_STATUS.FROZEN) {
    return {
      targetStatus: PUB_DOC_STATUS.PUBLISHED,
      label: '恢复公开',
      variant: 'outline',
      className: 'h-7 px-2 text-xs border-border bg-secondary text-foreground hover:bg-muted',
    }
  }

  return {
    targetStatus: PUB_DOC_STATUS.PUBLISHED,
    label: '恢复发布',
    variant: 'outline',
    className: 'border-border bg-secondary text-foreground hover:bg-muted',
  }
}

export function getAdminPublishExtraAction(
  latestPubDoc: { status: PubDocStatusValue } | null
): AdminPublishAction | null {
  if (latestPubDoc == null) return null

  if (latestPubDoc.status === PUB_DOC_STATUS.PUBLISHED || latestPubDoc.status === PUB_DOC_STATUS.FROZEN) {
    return {
      targetStatus: PUB_DOC_STATUS.UNPUBLISHED,
      label: '撤销发布',
      variant: 'outline',
      className: 'h-7 px-2 text-xs border-border bg-danger-soft text-danger-strong hover:bg-danger-soft',
      confirmText: '确认撤销该发布内容？撤销后公开链接将不可访问。',
    }
  }

  return null
}

type AdminPublishStatusOption = {
  targetStatus: PubDocStatusValue
  label: string
}

export function getAdminPublishStatusOptions(currentStatus: PubDocStatusValue): AdminPublishStatusOption[] {
  if (currentStatus === PUB_DOC_STATUS.PUBLISHED) {
    return [
      { targetStatus: PUB_DOC_STATUS.FROZEN, label: '冻结发布' },
      { targetStatus: PUB_DOC_STATUS.UNPUBLISHED, label: '撤销发布' },
    ]
  }

  if (currentStatus === PUB_DOC_STATUS.FROZEN) {
    return [
      { targetStatus: PUB_DOC_STATUS.PUBLISHED, label: '恢复公开' },
      { targetStatus: PUB_DOC_STATUS.UNPUBLISHED, label: '撤销发布' },
    ]
  }

  if (currentStatus === PUB_DOC_STATUS.UNPUBLISHED) {
    return [{ targetStatus: PUB_DOC_STATUS.PUBLISHED, label: '恢复发布' }]
  }

  return []
}
