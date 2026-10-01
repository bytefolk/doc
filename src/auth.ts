import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { type Adapter } from 'next-auth/adapters'
import { db } from '@/db/db'

import GitHub from 'next-auth/providers/github'
import Email from 'next-auth/providers/nodemailer'
import Resend from 'next-auth/providers/resend'
// 其他 provider 看这里 https://github.com/nextauthjs/next-auth/blob/main/apps/examples/nextjs/auth.ts

import type { NextAuthConfig } from 'next-auth'
import { isGitHubAccountAllowed, resolveAuthConfiguration } from '@/lib/auth-configuration'
import { cookies } from 'next/headers'
import { authorizeGitHubLink, GITHUB_LINK_COOKIE } from '@/lib/github-account-link'
import { fetchVerifiedGitHubProfile } from '@/lib/github-identity'

function genProviders() {
  const configuration = resolveAuthConfiguration()
  const providers: NextAuthConfig['providers'] = []

  if (configuration.github) {
    providers.push(
      GitHub({
        ...configuration.github,
        checks: ['pkce', 'state'],
        account: () => ({}),
        userinfo: {
          url: 'https://api.github.com/user',
          async request({ tokens }: { tokens: { access_token?: string } }) {
            return fetchVerifiedGitHubProfile(tokens.access_token)
          },
        },
      })
    )
  }
  if (configuration.smtp) providers.push(Email(configuration.smtp))
  if (configuration.resend) providers.push(Resend(configuration.resend))

  return providers
}

export const config: NextAuthConfig = {
  trustHost: true,
  theme: {
    logo: '/doc-mark.svg',
  },
  adapter: PrismaAdapter(db) as Adapter,
  providers: genProviders(),
  pages: {
    signIn: '/signin',
    verifyRequest: '/signin/verify-request',
  },
  basePath: '/api/auth',
  session: {
    strategy: 'jwt',
  },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async signIn({ account }) {
      if (account?.provider !== 'github') return process.env.DOC_PERSONAL_PREVIEW !== '1'
      if (!isGitHubAccountAllowed(account.providerAccountId)) return false
      try {
        const session = await auth()
        const cookieStore = await cookies()
        const allowed = await authorizeGitHubLink(account.providerAccountId, session?.user?.id, cookieStore.getAll())
        if (cookieStore.has(GITHUB_LINK_COOKIE)) cookieStore.delete(GITHUB_LINK_COOKIE)
        return allowed
      } catch {
        return false
      }
    },
    authorized({ request, auth }) {
      // const { pathname } = request.nextUrl
      // if (pathname.startsWith('/work/')) return !!auth // 因为 NextAuth Adapter 默认不支持 middleware，所以这里暂时不用了
      return true
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      // @ts-ignore
      session.user.id = token.id ?? token.sub
      return session
    },
  },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(config)
