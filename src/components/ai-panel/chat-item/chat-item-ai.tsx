import { useState } from 'react'
import { Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import AIMarkdownContent from './ai-markdown-content'

interface IProps {
  content: string
}

export default function ChatItemAI(props: IProps) {
  const { content } = props
  const t = useTranslations('AIInput')

  const [viewMore, setViewMore] = useState(false)

  return (
    <div className="my-1 flex items-start gap-2">
      <div className="w-5">
        <Bot className="mt-1 h-5 w-5 text-ai" />
      </div>
      <div className="mr-2 flex-auto overflow-x-auto rounded-lg border border-ai bg-ai-soft px-3 py-2 text-foreground">
        <div className={cn('prose dark:prose-invert max-w-none', viewMore ? '' : 'max-h-60 overflow-y-hidden')}>
          <AIMarkdownContent content={content} />
        </div>
        <div className="mt-1">
          <Button variant="link" className="p-1 m-1 h-6" onClick={() => setViewMore(!viewMore)}>
            {viewMore ? t('viewLess') : t('viewMore')}
          </Button>
        </div>
      </div>
    </div>
  )
}
