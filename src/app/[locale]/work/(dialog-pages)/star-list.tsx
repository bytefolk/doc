'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { IDoc } from '@/stores/docs-store'
import { timeAgo } from '@/lib/dt'
import { get } from '@/lib/ajax'
import scrollIntoView from 'scroll-into-view-if-needed'
import debounce from 'lodash.debounce'
import useDialogListKeyPress from './hooks/useDialogListKeyPress'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { useDialogStore } from '@/stores/dialog-store'

export default function StarList() {
  const t = useTranslations('favorList')
  const { favoriteDialogOpen, setFavoriteDialogOpen } = useDialogStore()
  return (
    <Dialog open={favoriteDialogOpen} onOpenChange={setFavoriteDialogOpen}>
      <DialogTrigger asChild>
        <Button className="w-full justify-start px-2 h-9" variant="ghost">
          <Star className="h-4 w-4 mr-1" />
          {t('title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <StarListTable />
      </DialogContent>
    </Dialog>
  )
}

function StarListTable() {
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [list, setList] = useState<IDoc[]>([])
  const t = useTranslations('favorList')

  const emptyT = useTranslations('emptyStates')

  // 搜索
  // eslint-disable-next-line
  const searchFn = useCallback(
    debounce(async (keyword: string) => {
      const url = `/api/doc?isStar=1&keyword=${keyword}`
      setLoading(true)
      setLoadFailed(false)
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

  useEffect(() => {
    searchFn(keyword)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 搜索关键字
  const [keyword, setKeyword] = useState('')
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newKeyword = e.target.value
    setCurrentIndex(-1)
    setKeyword(newKeyword)
    searchFn(newKeyword)
  }

  // 点击，跳转
  function handleClick(doc: IDoc) {
    const { id } = doc
    location.href = `/work/${id}`
  }

  // 监听键盘上下键和回车键，返回当前激活的文档的索引 currentIndex
  const { currentIndex, setCurrentIndex } = useDialogListKeyPress({ list, handleClick, setKeyword })

  return (
    <div className="h-96 flex flex-col">
      <div className="h-10 my-2">
        <Input
          value={keyword}
          onChange={handleChange}
          maxLength={20}
          placeholder={t('inputPlaceholder')}
          className="focus-visible:ring-transparent"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <p role="status" className="mt-10 text-center text-sm text-muted-foreground">
            {emptyT('loading')}
          </p>
        )}
        {loadFailed && (
          <p role="alert" className="mt-8 text-sm text-danger">
            {emptyT('loadFailed')}
          </p>
        )}
        {!loading && !loadFailed && list.length === 0 && (
          <EmptyState
            icon={<Star />}
            title={emptyT(keyword.trim() ? 'noResultsTitle' : 'favoritesTitle')}
            description={emptyT(keyword.trim() ? 'noResultsDescription' : 'favoritesDescription')}
            action={
              keyword.trim() ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setKeyword('')
                    searchFn('')
                  }}
                >
                  {emptyT('clearSearch')}
                </Button>
              ) : undefined
            }
          />
        )}
        {!loading && list.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-auto">{t('docTitle')}</TableHead>
                <TableHead className="text-right">{t('docUpdateTime')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((doc, docIndex) => {
                return (
                  <Item
                    key={doc.id}
                    doc={doc}
                    currentIndex={currentIndex}
                    docIndex={docIndex}
                    handleClick={handleClick}
                  />
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

interface ItemProps {
  doc: IDoc
  docIndex: number
  currentIndex: number
  handleClick: (doc: IDoc) => void
}

// 单独拆分出 Item 组件，使得列表元素过多并需要滚动时，滚动到超出视口的文章
function Item(props: ItemProps) {
  const { doc, docIndex, currentIndex, handleClick } = props
  const isCurrent = currentIndex === docIndex
  const tableRowRef = useRef<HTMLTableRowElement>(null)
  const t = useTranslations('favorList')
  const timeAgoT = useTranslations('timeAgo')

  useEffect(() => {
    if (!isCurrent) return
    if (tableRowRef.current == null) return
    scrollIntoView(tableRowRef.current!, {
      scrollMode: 'if-needed',
      behavior: 'smooth',
      block: 'center',
    })
  }, [isCurrent])

  const time = useMemo(() => {
    return timeAgo(doc.updatedAt?.toString() || '', timeAgoT)
  }, [doc.updatedAt, timeAgoT])

  return (
    <TableRow
      ref={tableRowRef}
      key={doc.id}
      className={cn('cursor-pointer', isCurrent && 'bg-muted')}
      onClick={() => handleClick(doc)}
    >
      <TableCell>
        <p className="overflow-hidden truncate">{doc.title || t('unTitled')}</p>
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">{time}</TableCell>
    </TableRow>
  )
}
