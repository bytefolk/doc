import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ locale: explicitLocale, requestLocale }) => {
  const requestedLocale = explicitLocale || (await requestLocale)

  // Routes outside the i18n middleware (e.g. /admin) carry no resolvable
  // locale; serve the default locale instead of 404ing so next-intl server
  // APIs and NextIntlClientProvider keep working there.
  if (requestedLocale == null) {
    return {
      locale: routing.defaultLocale,
      messages: (await import(`../../messages/${routing.defaultLocale}.json`)).default,
    }
  }

  // Validate that the incoming `locale` parameter is valid
  if (!routing.locales.includes(requestedLocale as any)) notFound()

  const locale = requestedLocale as (typeof routing.locales)[number]

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
