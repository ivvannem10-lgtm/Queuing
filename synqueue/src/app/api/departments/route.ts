import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ok, err, unauthorized, audit } from '@/lib/utils'
import { z } from 'zod'

const CreateSchema = z.object({
  name:        z.string().min(1).max(100),
  prefix:      z.string().min(2).max(5).toUpperCase(),
  description: z.string().optional(),
  sortOrder:   z.number().default(0),
})

export async function GET(req: NextRequest) {
  const session   = await getServerSession(authOptions)
  const status    = req.nextUrl.searchParams.get('status')
  const brandSlug = req.nextUrl.searchParams.get('brand')

  const where: any = {}
  if (status) where.status = status

  if (brandSlug) {
    // Public queue page: filter by brand slug
    const brand = await prisma.brand.findUnique({ where: { slug: brandSlug } })
    where.brandId = brand?.id ?? '__none__'
  } else if (session?.user.role === 'ADMIN' && session.user.brandId) {
    // Authenticated admin: scope to their brand only
    where.brandId = session.user.brandId
  }
  // Super Admin with no brandSlug param: sees all departments

  const departments = await prisma.department.findMany({
    where,
    include: { _count: { select: { queues: true, counters: true } } },
    orderBy: { sortOrder: 'asc' },
  })

  return ok(departments)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) return unauthorized()

  const body   = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.message)

  // Prefix must be unique within a brand (not globally, to allow same prefix across brands)
  const existing = await prisma.department.findFirst({
    where: {
      prefix:  parsed.data.prefix,
      brandId: session.user.role === 'ADMIN' ? (session.user.brandId ?? undefined) : undefined,
    },
  })
  if (existing) return err('A department with this prefix already exists in your brand')

  // Auto-assign the admin's brandId; Super Admin has no brand restriction
  const brandId = session.user.role === 'ADMIN' ? (session.user.brandId ?? null) : null

  const dept = await prisma.department.create({ data: { ...parsed.data, brandId } })
  audit('CREATE', 'Department', dept.id, session.user.id, { name: dept.name })

  return ok(dept, 201)
}
