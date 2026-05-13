import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ok, err, unauthorized, audit } from '@/lib/utils'
import { z } from 'zod'

const CreateSchema = z.object({
  name:         z.string().min(1),
  number:       z.number().int().min(1),
  departmentId: z.string(),
  staffId:      z.string().optional().nullable(),
  status:       z.enum(['ACTIVE', 'INACTIVE', 'BREAK']).default('INACTIVE'),
})

export async function GET(req: NextRequest) {
  const session    = await getServerSession(authOptions)
  const mineOnly   = req.nextUrl.searchParams.get('mine') === 'true'
  const deptId     = req.nextUrl.searchParams.get('departmentId')

  const where: any = {}
  if (deptId)   where.departmentId = deptId
  if (mineOnly && session) where.staffId = session.user.id

  const counters = await prisma.counter.findMany({
    where: { ...where, isActive: true },
    include: {
      department: true,
      staff:      true,
      queues:     { where: { status: { in: ['WAITING', 'SERVING'] } }, take: 1 },
    },
    orderBy: [{ department: { sortOrder: 'asc' } }, { number: 'asc' }],
  })

  return ok(counters)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) return unauthorized()

  const body   = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.message)

  const counter = await prisma.counter.create({
    data: parsed.data,
    include: { department: true, staff: true },
  })

  audit('CREATE', 'Counter', counter.id, session.user.id, { name: counter.name })
  return ok(counter, 201)
}
