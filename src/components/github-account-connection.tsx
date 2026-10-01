'use client'

import { useEffect, useState } from 'react'
import { Github } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

type GitHubConnection = { enabled: boolean; connected: boolean }

export default function GitHubAccountConnection() {
  const t = useTranslations('accountConnections')
  const locale = useLocale()
  const [connection, setConnection] = useState<GitHubConnection | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/account-connections', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('load_failed')
        const body = (await response.json()) as { data: { github: GitHubConnection } }
        if (!controller.signal.aborted) setConnection(body.data.github)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(t('loadFailed'))
      })
    return () => controller.abort()
  }, [t])

  async function connectGitHub() {
    setConnecting(true)
    setError('')
    try {
      const response = await fetch('/api/account-connections/github', { method: 'POST' })
      if (!response.ok) throw new Error('link_unavailable')
      await signIn('github', { callbackUrl: `/${locale}/user-info` })
    } catch {
      setError(t('connectFailed'))
      setConnecting(false)
    }
  }

  return (
    <section className="space-y-3 rounded-lg border bg-card p-5" aria-label={t('title')}>
      <h2 className="flex items-center gap-2 font-semibold">
        <Github className="size-5" />
        {t('title')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('description')}</p>
      {connection == null && !error && <p className="text-sm text-muted-foreground">{t('loading')}</p>}
      {connection?.connected && <p role="status">{t('connected')}</p>}
      {connection && !connection.connected && (
        <>
          {connection.enabled ? (
            <Button type="button" variant="outline" disabled={connecting} onClick={connectGitHub}>
              {connecting ? t('connecting') : t('connect')}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">{t('unavailable')}</p>
          )}
        </>
      )}
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
