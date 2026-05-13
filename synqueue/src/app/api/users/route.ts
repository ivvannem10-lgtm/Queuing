import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { ok, err, unauthorized, audit } from '@/lib/utils'
import { z } from 'zod'

const CreateSchema = z.object({
  name:          z.string().min(1),
  email:         z.string().email(),
  password:      z.string().min(6),
  role:          z.enum(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CLIENT']).default('STAFF'),
  departmentIds: z.array(z.string()).default([]),
  isActive:      z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) return unauthorized()

  const roleFilter = req.nextUrl.searchParams.get('role')
  const where: any = {}
  if (roleFilter) where.role = roleFilter

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true, name: true, email: true, role: true,
      isActive: true, createdAt: true,
      departments: { include: { department: { select: { id: true, name: true, prefix: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return ok(users)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) return unauthorized()

  const body   = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.message)

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (exists) return err('A user with this email already exists')

  const hashed = await bcrypt.hash(parsed.data.password, 12)

  const user = await prisma.user.create({
    data: {
      name:     parsed.data.name,
      email:    parsed.data.email.toLowerCase(),
      password: hashed,
      role:     parsed.data.role,
      isActive: parsed.data.isActive,
      departments: {
        create: parsed.data.departmentIds.map((id) => ({ departmentId: id })),
      },
    },
    include: { departments: { include: { department: true } } },
  })

  audit('CREATE', 'User', user.id, session.user.id, { email: user.email, role: user.role })
  return ok({ ...user, password: undefined }, 201)
}
