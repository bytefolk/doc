import '../globals.css'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { requireAdminUser } from '@/lib/admin'
import AdminUserMenu from './components/admin-user-menu'
import AdminNavLink from './components/admin-nav-link'
import zhCnMessages from '../../../messages/zh-cn.json'
import { ThemeProvider } from '@/components/theme-provider'
import ThemeBootstrapScript from '@/components/theme-bootstrap-script'

const navItems = [
  { href: '/admin', label: '概览' },
  { href: '/admin/docs', label: '文档管理' },
  { href: '/admin/users', label: '用户管理' },
]

export const metadata: Metadata = {
  title: '后台管理',
}

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminUser()
  if (user == null) {
    redirect('/')
  }

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <ThemeBootstrapScript />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <NextIntlClientProvider locale="zh-cn" messages={zhCnMessages}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <div className="mx-auto flex min-h-screen max-w-7xl">
              <aside className="hidden w-60 shrink-0 border-r border-border bg-card px-4 py-6 md:block">
                <div className="mb-8">
                  <h1 className="doc-interface-heading mt-2 text-xl font-semibold">后台管理</h1>
                </div>
                <nav className="space-y-1">
                  {navItems.map((item) => (
                    <AdminNavLink key={item.href} href={item.href} label={item.label} />
                  ))}
                </nav>
              </aside>

              <div className="flex min-h-screen min-w-0 flex-1 flex-col">
                <header className="border-b border-border bg-card">
                  <div className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="flex-1" />
                    <AdminUserMenu name={user.name} email={user.email} image={user.image} />
                  </div>
                  <nav className="flex gap-1 border-t border-border px-2 py-2 md:hidden">
                    {navItems.map((item) => (
                      <AdminNavLink key={item.href} href={item.href} label={item.label} />
                    ))}
                  </nav>
                </header>

                <main className="min-w-0 flex-1 px-6 py-6">{children}</main>
              </div>
            </div>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
