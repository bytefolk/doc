'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Search as SearchIcon, File, Trash2, FileSearch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import debounce from 'lodash.debounce'
import { get } from '@/lib/ajax'
import { IDoc } from '@/stores/docs-store'
import scrollIntoView from 'scroll-into-view-if-needed'
import useDialogListKeyPress from './hooks/useDialogListKeyPress'
import { useTranslations } from 'next-intl'
import { useDialogStore } from '@/stores/dialog-store'

export default function Search() {
  const { searchDialogOpen, setSearchDialogOpen } = useDialogStore()
  const t = useTranslations('search')
  return (
    <Dialog onOpenChange={setSearchDialogOpen} open={searchDialogOpen}>
      <DialogTrigger asChild>
        <Button className="w-full justify-start px-2 h-9" variant="ghost">
          <SearchIcon className="h-4 w-4 mr-1" />
          {t('title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <SearchPanel />
      </DialogContent>
    </Dialog>
  )
}

function SearchPanel() {
  const t = useTranslations('search')
  const emptyT = useTranslations('emptyStates')

  // input elem
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current!.focus()
  })

  // search keyword
  const [keyword, setKeyword] = useState('')
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKeyword = e.target.value
    setLoading(true)
    setLoadFailed(false)
    // 重置选择文档的状态
    setCurrentIndex(-1)
    setKeyword(newKeyword)
    searchFn(newKeyword)
  }

  // eslint-disable-next-line
  const searchFn = useCallback(
    debounce(async (keyword: string) => {
      if (keyword.trim().length === 0) {
        setList([])
        setLoading(false)
        return
      }

      const url = `/api/doc?keyword=${keyword}`
      try {
        const response = await get(url)
        if (response.errno !== 0 || !Array.isArray(response.data)) throw new Error('Document list unavailable')
        setList(response.data)
      } catch {
        setList([])
        setLoadFailed(true)
      } finally {
        setLoading(false)
      }
    }, 500),
    []
  )

  // search result
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [list, setList] = useState<IDoc[]>([])
  const notFound = !loading && !loadFailed && list.length === 0 && keyword.trim().length > 0

  // item click
  function handleClick(doc: IDoc) {
    const { isDeleted, id } = doc
    if (isDeleted) return
    location.href = `/work/${id}`
  }

  // 监听键盘上下键和回车键，返回当前激活的文档的索引 currentIndex
  const { currentIndex, setCurrentIndex } = useDialogListKeyPress({ list, setKeyword, handleClick })

  return (
    <div className="h-96 flex flex-col">
      <div className="h-10 flex items-center border rounded p-1 pl-2 mt-3">
        <SearchIcon className=" text-muted-foreground" />
        <Input
          ref={inputRef}
          value={keyword}
          onChange={handleChange}
          placeholder={t('searchPlaceholder')}
          className="border-none py-0 px-1 h-8 focus-visible:ring-transparent"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {!loading && !loadFailed && keyword.trim().length === 0 && (
          <EmptyState
            icon={<FileSearch />}
            title={emptyT('searchPromptTitle')}
            description={emptyT('searchPromptDescription')}
          />
        )}
        {loading && (
          <p role="status" className="text-muted-foreground text-center mt-8">
            {emptyT('loading')}
          </p>
        )}
        {loadFailed && (
          <p role="alert" className="mt-8 text-sm text-danger">
            {emptyT('loadFailed')}
          </p>
        )}
        {notFound && (
          <EmptyState
            icon={<FileSearch />}
            title={emptyT('noResultsTitle')}
            description={emptyT('noResultsDescription')}
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setKeyword('')
                  setList([])
                  setCurrentIndex(-1)
                  inputRef.current?.focus()
                }}
              >
                {emptyT('clearSearch')}
              </Button>
            }
          />
        )}
        {!loading && list.length > 0 && (
          <div className="mt-4">
            {list.map((doc: IDoc, docIndex: number) => {
              return (
                <Item
                  key={doc.id}
                  doc={doc}
                  handleClick={handleClick}
                  currentIndex={currentIndex}
                  docIndex={docIndex}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

interface ItemProps {
  doc: IDoc
  handleClick: (doc: IDoc) => void
  currentIndex: number
  docIndex: number
}

// 单独拆分出 Item 组件，使得列表元素过多并需要滚动时，滚动到超出视口的文章
function Item(props: ItemProps) {
  const { doc, handleClick, currentIndex, docIndex } = props
  const isCurrent = currentIndex === docIndex
  const titleContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isCurrent) return
    if (titleContainerRef.current == null) return
    scrollIntoView(titleContainerRef.current!, {
      scrollMode: 'if-needed',
      behavior: 'smooth',
      block: 'center',
    })
  }, [isCurrent])

  return (
    <div
      ref={titleContainerRef}
      key={doc.id}
      onClick={() => handleClick(doc)}
      className={cn(
        `flex items-center text-muted-foreground hover:bg-muted text-lg p-1 cursor-pointer`,
        doc.isDeleted ? 'line-through cursor-not-allowed' : '',
        isCurrent ? 'bg-muted' : ''
      )}
    >
      {doc.isDeleted ? <Trash2 className="h-4 w-4 mr-1" /> : <File className="h-4 w-4 mr-1" />}
      <p className="flex-auto truncate">{doc.title}</p>
    </div>
  )
}
