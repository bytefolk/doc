'use client'

import { useState, useEffect, useMemo } from 'react'
import { ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { patch } from '@/lib/ajax'

export default function ThumbUpButton(props: { initialCount: number; publishId: string }) {
  const { initialCount, publishId } = props // Default count if not provided
  const STORE_KEY = useMemo(() => `thumbUp-${publishId}`, [publishId])

  const [loading, setLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  useEffect(() => {
    // Check if the user has already liked this publishId
    const liked = localStorage.getItem(STORE_KEY)
    if (liked) {
      setIsLiked(true)
    }
    setLoading(false)
  }, [STORE_KEY])

  const [thumbUpCount, setThumbUpCount] = useState(initialCount || 0)
  const handleThumbUp = async () => {
    if (loading) return // Prevent multiple clicks
    const previousCount = thumbUpCount
    const previousLiked = isLiked
    if (isLiked) {
      if (thumbUpCount <= 0) return // Prevent decrementing below zero
      setThumbUpCount(thumbUpCount - 1)
      setIsLiked(false)
      localStorage.removeItem(STORE_KEY)
      const ok = await patchData(`/api/pub/thumb-up-decrease/${publishId}`)
      if (!ok) {
        setThumbUpCount(previousCount)
        setIsLiked(true)
        localStorage.setItem(STORE_KEY, 'true')
      }
    } else {
      setThumbUpCount(thumbUpCount + 1)
      setIsLiked(true)
      localStorage.setItem(STORE_KEY, 'true')
      const ok = await patchData(`/api/pub/thumb-up/${publishId}`)
      if (!ok) {
        setThumbUpCount(previousCount)
        setIsLiked(previousLiked)
        localStorage.removeItem(STORE_KEY)
      }
    }
  }

  async function patchData(url: string) {
    setLoading(true)
    try {
      const response = await patch(url, {})
      if (response.errno !== 0) {
        throw new Error('Network response was not ok')
      }
      return true
    } catch (error) {
      console.error('Error:', error)
      return false
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
