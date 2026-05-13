import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok } from '@/lib/utils'
import { format, eachDayOfInterval, parseISO } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const from         = searchParams.get('from') ?? format(new Date(Date.now() - 7 * 864e5), 'yyyy-MM-dd')
  const to           = searchParams.get('to')   ?? format(new Date(), 'yyyy-MM-dd')
  const departmentId = searchParams.get('departmentId')

  const where: any = {
    createdAt: { gte: new Date(`${from}T00:00:00`), lte: new Date(`${to}T23:59:59`) },
  }
  if (departmentId) where.departmentId = departmentId

  const queues = await prisma.queue.findMany({ where, orderBy: { createdAt: 'asc' } })

  // ── Summary ────────────────────────────────────────────
  const completed   = queues.filter((q) => q.status === 'COMPLETED')
  const skipped     = queues.filter((q) => q.status === 'SKIPPED')
  const transferred = queues.filter((q) => q.status === 'TRANSFERRED')
  const priority    = queues.filter((q) => q.isPriority)
  const withWait    = completed.filter((q) => q.waitingDurationMs)
  const avgWaitMs   = withWait.length
    ? Math.round(withWait.reduce((s, q) => s + (q.waitingDurationMs ?? 0), 0) / withWait.length)
    : 0

  const summary = {
    total:       queues.length,
    completed:   completed.length,
    skipped:     skipped.length,
    transferred: transferred.length,
    priority:    priority.length,
    avgWaitMs,
  }

  // ── Hourly distribution (0-23) ─────────────────────────
  const hourly = Array.from({ length: 24 }, (_, h) => ({
    hour:  h,
    count: queues.filter((q) => new Date(q.createdAt).getHours() === h).length,
  }))

  // ── Daily breakdown ────────────────────────────────────
  const days  = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) })
  const daily = days.map((day) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    const dayQs   = queues.filter((q) => format(new Date(q.createdAt), 'yyyy-MM-dd') === dateStr)
    const dayComp = dayQs.filter((q) => q.status === 'COMPLETED')
    const dayWait = dayComp.filter((q) => q.waitingDurationMs)
    const avgWait = dayWait.length
      ? Math.round(dayWait.reduce((s, q) => s + (q.waitingDurationMs ?? 0), 0) / dayWait.length)
      : 0

    return {
      date:        dateStr,
      total:       dayQs.length,
      completed:   dayComp.length,
      skipped:     dayQs.filter((q) => q.status === 'SKIPPED').length,
      transferred: dayQs.filter((q) => q.status === 'TRANSFERRED').length,
      priority:    dayQs.filter((q) => q.isPriority).length,
      avgWaitMs:   avgWait,
    }
  })

  return ok({ summary, hourly, daily })
}
