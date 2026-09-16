'use client'

import { forwardRef, useCallback } from 'react'
import { Input as SharedInput, type InputProps } from '@fullstack-ai-infra/ui'

// The packaged component declares a DOM ref but Ant Input returns a handle.
// Preserve the native ref contract used by editor focus and selection callers.
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const setInputRef = useCallback(
    (value: HTMLInputElement | { input: HTMLInputElement | null } | null) => {
      const input = value && 'input' in value ? value.input : value
      if (typeof ref === 'function') ref(input)
      else if (ref) ref.current = input
    },
    [ref]
  )
  return <SharedInput {...props} ref={setInputRef} />
})
Input.displayName = 'Input'

export { Input, type InputProps }
