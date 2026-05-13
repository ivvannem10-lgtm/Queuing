'use client'

import { motion } from 'framer-motion'
import { Clock, Users, CheckCircle2, SkipForward, Star, Monitor, TrendingUp, Zap } from 'lucide-react'
import { msToMinutes } from '@/lib/utils'

interface StatsData {
  totalToday:      number
  waiting:         number
  serving:         number
  completed:       number
  skipped:         number
  avgWaitMs:       number
  avgServingMs:    number
  priorityWaiting: number
  activeCounters:  number
}

interface Props { stats: StatsData }

const CARDS = (s: StatsData) => [
  {
    label:   'Total Today',
    value:   s.totalToday,
    icon:    Zap,
    color:   'text-brand-light',
    bg:      'bg-brand/10',
    border:  'border-brand/20',
  },
  {
    label:   'Waiting Now',
    value:   s.waiting,
    icon:    Users,
    color:   'text-amber-400',
    bg:      'bg-amber-500/10',
    border:  'border-amber-500/20',
  },
  {
    label:   'Serving Now',
    value:   s.serving,
    icon:    TrendingUp,
    color:   'text-green-400',
    bg:      'bg-green-500/10',
    border:  'border-green-500/20',
  },
  {
    label:   'Completed',
    value:   s.completed,
    icon:    CheckCircle2,
    color:   'text-slate-300',
    bg:      'bg-slate-500/10',
    border:  'border-slate-500/20',
  },
  {
    label:   'Avg Wait Time',
    value:   s.avgWaitMs ? msToMinutes(s.avgWaitMs) : '—',
    icon:    Clock,
    color:   'text-blue-400',
    bg:      'bg-blue-500/10',
    border:  'border-blue-500/20',
  },
  {
    label:   'Priority Waiting',
    value:   s.priorityWaiting,
    icon:    Star,
    color:   'text-purple-400',
    bg:      'bg-purple-500/10',
    border:  'border-purple-500/20',
  },
  {
    label:   'Active Counters',
    value:   s.activeCounters,
    icon:    Monitor,
    color:   'text-cyan-400',
    bg:      'bg-cyan-500/10',
    border:  'border-cyan-500/20',
  },
  {
    label:   'Skipped',
    value:   s.skipped,
    icon:    SkipForward,
    color:   'text-orange-400',
    bg:      'bg-orange-500/10',
    border:  'border-orange-500/20',
  },
]

export function DashboardStats({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {CARDS(stats).map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`rounded-xl border p-4 ${card.bg} ${card.border}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-400">{card.label}</span>
            <card.icon size={15} className={card.color} />
          </div>
          <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
        </motion.div>
      ))}
    </div>
  )
}
