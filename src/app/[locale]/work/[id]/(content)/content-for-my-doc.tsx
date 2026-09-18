'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import TiptapEditor from '@/components/editor'
import { updateTitle, updateIcon } from '../client-action'
import emitter from '@/lib/emitter'
import {
  CONTENT_WIDTH,
  DOC_TITLE_INPUT_ID,
  LAST_DOC_ID_KEY,
  EVENT_KEY_FOCUS_CONTENT,
  WORK_CONTENT_CONTAINER_ID,
  DOC_ICON_LIST,
} from '@/constants'
import { useDocsStore } from '@/stores/docs-store'
import { useTranslations } from 'next-intl'
import { getRandomElement } from '@/lib/utils'
import { flushCurrentDocVersionByBeacon, flushDocVersionById } from '@/lib/doc-version/client'
import AutoGrowingTitle from '@/components/auto-growing-title'

export default function ContentForMyDoc() {
  const docs = useDocsStore((s) => s.docs)
  const id = useDocsStore((s) => s.curDocId)
  const curDoc = useMemo(() => docs.find((d) => d.id === id), [docs, id])
  const { title = '', icon = '' } = curDoc || {}
  const updateDocTitle = useDocsStore((s) => s.updateDocTitle)
  const updateDocIcon = useDocsStore((s) => s.updateDocIcon)

  // Record entry doc id only once per page session.
  // Uses sessionStorage to survive SPA navigation but reset on full page reload.
  useEffect(() => {
    if (!sessionStorage.getItem('hasRecordedEntryDoc')) {
      localStorage.setItem(LAST_DOC_ID_KEY, id)
      sessionStorage.setItem('hasRecordedEntryDoc', 'true')
    }
  }, [id])

  useEffect(() => {
    // 页面刷新或关闭时尽力通过 beacon 发送一个当前版本快照。
    const saveVersionByBeacon = () => {
      flushCurrentDocVersionByBeacon()
    }

    window.addEventListener('pagehide', saveVersionByBeacon)
    return () => {
      window.removeEventListener('pagehide', saveVersionByBeacon)
    }
  }, [])

  useEffect(() => {
    // 当前文档切换前补一次异步版本保存，兜住非 nav 触发的文档跳转。
    return () => {
      flushDocVersionById(id)
    }
  }, [id])

  const [renderEditor, setRenderEditor] = useState(false)
  useEffect(() => {
    setRenderEditor(false)
    setTimeout(() => {
      setRenderEditor(true) // when doc changed, force re-render editor
    }, 100)
  }, [id])

  const fullWidth = CONTENT_WIDTH + 80 // 两边留白 40px

  if (!curDoc) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>Error: curDoc is null.</p>
      </div>
    )
  }

  return (
    <div
      id={WORK_CONTENT_CONTAINER_ID}
      className="mx-auto my-8 mb-20 min-w-0 scroll-mt-5 sm:my-12"
      style={{ maxWidth: `${fullWidth}px` }}
    >
      <div className="mx-4 mb-6 flex min-w-0 items-center sm:mx-10">
        <IconInput id={id} icon={icon} updateDocIcon={updateDocIcon} />
        <TitleInput id={id} title={title} updateDocTitle={updateDocTitle} />
        {/* 可能还会再增加其他功能，例如设置 Icon 、背景等 */}
      </div>
      {renderEditor && <TiptapEditor id={id} />}
      {/* <p className="mx-10">editor {id}</p> */}
    </div>
  )
}

function IconInput(props: { id: string; icon: string | null; updateDocIcon: (id: string, title: string) => void }) {
  const { id, icon, updateDocIcon } = props

  // init icon
  useEffect(() => {
    if (!icon) {
      const newIcon = getRandomElement(DOC_ICON_LIST)
      updateDocIcon(id, newIcon) // 更新 store
      setTimeout(() => {
        try {
          updateIcon(id, newIcon) // 更新数据库。对于新建的文档，需要延迟一秒再更新数据库，否则数据库中没有这个文档
        } catch (ex) {}
      }, 1000)
    }
  }, [id, icon, updateDocIcon])

  // change icon
  const changeIconHandler = (newIcon: string) => {
    updateDocIcon(id, newIcon) // 更新 store
    updateIcon(id, newIcon) // 更新数据库
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="mr-2 shrink-0 cursor-pointer">
          <span className="text-3xl sm:text-4xl">{icon}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-2 w-80">
        {DOC_ICON_LIST.map((i) => (
          <div key={i} className="inline-block text-xl p-1 cursor-pointer" onClick={() => changeIconHandler(i)}>
            <span>{i}</span>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}

function TitleInput(props: { id: string; title: string; updateDocTitle: (id: string, title: string) => void }) {
  const { id, title, updateDocTitle } = props
  const t = useTranslations('docItem')

  useEffect(() => {
    document.title = title || t('unTitled')
  }, [title, t])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const newTitle = e.target.value
    updateDocTitle(id, newTitle)
    updateTitle(id, newTitle || t('unTitled')) // 更新数据库
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.code !== 'Enter') return
    e.preventDefault()
    const pos = e.currentTarget.selectionStart || 0 // cursor position
    if (pos < title.length) return
    emitter.emit(EVENT_KEY_FOCUS_CONTENT)
  }

  return (
    <AutoGrowingTitle
      id={DOC_TITLE_INPUT_ID}
      aria-label={t('titleInputLabel')}
      placeholder={t('titleInputPlaceholder')}
      value={title}
      maxLength={100}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    />
  )
}
