'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

type Props = {
  href: string
  label: string
}

export default function AdminNavLink({ href, label }: Props) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center justify-center rounded-md text-center px-3 py-2 text-sm font-medium transition-colors',
        isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-background hover:text-foreground'
      )}
    >
      {label}
    </Link>
  )
}
