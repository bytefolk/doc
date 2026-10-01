/** Use GitHub's verified primary email, never an unverified public profile field. */
export async function fetchVerifiedGitHubProfile(accessToken: string | undefined, fetcher: typeof fetch = fetch) {
  if (!accessToken) throw new Error('GitHub identity verification failed')
  const headers = {
    authorization: `Bearer ${accessToken}`,
    accept: 'application/vnd.github+json',
    'user-agent': 'doc',
  }
  const options: RequestInit = { headers, redirect: 'error', signal: AbortSignal.timeout(15_000) }
  const [profileResponse, emailsResponse] = await Promise.all([
    fetcher('https://api.github.com/user', options),
    fetcher('https://api.github.com/user/emails', options),
  ])
  if (!profileResponse.ok || !emailsResponse.ok) throw new Error('GitHub identity verification failed')
  const profile = (await profileResponse.json()) as Record<string, unknown>
  const emails = (await emailsResponse.json()) as Array<{ email?: unknown; primary?: unknown; verified?: unknown }>
  if (
    !Number.isSafeInteger(profile.id) ||
    (profile.id as number) <= 0 ||
    typeof profile.login !== 'string' ||
    !profile.login.trim() ||
    !Array.isArray(emails)
  ) {
    throw new Error('GitHub identity verification failed')
  }
  const primary = emails.find(
    (email) =>
      email.primary === true &&
      email.verified === true &&
      typeof email.email === 'string' &&
      /^[^\s@]+@[^\s@]+$/.test(email.email)
  )
  if (!primary) throw new Error('GitHub identity verification failed')
  return { ...profile, email: primary.email as string }
}
