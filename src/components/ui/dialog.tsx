'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { forwardRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  DialogContent as SharedDialogContent,
  type DialogContentProps as SharedDialogContentProps,
} from '@fullstack-ai-infra/ui'

export {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@fullstack-ai-infra/ui'

export type DialogContentProps = SharedDialogContentProps

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(({ closeLabel, ...props }, ref) => {
  const t = useTranslations('common')
  return <SharedDialogContent ref={ref} closeLabel={closeLabel || t('closeDialog')} {...props} />
})
DialogContent.displayName = 'DialogContent'

// Kept only for source compatibility. Shared DialogContent owns its portal and overlay.
export const DialogPortal = DialogPrimitive.Portal
export const DialogOverlay = DialogPrimitive.Overlay
