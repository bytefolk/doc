'use client'

import * as React from 'react'

import { buttonVariants, type ButtonSize, type ButtonVariant } from '@/components/ui/button'

export interface LinkButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant | null
  size?: ButtonSize | null
}

// Anchor styled like a Button. buttonVariants lives in a 'use client' module,
// so server components must render this wrapper instead of calling it.
export default function LinkButton({ variant, size, className, children, ...props }: LinkButtonProps) {
  return (
    <a className={buttonVariants({ variant, size, className })} {...props}>
      {children}
    </a>
  )
}
