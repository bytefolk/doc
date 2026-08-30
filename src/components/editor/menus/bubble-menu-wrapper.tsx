import { cn } from '@/lib/utils'

export default function Wrapper({
  children,
  className,
  menuType,
}: Readonly<{
  children: React.ReactNode
  className?: string
  menuType?: string
}>) {
  const initClassName = 'inline-flex rounded-md border border-border bg-surface-raised p-1 shadow-md'

  const conditionalClasses = menuType === 'table-menu' ? '' : 'space-x-1'

  return <div className={cn(initClassName, conditionalClasses, className)}>{children}</div>
}
