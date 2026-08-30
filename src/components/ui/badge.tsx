'use client'

import { Badge as SharedBadge, type BadgeProps as SharedBadgeProps } from '@fullstack-ai-infra/ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ai'

const toneMap = {
  default: 'success',
  secondary: 'neutral',
  destructive: 'danger',
  outline: 'neutral',
  ai: 'ai',
} as const satisfies Record<BadgeVariant, NonNullable<SharedBadgeProps['tone']>>

export interface BadgeProps extends Omit<SharedBadgeProps, 'tone' | 'variant'> {
  variant?: BadgeVariant | null
}

interface BadgeVariantOptions {
  variant?: BadgeVariant | null
  className?: string
}

function badgeVariants({ variant = 'default', className }: BadgeVariantOptions = {}) {
  const resolvedVariant = variant || 'default'
  return cn('ui-badge', `ui-badge--${toneMap[resolvedVariant]}`, className)
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <SharedBadge
      tone={toneMap[variant || 'default']}
      className={cn(variant === 'outline' && 'border border-border', className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
