'use client'

import { memo, useEffect, useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useEditorStore, ICollabUser } from '@/stores/editor-store'
import { useLocale, useTranslations } from 'next-intl'
import { SourceStatus, type SourceStatusState } from '@fullstack-ai-infra/ui'

interface IProps {
  id: string
}

export default function DocUpdateStatus(props: IProps) {
  const { id } = props
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const editorDocId = useEditorStore((s) => s.docId)

  const characterCount = useEditorStore((s) => s.characterCount)
  const wordCount = useEditorStore((s) => s.wordCount)
  const locale = useLocale()
  const t = useTranslations('editor')

  // collaborative state
  const collaborativeState = useEditorStore((s) => s.collaborativeState)

  // collaborative users
  const collaborativeUsers = useEditorStore((s) => s.collaborativeUsers)
  const sourceState: SourceStatusState =
    collaborativeState === 'connected' ? 'available' : collaborativeState === 'connecting' ? 'syncing' : 'offline'

  if (id === '0') return null

  // 切换文档的瞬间，两者可能不一致
  if (!mounted || id !== editorDocId) return <Skeleton className="h-6 w-32 ml-3" />

  return (
    <>
      {/* collaborative users */}
      <div className="ml-5 flex" role="collaborative-users">
        {collaborativeUsers.map((user: ICollabUser) => {
          let { clientId, name, avatar, email } = user || {}
          if (!name) name = email
          if (!name) return null
          return (
            <TooltipProvider key={clientId}>
              <Tooltip>
                <TooltipTrigger>
                  <UserAvatar avatar={avatar} name={name} />
                </TooltipTrigger>
                <TooltipContent>{name}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>
      {/* collaborative state */}
      <SourceStatus
        role="collaborative-state"
        data-title={collaborativeState}
        className="ml-2"
        state={sourceState}
        label={collaborativeState}
      />
      {/* character count */}
      <span role="char-count" className="ml-2 inline-flex items-center text-xs text-foreground-muted">
        {locale === 'zh-cn' && `共 ${characterCount >= 0 ? characterCount : '---'} 字`}
        {locale !== 'zh-cn' &&
          `Total ${wordCount >= 0 ? wordCount : '---'} words, ${characterCount >= 0 ? characterCount : '---'} characters`}
      </span>
    </>
  )
}

const UserAvatar = memo(function AvatarWrapper(props: { avatar: string; name: string }) {
  const { avatar, name } = props
  return (
    <Avatar className="h-7 w-7 border -ml-2">
      <AvatarImage src={avatar || ''} alt={name || ''} />
      <AvatarFallback>{name?.slice(0, 1)}</AvatarFallback>
    </Avatar>
  )
})
