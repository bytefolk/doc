'use client'

import * as React from 'react'
import {
  Button as SharedButton,
  buttonVariants as sharedButtonVariants,
  type ButtonProps as SharedButtonProps,
} from '@fullstack-ai-infra/ui'

import { cn } from '@/lib/utils'

export type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link'
  | 'ai'
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

const variantMap = {
  default: 'primary',
  destructive: 'danger',
  outline: 'secondary',
  secondary: 'secondary',
  ghost: 'ghost',
  link: 'ghost',
  ai: 'ai',
} as const satisfies Record<ButtonVariant, NonNullable<SharedButtonProps['variant']>>

const sizeMap = {
  default: 'md',
  sm: 'sm',
  lg: 'lg',
  icon: 'icon',
} as const satisfies Record<ButtonSize, NonNullable<SharedButtonProps['size']>>

// The pre-migration wrapper exposed the full HTML button attribute surface.
// The shared-UI Button types a narrower contract but forwards unknown props to
// the underlying element, so the wrapper keeps the wide surface (role, aria-*,
// style, suppressHydrationWarning, ...) and passes it through unchanged.
export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant | null
  size?: ButtonSize | null
  type?: 'button' | 'submit' | 'reset'
}

interface ButtonVariantOptions {
  variant?: ButtonVariant | null
  size?: ButtonSize | null
  className?: string
}

function buttonVariants({
  variant = 'default',
  size = 'default',
  className,
}: ButtonVariantOptions = {}) {
  const legacyVariant = variant || 'default'
  const legacySize = size || 'default'
  return cn(
    sharedButtonVariants({
      variant: variantMap[legacyVariant],
      size: sizeMap[legacySize],
    }),
    legacyVariant === 'link' && 'underline-offset-4 hover:underline',
    className
  )
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <SharedButton
      ref={ref}
      variant={variantMap[variant || 'default']}
      size={sizeMap[size || 'default']}
      className={cn(variant === 'link' && 'underline-offset-4 hover:underline', className)}
      {...(props as SharedButtonProps)}
    />
  )
)
Button.displayName = 'Button'

export { Button, buttonVariants }
