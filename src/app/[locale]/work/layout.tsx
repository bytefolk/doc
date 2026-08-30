import { redirect } from '@/i18n/routing'
import { getUserInfo } from '@/lib/session'
import { getLocale } from 'next-intl/server'

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()

  const user = await getUserInfo()
  if (user == null) {
    redirect({ href: '/signin?callbackUrl=/work', locale })
    return null
  }
  if (!user.name?.trim()) {
    redirect({ href: '/user-info', locale })
    return null
  }

  return <>{children}</>
}
