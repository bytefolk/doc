import { db } from '@/db/db'
import { resolveAuthConfiguration } from '@/lib/auth-configuration'
import { getUserInfo } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getUserInfo()
  if (user?.id == null) {
    return Response.json(
      { error: { code: 'unauthorized', message: 'Authentication required' } },
      { status: 401, headers: { 'cache-control': 'no-store' } }
    )
  }

  try {
    const account = await db.account.findFirst({
      where: { userId: user.id, provider: 'github' },
      select: { provider: true },
    })
    return Response.json(
      {
        data: {
          github: {
            enabled: Boolean(resolveAuthConfiguration().github),
            connected: account != null,
          },
        },
      },
      { headers: { 'cache-control': 'no-store' } }
    )
  } catch {
    return Response.json(
      { error: { code: 'unavailable', message: 'Could not load connected accounts' } },
      { status: 503, headers: { 'cache-control': 'no-store' } }
    )
  }
}
