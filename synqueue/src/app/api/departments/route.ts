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
  const status    = req.nextUrl.searchParams.get('status')
  const brandSlug = req.nextUrl.searchParams.get('brand')

  const where: any = {}
  if (status) where.status = status

  // Filter by brand slug if provided (for multi-brand queue page)
  if (brandSlug) {
    const brand = await prisma.brand.findUnique({ where: { slug: brandSlug } })
    where.brandId = brand?.id ?? '__none__'
  }

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

  const exists = await prisma.department.findFirst({ where: { prefix: parsed.data.prefix } })
  if (exists) return err('A department with this prefix already exists')

  // Auto-assign brand from admin's session
  const brandId = session.user.role === 'ADMIN' ? (session.user.brandId ?? null) : null

  const dept = await prisma.department.create({ data: { ...parsed.data, brandId } })
  audit('CREATE', 'Department', dept.id, session.user.id, { name: dept.name })

  return ok(dept, 201)
}
