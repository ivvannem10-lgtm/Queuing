import type { NextAuthOptions, Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './db'

export const authOptions: NextAuthOptions = {
  session:  { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8 hours
  pages: {
    signIn:  '/login',
    error:   '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        if (!user || !user.isActive) return null

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        return {
          id:      user.id,
          name:    user.name,
          email:   user.email,
          role:    user.role as import('@/types').Role,
          brandId: user.brandId ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id
        token.role    = (user as any).role    as import('@/types').Role
        token.brandId = (user as any).brandId as string | null
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.id      = token.id      as string
        session.user.role    = token.role    as import('@/types').Role
        session.user.brandId = token.brandId as string | null
      }
      return session
    },
  },
  events: {
    async signIn({ user }) {
      await prisma.auditLog.create({
        data: {
          userId:  user.id,
          action:  'SIGN_IN',
          entity:  'User',
          entityId: user.id,
        },
      }).catch(() => {})
    },
    async signOut({ token }) {
      if (token?.id) {
        await prisma.auditLog.create({
          data: {
            userId:  token.id as string,
            action:  'SIGN_OUT',
            entity:  'User',
            entityId: token.id as string,
          },
        }).catch(() => {})
      }
    },
  },
}

// NextAuth type augmentation
declare module 'next-auth' {
  interface Session {
    user: {
      id:      string
      name:    string
      email:   string
      role:    import('@/types').Role
      brandId: string | null
    }
  }
  interface User {
    id:      string
    role:    import('@/types').Role
    brandId: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id:      string
    role:    import('@/types').Role
    brandId: string | null
  }
}
