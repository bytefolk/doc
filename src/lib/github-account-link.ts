import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { db } from '@/db/db'

export const GITHUB_LINK_COOKIE = 'doc.github-link-intent'
export const GITHUB_LINK_TTL_SECONDS = 5 * 60
type Cookie = { name: string; value: string }
type LinkIntent = { nonce: string; userId: string; sessionDigest: string; expiresAt: number }

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function signature(value: string) {
  if (!process.env.AUTH_SECRET) throw new Error('Account linking is not configured')
  return createHmac('sha256', process.env.AUTH_SECRET).update(value).digest('base64url')
}

export function authSessionDigest(cookies: Cookie[]) {
  const secure = '__Secure-authjs.session-token'
  const plain = 'authjs.session-token'
  const prefix = cookies.some((cookie) => cookie.name === secure || cookie.name.startsWith(`${secure}.`))
    ? secure
    : plain
  const chunks = cookies.filter((cookie) => cookie.name === prefix || cookie.name.startsWith(`${prefix}.`))
  if (chunks.length === 0) return null
  const whole = chunks.find((cookie) => cookie.name === prefix)
  if (whole) return chunks.length === 1 && whole.value ? digest(whole.value) : null
  const indexed = chunks.map((cookie) => ({ index: Number(cookie.name.slice(prefix.length + 1)), value: cookie.value }))
  indexed.sort((left, right) => left.index - right.index)
  if (indexed.some((chunk, index) => !Number.isInteger(chunk.index) || chunk.index !== index || !chunk.value))
    return null
  return digest(indexed.map((chunk) => chunk.value).join(''))
}

export async function issueGitHubLinkIntent(userId: string, cookies: Cookie[]) {
  const sessionDigest = authSessionDigest(cookies)
  if (!sessionDigest) throw new Error('Account linking requires an authenticated session')
  const intent: LinkIntent = {
    nonce: randomUUID(),
    userId,
    sessionDigest,
    expiresAt: Date.now() + GITHUB_LINK_TTL_SECONDS * 1000,
  }
  const payload = Buffer.from(JSON.stringify(intent)).toString('base64url')
  const signed = `${payload}.${signature(payload)}`
  await db.verificationToken.create({
    data: { identifier: `github-link:${userId}`, token: digest(intent.nonce), expires: new Date(intent.expiresAt) },
  })
  return signed
}

export async function consumeGitHubLinkIntent(value: string, userId: string | undefined, cookies: Cookie[]) {
  try {
    if (!userId || value.length > 2048) return false
    const [payload, providedSignature, extra] = value.split('.')
    if (!payload || !providedSignature || extra != null) return false
    const expected = Buffer.from(signature(payload))
    const provided = Buffer.from(providedSignature)
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return false
    const intent = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as LinkIntent
    if (
      typeof intent.nonce !== 'string' ||
      intent.userId !== userId ||
      intent.sessionDigest !== authSessionDigest(cookies) ||
      !Number.isFinite(intent.expiresAt) ||
      intent.expiresAt <= Date.now()
    )
      return false
    const consumed = await db.verificationToken.deleteMany({
      where: {
        identifier: `github-link:${userId}`,
        token: digest(intent.nonce),
        expires: { gt: new Date() },
      },
    })
    return consumed.count === 1
  } catch {
    return false
  }
}

export async function authorizeGitHubLink(accountId: string, userId: string | undefined, cookies: Cookie[]) {
  if (userId && !(await db.user.findUnique({ where: { id: userId }, select: { id: true } }))) return false
  const intent = cookies.find((cookie) => cookie.name === GITHUB_LINK_COOKIE)
  if (intent) return consumeGitHubLinkIntent(intent.value, userId, cookies)
  if (!userId) return true // Ordinary anonymous login; Auth.js checks existing account/email ownership.
  const account = await db.account.findUnique({
    where: { provider_providerAccountId: { provider: 'github', providerAccountId: accountId } },
    select: { userId: true },
  })
  // A signed-in user needs an explicit actor/session-bound intent to attach a new subject.
  return account?.userId === userId
}
