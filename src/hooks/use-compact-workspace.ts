'use client'

import { useEffect, useState } from 'react'

export const COMPACT_WORKSPACE_QUERY = '(max-width: 1023px)'

export function useCompactWorkspace() {
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPACT_WORKSPACE_QUERY)
    const update = () => setIsCompact(mediaQuery.matches)

    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  return isCompact
}
