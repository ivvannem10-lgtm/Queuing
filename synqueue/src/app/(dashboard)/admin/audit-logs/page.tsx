import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { formatDateTime } from '@/lib/utils'
import { Shield } from 'lucide-react'

export const metadata: Metadata = { title: 'Audit Logs' }
export const dynamic = 'force-dynamic'

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: { page?: string; action?: string }
}) {
  const page  = parseInt(searchParams.page ?? '1')
  const take  = 50
  const skip  = (page - 1) * take

  const where = searchParams.action ? { action: { contains: searchParams.action } } : {}

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { timestamp: 'desc' },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ])

  const pages = Math.ceil(total / take)

  const ACTION_COLORS: Record<string, string> = {
    SIGN_IN:     'text-green-400',
    SIGN_OUT:    'text-slate-400',
    CREATE:      'text-blue-400',
    UPDATE:      'text-amber-400',
    DELETE:      'text-red-400',
    TRANSFER:    'text-purple-400',
    CALL:        'text-brand-light',
    COMPLETE:    'text-green-400',
    SKIP:        'text-orange-400',
    CANCEL:      'text-red-400',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Shield size={20} className="text-brand-light" />
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-slate-400 text-sm">{total.toLocaleString()} total entries</p>
        </div>
      </div>

      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 text-xs uppercase tracking-wider">
                {['Time', 'User', 'Action', 'Entity', 'Details'].map((h) => (
                  <th key={h} className="text-left px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-white/4 hover:bg-white/2 transition">
                  <td className="px-5 py-3 text-slate-400 whitespace-nowrap font-mono text-xs">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="px-5 py-3">
                    {log.user ? (
                      <div>
                        <div className="text-white text-xs font-medium">{log.user.name}</div>
                        <div className="text-slate-500 text-xs">{log.user.email}</div>
                      </div>
                    ) : <span className="text-slate-500">System</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`font-bold text-xs font-mono ${ACTION_COLORS[log.action] ?? 'text-slate-300'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-300 text-xs">
                    <span className="bg-navy-mid px-2 py-0.5 rounded">{log.entity}</span>
                    {log.entityId && <span className="text-slate-600 ml-1 font-mono">{log.entityId.slice(0, 8)}…</span>}
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs font-mono max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details).slice(0, 80) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
            <span className="text-xs text-slate-400">Page {page} of {pages}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={`?page=${page - 1}`} className="text-xs bg-navy-mid border border-white/8 text-white px-3 py-1.5 rounded hover:bg-navy-light transition">← Prev</a>
              )}
              {page < pages && (
                <a href={`?page=${page + 1}`} className="text-xs bg-navy-mid border border-white/8 text-white px-3 py-1.5 rounded hover:bg-navy-light transition">Next →</a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
