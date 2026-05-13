import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getDashboardStats } from '@/lib/queue-engine'
import { ok } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const [stats, byDept] = await Promise.all([
    getDashboardStats(),
    prisma.department.findMany({
      where: { status: 'ACTIVE' },
      include: {
        _count: { select: { queues: true } },
        counters: {
          where: { status: 'ACTIVE' },
          select: { id: true, name: true },
        },
      },
    }),
  ])

  return ok({ stats, byDept })
}
