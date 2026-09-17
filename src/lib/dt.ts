import { useTranslations } from 'next-intl'

type TimeAgoT = (key: string, params?: Record<string, number>) => string

export function timeAgo(timeString: string, t: TimeAgoT, current = new Date()): string {
  if (!timeString) return ''

  const previous = new Date(timeString)
  const timeDifference = current.valueOf() - previous.valueOf()

  const seconds = Math.floor(timeDifference / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(months / 12)

  if (years > 0) return t('yearsAgo', { count: years })
  if (months > 0) return t('monthsAgo', { count: months })
  if (days > 0) return t('daysAgo', { count: days })
  if (hours > 0) return t('hoursAgo', { count: hours })
  if (minutes > 0) return t('minutesAgo', { count: minutes })
  if (seconds > 0) return t('secondsAgo', { count: seconds })
  return t('justNow')
}

export function useTimeAgo(timeString: string): string {
  const t = useTranslations('timeAgo')
  return timeAgo(timeString, t)
}

export function isOneWeekAgo(dt: Date, now = new Date()) {
  const diff = now.getTime() - dt.getTime()
  const oneWeek = 7 * 24 * 3600 * 1000
  return diff > oneWeek
}

export function isSameMonth(dt: Date, now = new Date()) {
  return now.getMonth() === dt.getMonth() && now.getFullYear() === dt.getFullYear()
}

export function getHourStamp() {
  const now = Date.now()
  const hourStamp = now / (60 * 60 * 1000)
  return Math.floor(hourStamp)
}
