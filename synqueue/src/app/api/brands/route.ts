import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ok, err, unauthorized, audit } from '@/lib/utils'
import { z } from 'zod'

const CreateSchema = z.object({
  name:        z.string().min(1).max(100),
  slug:        z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  logoUrl:     z.string().url().optional().or(z.literal('')),
  accentColor: z.string().optional(),
  userLimit:   z.number().int().min(1).max(500).default(15),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) return unauthorized()

  // Admins can only see their own brand; super admins see all
  const where = session.user.role === 'SUPER_ADMIN'
    ? {}
    : { id: session.user.brandId ?? '__none__' }

  const brands = await prisma.brand.findMany({
    where,
    include: {
      _count: { select: { users: true, departments: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return ok(brands)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPER_ADMIN') return unauthorized()

  const body   = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.message)

  const exists = await prisma.brand.findUnique({ where: { slug: parsed.data.slug } })
  if (exists) return err('A brand with this slug already exists')

  const brand = await prisma.brand.create({
    data: {
      name:        parsed.data.name,
      slug:        parsed.data.slug,
      logoUrl:     parsed.data.logoUrl || null,
      accentColor: parsed.data.accentColor || '#2563eb',
      userLimit:   parsed.data.userLimit,
    },
  })

  audit('CREATE', 'Brand', brand.id, session.user.id, { name: brand.name, slug: brand.slug })
  return ok(brand, 201)
}
