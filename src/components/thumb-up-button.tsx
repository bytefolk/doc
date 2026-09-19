'use client'

import { useState, useEffect } from 'react'
import { ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { get, patch } from '@/lib/ajax'

export default function ThumbUpButton(props: { initialCount: number; publishId: string }) {
  const { initialCount, publishId } = props

  const [loading, setLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const [thumbUpCount, setThumbUpCount] = useState(initialCount || 0)

  useEffect(() => {
    get(`/api/pub/thumb-up/${publishId}`)
      .then((res) => {
        if (res.errno === 0 && res.data) {
          setIsLiked(res.data.liked)
          setThumbUpCount(res.data.count)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [publishId])

  const handleThumbUp = async () => {
    if (loading) return
    const prevLiked = isLiked
    const prevCount = thumbUpCount

    if (isLiked) {
      setIsLiked(false)
      setThumbUpCount(Math.max(0, thumbUpCount - 1))
    } else {
      setIsLiked(true)
      setThumbUpCount(thumbUpCount + 1)
    }

    setLoading(true)
    try {
      const url = isLiked ? `/api/pub/thumb-up-decrease/${publishId}` : `/api/pub/thumb-up/${publishId}`
      const res = await patch(url, {})
      if (res.errno === 0 && res.data) {
        setIsLiked(res.data.liked)
        setThumbUpCount(res.data.count)
      } else {
        setIsLiked(prevLiked)
        setThumbUpCount(prevCount)
      }
    } catch {
      setIsLiked(prevLiked)
      setThumbUpCount(prevCount)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center  mt-10">
      <Button
        onClick={handleThumbUp}
        variant="outline"
        size="lg"
        className={`flex items-center gap-3 p-6 text-lg font-semibold transition-all duration-200 hover:scale-105 ${
          isLiked ? 'bg-accent border-primary text-accent-foreground hover:bg-accent' : 'hover:bg-accent'
        }`}
        disabled={loading}
      >
        <ThumbsUp
          className={`w-8 h-8 transition-all duration-200 ${isLiked ? 'fill-current text-primary' : 'text-muted-foreground'}`}
        />
        <span className={`tabular-nums text-xl ${isLiked ? 'text-primary' : 'text-foreground'}`}>{thumbUpCount}</span>
      </Button>
    </div>
  )
}
