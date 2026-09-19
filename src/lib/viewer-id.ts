import 'server-only'
import { cookies } from 'next/headers'
import { auth } from 'auth'

const COOKIE_NAME = 'viewer_id'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/**
 * Viewer identity for published-document likes (#72).
 * Signed-in users are `user:{id}`. Anonymous visitors get an httpOnly UUID
 * cookie: it is a documented opaque token, not a signed capability, and it
 * only scopes like rows for this browser profile.
 */
export async function resolveViewerId(): Promise<{ viewerId: string; setCookie: boolean }> {
  const session = await auth()
  if (session?.user?.id) {
    return { viewerId: `user:${session.user.id}`, setCookie: false }
  }

  const cookieStore = await cookies()
  const existing = cookieStore.get(COOKIE_NAME)
  if (existing?.value) {
    return { viewerId: existing.value, setCookie: false }
  }

  const viewerId = crypto.randomUUID()
  cookieStore.set(COOKIE_NAME, viewerId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
  return { viewerId, setCookie: true }
}
