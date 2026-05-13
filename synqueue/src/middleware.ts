import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
type Role = string

export default withAuth(
  function middleware(req) {
    const { token }   = req.nextauth
    const { pathname } = req.nextUrl
    const role         = token?.role as Role | undefined

    // Admin routes — only ADMIN and SUPER_ADMIN
    if (pathname.startsWith('/admin')) {
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/login?error=forbidden', req.url))
      }
    }

    // Staff routes — STAFF, ADMIN, SUPER_ADMIN
    if (pathname.startsWith('/staff')) {
      if (!role || role === 'CLIENT') {
        return NextResponse.redirect(new URL('/login?error=forbidden', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        // Public routes — no auth needed
        if (
          pathname.startsWith('/queue') ||
          pathname.startsWith('/display') ||
          pathname.startsWith('/login') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/queues') ||
          pathname.startsWith('/api/display') ||
          pathname.startsWith('/api/departments') ||
          pathname.startsWith('/api/analytics') ||
          pathname.startsWith('/api/settings') ||
          pathname.startsWith('/api/brands') ||
          pathname === '/'
        ) {
          return true
        }
        return !!token
      },
    },
  },
)

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.ico).*)',
  ],
}
