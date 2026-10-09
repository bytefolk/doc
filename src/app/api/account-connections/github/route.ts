import { cookies } from 'next/headers'
import { auth } from 'auth'
import { db } from '@/db/db'
import { resolveAuthConfiguration } from '@/lib/auth-configuration'
import { GITHUB_LINK_COOKIE, issueGitHubLinkIntent } from '@/lib/github-account-link'
import { PersonalAccessTokenApiError, requireSameOrigin } from '@/app/api/personal-access-tokens/_shared'

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const session = await auth()
    const userId = session?.user?.id
    if (!userId || !(await db.user.findUnique({ where: { id: userId }, select: { id: true } }))) {
      return Response.json({ error: { code: 'unauthorized' } }, { status: 401 })
    }
    if (!resolveAuthConfiguration().github) {
      return Response.json({ error: { code: 'provider_unavailable' } }, { status: 503 })
    }
    const cookieStore = await cookies()
    const value = await issueGitHubLinkIntent(userId, cookieStore.getAll())
    const publicUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || request.url
    cookieStore.set(GITHUB_LINK_COOKIE, value, {
      httpOnly: true,
      secure: new URL(publicUrl).protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      // Keep the intent present for the full OAuth state lifetime; the signed payload expires sooner.
      maxAge: 15 * 60,
    })
    return Response.json({ data: { ready: true } }, { headers: { 'cache-control': 'no-store' } })
  } catch (error) {
    return Response.json(
      { error: { code: error instanceof PersonalAccessTokenApiError ? error.code : 'link_unavailable' } },
      { status: error instanceof PersonalAccessTokenApiError ? error.status : 503 }
    )
  }
}
