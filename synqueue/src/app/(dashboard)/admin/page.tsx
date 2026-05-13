import type { Metadata } from 'next'
import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import { getDashboardStats } from '@/lib/queue-engine'
import { DashboardStats } from '@/components/admin/DashboardStats'
import { QueueMonitor } from '@/components/admin/QueueMonitor'
import { AnalyticsCharts } from '@/components/admin/AnalyticsCharts'
import { todayLabel } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

async function getPageData() {
  const [stats, activeQueues, departments, counters] = await Promise.all([
    getDashboardStats(),
    prisma.queue.findMany({
      where:   { status: { in: ['WAITING', 'SERVING'] } },
      include: { department: true, counter: { include: { staff: true } } },
      orderBy: [{ isPriority: 'desc' }, { createdAt: 'asc' }],
      take:    50,
    }),
    prisma.department.findMany({
      where:   { status: 'ACTIVE' },
      include: { _count: { select: { queues: true } } },
    }),
    prisma.counter.findMany({
      where:   { isActive: true },
      include: { staff: true, department: true },
    }),
  ])
  return { stats, activeQueues, departments, counters }
}

export default async function AdminDashboardPage() {
  const { stats, activeQueues, departments, counters } = await getPageData()

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">{todayLabel()} — live system overview</p>
      </div>

      <Suspense fallback={<div className="skeleton h-32 rounded-xl" />}>
        <DashboardStats stats={stats} />
      </Suspense>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Suspense fallback={<div className="skeleton h-96 rounded-xl" />}>
            <QueueMonitor queues={activeQueues as any} />
          </Suspense>
        </div>

        {/* Counter status */}
        <div className="glass p-5">
          <h3 className="font-semibold text-white mb-4">Counter Status</h3>
          <div className="space-y-2">
            {counters.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <div className="text-sm font-medium text-white">{c.department.name} — {c.name}</div>
                  <div className="text-xs text-slate-400">{c.staff?.name ?? 'Unassigned'}</div>
                </div>
                <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
                  c.status === 'ACTIVE'   ? 'bg-green-500/15 text-green-400' :
                  c.status === 'BREAK'    ? 'bg-amber-500/15 text-amber-400' :
                                            'bg-slate-500/15 text-slate-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    c.status === 'ACTIVE' ? 'bg-green-400' :
                    c.status === 'BREAK'  ? 'bg-amber-400' : 'bg-slate-500'
                  }`} />
                  {c.status}
                </span>
              </div>
            ))}
            {counters.length === 0 && (
              <p className="text-sm text-slate-500 py-4 text-center">No counters configured</p>
            )}
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="skeleton h-80 rounded-xl" />}>
        <AnalyticsCharts />
      </Suspense>
    </div>
  )
}
