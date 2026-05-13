import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ok, unauthorized } from '@/lib/utils'

const PAGE_SIZE = 30

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) return unauthorized()

  const { searchParams } = req.nextUrl
  const search       = searchParams.get('search') ?? ''
  const departmentId = searchParams.get('departmentId') ?? ''
  const status       = searchParams.get('status') ?? ''
  const dateFrom     = searchParams.get('dateFrom') ?? ''
  const dateTo       = searchParams.get('dateTo') ?? ''
  const page         = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const skip         = (page - 1) * PAGE_SIZE

  const where: any = {}

  // Brand scoping for admins
  if (session.user.role === 'ADMIN' && session.user.brandId) {
    where.department = { brandId: session.user.brandId }
  }

  if (departmentId) where.departmentId = departmentId
  if (status)       where.status       = status

  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      where.createdAt.lte = end
    }
  }

  if (search) {
    where.OR = [
      { queueNumber: { contains: search, mode: 'insensitive' } },
      { clientName:  { contains: search, mode: 'insensitive' } },
    ]
  }

  const [records, total] = await Promise.all([
    prisma.queue.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, prefix: true } },
        counter:    { select: { id: true, name: true, staff: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.queue.count({ where }),
  ])

  return ok({ records, total, page, pages: Math.ceil(total / PAGE_SIZE), pageSize: PAGE_SIZE })
}
