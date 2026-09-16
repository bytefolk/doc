import { FileQuestion } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmptyState } from '@/components/ui/empty-state'

type Props = {
  title?: string
  description?: string
  action?: ReactNode
}

export default function AdminEmptyState({ title = '暂无数据', description = '当前没有匹配的记录', action }: Props) {
  return <EmptyState icon={<FileQuestion />} title={title} description={description} action={action} />
}
