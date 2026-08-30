'use client'

import { Ellipsis } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import DocDeleteButton from '@/components/delete-doc-button'
import StarDocButton from '@/components/star-doc-button'
import DuplicateDocButton from '@/components/duplicate-doc-button'
import MoveDocButton from '@/components/move-doc-button'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

interface IProps {
  id: string
}

export default function ItemHandlers(props: IProps) {
  const { id } = props
  const t = useTranslations('common')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={t('moreDocumentActions')}>
          <Ellipsis className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className=" w-28 p-1">
        <StarDocButton id={id} className="w-full justify-start h-8 px-2" />
        <Separator className="my-1" />
        <DuplicateDocButton id={id} />
        <MoveDocButton id={id} />
        <Separator className="my-1" />
        <DocDeleteButton id={id} />
      </PopoverContent>
    </Popover>
  )
}
