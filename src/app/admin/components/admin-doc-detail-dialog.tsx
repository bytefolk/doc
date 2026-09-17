'use client'

import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PubDocStatusValue } from '@/lib/pub-doc-status'
import AdminPubStatusSelect from './admin-pub-status-select'

type Props = {
  doc: {
    id: string
    title: string
    isDeleted: boolean
    createdAt: Date
    updatedAt: Date
    user: {
      id: string
      name: string | null
      email: string | null
    }
    latestPubDoc: {
      publishId: string
      status: PubDocStatusValue
      statusReason: string | null
      statusUpdatedAt: Date | null
      statusUpdatedBy: string | null
      updatedAt: Date
    } | null
    isPublished: boolean
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-sm text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  )
}

export default function AdminDocDetailDialog({ doc }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          查看详情
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{doc.title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 text-sm md:grid-cols-2">
          <Field label="作者" value={doc.user.name || doc.user.email || doc.user.id} />
          <Field label="邮箱" value={doc.user.email || '-'} />
          <Field label="创建时间" value={formatDate(doc.createdAt)} />
          <Field label="更新时间" value={formatDate(doc.updatedAt)} />
          <div>
            <p className="mb-1 text-sm text-muted-foreground">删除状态</p>
            <Badge variant={doc.isDeleted ? 'destructive' : 'secondary'}>{doc.isDeleted ? '已删除' : '正常'}</Badge>
          </div>
          <div>
            <p className="mb-1 text-sm text-muted-foreground">发布状态</p>
            {doc.latestPubDoc ? (
              <AdminPubStatusSelect
                publishId={doc.latestPubDoc.publishId}
                currentStatus={doc.latestPubDoc.status}
                statusReason={doc.latestPubDoc.statusReason}
                statusUpdatedAt={doc.latestPubDoc.statusUpdatedAt}
                isPublished={doc.isPublished}
              />
            ) : (
              <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-muted-foreground">
                未发布
              </span>
            )}
          </div>
          <Field
            label="状态更新时间"
            value={doc.latestPubDoc?.statusUpdatedAt ? formatDate(doc.latestPubDoc.statusUpdatedAt) : '-'}
          />
          <Field label="状态说明" value={doc.latestPubDoc?.statusReason || '暂无额外说明'} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
          {doc.latestPubDoc?.publishId && (
            <Link
              href={`/pub/${doc.latestPubDoc.publishId}`}
              target="_blank"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              查看发布页
            </Link>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
