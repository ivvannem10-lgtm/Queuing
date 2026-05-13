'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import type { SessionUser } from '@/types'
import { ROLE_LABELS } from '@/lib/utils'
import Pusher from 'pusher-js'
import { SOCKET_EVENTS } from '@/types'

interface Props { user: SessionUser }

export function Header({ user }: Props) {
  const [stats, setStats]  = useState({ waiting: 0, serving: 0 })
  const [hasNew, setHasNew] = useState(false)

  useEffect(() => {
    async function loadStats() {
      const res  = await fetch('/api/analytics').catch(() => null)
      const json = await res?.json().catch(() => null)
      if (json?.success) {
        setStats({ waiting: json.data.stats.waiting, serving: json.data.stats.serving })
      }
    }
    loadStats()
    const interval = setInterval(loadStats, 15000)

    const pusher  = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
    const channel = pusher.subscribe('admin')
    channel.bind(SOCKET_EVENTS.QUEUE_CREATED, () => { setHasNew(true); loadStats() })
    channel.bind(SOCKET_EVENTS.QUEUE_UPDATED, loadStats)

    return () => { pusher.disconnect(); clearInterval(interval) }
  }, [])

  return (
    <header className="h-16 border-b border-white/5 bg-navy-mid/30 flex items-center justify-between px-6 flex-shrink-0">
      {/* Live stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs text-slate-400">
            <strong className="text-amber-400">{stats.waiting}</strong> waiting
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs text-slate-400">
            <strong className="text-green-400">{stats.serving}</strong> serving
          </span>
        </div>
      </div>

      {/* User info */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setHasNew(false)}
          className="relative text-slate-400 hover:text-white transition"
        >
          <Bell size={18} />
          {hasNew && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
          )}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand-light font-bold text-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-white leading-tight">{user.name}</div>
            <div className="text-xs text-slate-400">{ROLE_LABELS[user.role]}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
