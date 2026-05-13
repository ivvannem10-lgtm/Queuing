'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star } from 'lucide-react'
import type { QueueWithRelations } from '@/types'
import { STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/types'
import { formatTime } from '@/lib/utils'

interface Props { queues: QueueWithRelations[] }

export function QueueMonitor({ queues }: Props) {
  const [filter, setFilter] = useState<'ALL' | 'WAITING' | 'SERVING'>('ALL')

  const filtered = filter === 'ALL' ? queues : queues.filter((q) => q.status === filter)

  return (
    <div className="glass overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="font-semibold text-white">Live Queue Monitor</h3>
        <div className="flex gap-1 bg-navy-mid rounded-lg p-1">
          {(['ALL', 'WAITING', 'SERVING'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-medium px-3 py-1 rounded-md transition ${filter === f ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto max-h-96 scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
            No queues in this filter
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((q) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={`flex items-center gap-4 px-5 py-3 border-b border-white/4 hover:bg-white/2 transition ${q.status === 'SERVING' ? 'bg-green-500/5' : ''}`}
              >
                <div className="flex-shrink-0">
                  <div className={`font-bold font-mono text-base ${q.status === 'SERVING' ? 'text-green-400' : 'text-white'}`}>
                    {q.queueNumber}
                  </div>
                  {q.isPriority && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star size={9} className="text-yellow-400" />
                      <span className="text-[9px] text-yellow-400 font-bold">{PRIORITY_LABELS[q.priorityType as import('@/types').PriorityType]}</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-300 truncate">{q.clientName ?? <span className="text-slate-600">No name</span>}</div>
                  <div className="text-xs text-slate-500">{q.department.name}</div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <div className="text-xs text-slate-500">{q.counter?.name ?? '—'}</div>
                  <div className="text-xs text-slate-500">{formatTime(q.createdAt)}</div>
                </div>

                <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[q.status as import('@/types').QueueStatus]}`}>
                  {q.status}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
