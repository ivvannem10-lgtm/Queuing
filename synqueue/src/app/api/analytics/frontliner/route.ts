import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok } from '@/lib/utils'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  const date   = format(new Date(), 'yyyy-MM-dd')

  if (!userId) {
    // All frontliner stats for today (leaderboard)
    const stats = await prisma.frontlinerStatistic.findMany({
      where:   { date },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { totalServed: 'desc' },
    })
    return ok(stats)
  }

  const stat = await prisma.frontlinerStatistic.findUnique({
    where: { userId_date: { userId, date } },
  })

  return ok(stat ?? { served: 0, skipped: 0, avgMs: 0 })
}
