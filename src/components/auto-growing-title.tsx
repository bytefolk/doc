'use client'

import { useEffect, useRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type AutoGrowingTitleProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export default function AutoGrowingTitle({ className, value, ...props }: AutoGrowingTitleProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const resize = () => {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
    resize()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    observer?.observe(textarea)
    return () => observer?.disconnect()
  }, [value])

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      value={value}
      className={cn(
        'min-h-[2.75rem] min-w-0 flex-1 resize-none overflow-hidden border-none bg-transparent p-0 text-3xl font-bold leading-[1.12] text-foreground outline-none placeholder:text-foreground-subtle focus-visible:ring-0 sm:text-4xl',
        className
      )}
      {...props}
    />
  )
}
