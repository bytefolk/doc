import { useEffect, useRef } from 'react'
import { Bot } from 'lucide-react'
import scrollIntoView from 'scroll-into-view-if-needed'
import { useTranslations } from 'next-intl'
import AIMarkdownContent from './ai-markdown-content'

interface IProps {
  content: string
}

export default function ChatItemAIGenerating(props: IProps) {
  const { content } = props
  const t = useTranslations('AIInput')

  // 滚动到最底部
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (bottomRef.current == null) return
    scrollIntoView(bottomRef.current!, {
      scrollMode: 'if-needed',
      behavior: 'smooth',
      block: 'center',
    })
  }, [content])

  return (
    <div className="my-1 flex items-start gap-2">
      <div className="w-5">
        <Bot className="mt-1 h-5 w-5 animate-pulse text-ai" />
      </div>
      <div className="mr-2 flex-auto rounded-lg border border-ai bg-ai-soft px-3 py-2 text-foreground">
        {!content && (
          <div className="text-center">
            <span className="text-sm text-muted-foreground">{t('AIgenerating')}</span>
          </div>
        )}
        {content && (
          <div className="prose dark:prose-invert max-w-none">
            <AIMarkdownContent content={content} />
          </div>
        )}
        <div ref={bottomRef} className="text-transparent h-1">
          ...
        </div>
      </div>
    </div>
  )
}
