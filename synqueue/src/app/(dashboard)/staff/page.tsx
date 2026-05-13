'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { io as SocketIO, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'
import { signOut } from 'next-auth/react'
import {
  PhoneCall, SkipForward, CheckCircle2, XCircle,
  ArrowRightLeft, RotateCcw, LogOut, Monitor, Clock,
  Users, Star, ChevronDown, Loader2,
} from 'lucide-react'
import { SOCKET_EVENTS, PRIORITY_LABELS, PRIORITY_COLORS, STATUS_COLORS } from '@/types'
import type { QueueWithRelations, Department } from '@/types'
import type { Counter } from '@prisma/client'
import { msToMinSec, formatTime } from '@/lib/utils'

interface CounterWithDept extends Counter { department: Department }

export default function StaffPage() {
  const { data: session } = useSession()
  const userId = session?.user?.id

  const [counters,    setCounters]    = useState<CounterWithDept[]>([])
  const [myCounter,   setMyCounter]   = useState<CounterWithDept | null>(null)
  const [waitingQ,    setWaitingQ]    = useState<QueueWithRelations[]>([])
  const [servingQ,    setServingQ]    = useState<QueueWithRelations | null>(null)
  const [historyQ,    setHistoryQ]    = useState<QueueWithRelations[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showTransfer,  setShowTransfer]  = useState(false)
  const [depts,         setDepts]         = useState<Department[]>([])
  const [transferDept,  setTransferDept]  = useState('')
  const [transferReason,setTransferReason] = useState('')
  const [stats,         setStats]         = useState({ served: 0, skipped: 0, avgMs: 0 })
  const socketRef = useRef<Socket | null>(null)
  const audioCtx  = useRef<AudioContext | null>(null)

  function playChime() {
    try {
      const ctx  = audioCtx.current ?? new (window.AudioContext || (window as any).webkitAudioContext)()
      audioCtx.current = ctx
      const osc  = ctx.createOscillator(); const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'triangle'; osc.frequency.value = 660
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4)
    } catch {}
  }

  async function loadCounters() {
    const res  = await fetch('/api/counters?mine=true')
    const json = await res.json()
    setCounters(json.data ?? [])
  }

  async function loadQueue(counterId: string, deptId: string) {
    const [wRes, sRes, hRes] = await Promise.all([
      fetch(`/api/queues?departmentId=${deptId}&status=WAITING&limit=30`),
      fetch(`/api/queues?counterId=${counterId}&status=SERVING&limit=1`),
      fetch(`/api/queues?counterId=${counterId}&status=COMPLETED,SKIPPED&limit=10`),
    ])
    const [wj, sj, hj] = await Promise.all([wRes.json(), sRes.json(), hRes.json()])
    setWaitingQ(wj.data ?? [])
    setServingQ(sj.data?.[0] ?? null)
    setHistoryQ(hj.data ?? [])
  }

  async function loadStats() {
    if (!userId) return
    const res  = await fetch(`/api/analytics/frontliner?userId=${userId}`)
    const json = await res.json()
    setStats(json.data ?? { served: 0, skipped: 0, avgMs: 0 })
  }

  async function selectCounter(counter: CounterWithDept) {
    setMyCounter(counter)
    // Activate counter
    await fetch(`/api/counters/${counter.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ status: 'ACTIVE', staffId: userId }),
    })
    await loadQueue(counter.id, counter.departmentId)
    loadStats()

    // Connect socket
    const socket = SocketIO({ path: '/api/socket', transports: ['websocket', 'polling'] })
    socket.on('connect', () => {
      socket.emit('join:department', counter.departmentId)
      socket.emit('join:counter', counter.id)
    })
    socket.on(SOCKET_EVENTS.QUEUE_CREATED,  () => loadQueue(counter.id, counter.departmentId))
    socket.on(SOCKET_EVENTS.QUEUE_UPDATED,  () => loadQueue(counter.id, counter.departmentId))
    socket.on(SOCKET_EVENTS.QUEUE_CALLED,   () => { loadQueue(counter.id, counter.departmentId); playChime() })
    socketRef.current = socket
  }

  useEffect(() => {
    loadCounters()
    fetch('/api/departments?status=ACTIVE').then((r) => r.json()).then((j) => setDepts(j.data ?? []))
    return () => { socketRef.current?.disconnect() }
  }, [])

  async function action(type: string, extra?: Record<string, unknown>) {
    if (!myCounter) return
    setActionLoading(type)

    let url = ''; let body: Record<string, unknown> = {}

    if (type === 'CALL_NEXT') {
      url  = '/api/queues/call-next'
      body = { departmentId: myCounter.departmentId, counterId: myCounter.id }
    } else if (servingQ) {
      url  = `/api/queues/${servingQ.id}/${type.toLowerCase().replace('_', '-')}`
      body = extra ?? {}
    }

    if (!url) { setActionLoading(null); return }

    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setActionLoading(null)
    loadQueue(myCounter.id, myCounter.departmentId)
    loadStats()
    if (type === 'TRANSFER') setShowTransfer(false)
  }

  async function handleTransfer() {
    if (!myCounter || !servingQ || !transferDept) return
    await fetch(`/api/queues/${servingQ.id}/transfer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ toDepartmentId: transferDept, reason: transferReason }),
    })
    setShowTransfer(false)
    loadQueue(myCounter.id, myCounter.departmentId)
  }

  async function handleLogout() {
    if (myCounter) {
      await fetch(`/api/counters/${myCounter.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ status: 'INACTIVE' }),
      })
    }
    signOut({ callbackUrl: '/login' })
  }

  // ── Counter selection screen ──────────────────────────────
  if (!myCounter) {
    return (
      <div className="min-h-screen bg-navy-deep flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center text-white font-black text-xl mx-auto mb-4">Q</div>
            <h1 className="text-2xl font-bold text-white">Select Your Counter</h1>
            <p className="text-slate-400 text-sm mt-1">Welcome, {session?.user?.name}</p>
          </div>
          <div className="space-y-3">
            {counters.length === 0 && <p className="text-center text-slate-400">No counters assigned to you. Contact your admin.</p>}
            {counters.map((c) => (
              <motion.button
                key={c.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => selectCounter(c)}
                className="w-full glass p-4 text-left hover:border-brand/50 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Monitor size={18} className="text-brand-light" />
                  <div>
                    <div className="font-semibold text-white">{c.name}</div>
                    <div className="text-sm text-slate-400">{c.department.name}</div>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${c.status === 'ACTIVE' ? 'bg-green-500/15 text-green-400' : 'bg-slate-500/15 text-slate-400'}`}>
                  {c.status}
                </span>
              </motion.button>
            ))}
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mt-6 mx-auto transition">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
    )
  }

  // ── Main staff console ────────────────────────────────────
  return (
    <div className="min-h-screen bg-navy-deep flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 bg-navy-mid/50 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-black text-sm">Q</div>
          <div>
            <div className="font-semibold text-white text-sm">{myCounter.department.name} — {myCounter.name}</div>
            <div className="text-xs text-slate-400">{session?.user?.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />Online</div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-white transition"><LogOut size={16} /></button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0 overflow-hidden">

        {/* LEFT: Action Panel */}
        <div className="lg:col-span-2 p-5 space-y-5 overflow-y-auto scrollbar-thin">

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Served Today', val: stats.served, icon: CheckCircle2, color: 'text-green-400' },
              { label: 'Skipped',      val: stats.skipped, icon: SkipForward,  color: 'text-amber-400' },
              { label: 'Avg Serving',  val: stats.avgMs ? msToMinSec(stats.avgMs) : '—', icon: Clock, color: 'text-blue-400' },
            ].map(({ label, val, icon: Icon, color }) => (
              <div key={label} className="glass p-3 text-center">
                <Icon size={16} className={`${color} mx-auto mb-1`} />
                <div className="text-xl font-bold text-white">{val}</div>
                <div className="text-xs text-slate-400">{label}</div>
              </div>
            ))}
          </div>

          {/* Currently Serving */}
          <div className={`rounded-2xl border-2 p-6 transition-all duration-500 ${servingQ ? 'border-green-500/50 bg-green-500/5' : 'border-white/8 bg-navy-card'}`}>
            <div className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-3">Currently Serving</div>
            <AnimatePresence mode="wait">
              {servingQ ? (
                <motion.div
                  key={servingQ.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="flex items-center justify-between"
                >
                  <div>
                    <div className="text-5xl sm:text-7xl font-black text-white tracking-tight">{servingQ.queueNumber}</div>
                    {servingQ.clientName && <div className="text-slate-300 mt-1">{servingQ.clientName}</div>}
                    {servingQ.isPriority && (
                      <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border mt-2 ${PRIORITY_COLORS[servingQ.priorityType]}`}>
                        <Star size={10} /> {PRIORITY_LABELS[servingQ.priorityType]}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>Called at</div>
                    <div className="font-mono text-slate-300">{formatTime(servingQ.calledAt!)}</div>
                    {servingQ.calledAt && (
                      <div className="mt-1 text-xs font-mono text-amber-400">
                        {msToMinSec(Date.now() - new Date(servingQ.calledAt).getTime())}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
                  <div className="text-4xl font-black text-slate-700">—</div>
                  <div className="text-slate-500 text-sm mt-1">No active queue · Click "Call Next"</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              {
                label: 'Call Next',   icon: PhoneCall,      type: 'CALL_NEXT',
                cls:   'bg-brand hover:bg-brand-dark text-white',
                disabled: waitingQ.length === 0,
              },
              {
                label: 'Recall',      icon: RotateCcw,      type: 'recall',
                cls:   'bg-navy-card border border-brand/30 text-brand-light hover:border-brand',
                disabled: !servingQ,
              },
              {
                label: 'Mark Done',   icon: CheckCircle2,   type: 'complete',
                cls:   'bg-green-500 hover:bg-green-600 text-white',
                disabled: !servingQ,
              },
              {
                label: 'Skip',        icon: SkipForward,    type: 'skip',
                cls:   'bg-amber-500 hover:bg-amber-600 text-white',
                disabled: !servingQ,
              },
              {
                label: 'Transfer',    icon: ArrowRightLeft, type: 'TRANSFER_OPEN',
                cls:   'bg-purple-600 hover:bg-purple-700 text-white',
                disabled: !servingQ,
              },
              {
                label: 'Cancel',      icon: XCircle,        type: 'cancel',
                cls:   'bg-red-600/80 hover:bg-red-600 text-white',
                disabled: !servingQ,
              },
            ].map(({ label, icon: Icon, type, cls, disabled }) => (
              <motion.button
                key={type}
                whileHover={{ scale: disabled ? 1 : 1.02 }}
                whileTap={{ scale: disabled ? 1 : 0.97 }}
                onClick={() => type === 'TRANSFER_OPEN' ? setShowTransfer(true) : action(type)}
                disabled={disabled || !!actionLoading}
                className={`flex flex-col items-center justify-center gap-2 py-5 rounded-2xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}
              >
                {actionLoading === type ? <Loader2 size={22} className="animate-spin" /> : <Icon size={22} />}
                {label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* RIGHT: Queue list */}
        <div className="border-l border-white/5 flex flex-col">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Users size={15} className="text-brand-light" />
              Waiting Queue
            </div>
            <span className="text-xs font-bold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full">
              {waitingQ.length} waiting
            </span>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {waitingQ.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                <CheckCircle2 size={32} className="mb-2 opacity-30" />
                Queue is empty
              </div>
            ) : (
              <div className="divide-y divide-white/4">
                {waitingQ.map((q, i) => (
                  <div key={q.id} className={`px-4 py-3 flex items-center gap-3 hover:bg-white/2 transition ${i === 0 ? 'bg-brand/5' : ''}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-brand text-white' : 'bg-navy-mid text-slate-400'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm">{q.queueNumber}</div>
                      {q.clientName && <div className="text-xs text-slate-400 truncate">{q.clientName}</div>}
                    </div>
                    {q.isPriority && (
                      <Star size={12} className="text-yellow-400 flex-shrink-0" />
                    )}
                    <div className="text-xs text-slate-500 flex-shrink-0">{formatTime(q.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History */}
          {historyQ.length > 0 && (
            <div className="border-t border-white/5">
              <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Recent</div>
              {historyQ.slice(0, 5).map((q) => (
                <div key={q.id} className="px-4 py-2 flex items-center gap-3 opacity-50">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${STATUS_COLORS[q.status]}`}>{q.status}</span>
                  <span className="text-xs font-mono text-slate-400">{q.queueNumber}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transfer modal */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-navy-card border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-bold text-white text-lg mb-1">Transfer Queue</h2>
            <p className="text-slate-400 text-sm mb-5">Redirect <strong className="text-white">{servingQ?.queueNumber}</strong> to another department</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Destination Department</label>
                <select value={transferDept} onChange={(e) => setTransferDept(e.target.value)}
                  className="w-full bg-navy-mid border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand/60">
                  <option value="">Select department…</option>
                  {depts.filter((d) => d.id !== myCounter.departmentId).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Reason <span className="text-slate-500">(optional)</span></label>
                <input value={transferReason} onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Needs cashier processing"
                  className="w-full bg-navy-mid border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/60" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowTransfer(false)} className="flex-1 bg-navy-mid border border-white/8 text-white rounded-lg py-2.5 text-sm">Cancel</button>
              <button onClick={handleTransfer} disabled={!transferDept}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition">
                <ArrowRightLeft size={14} /> Transfer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
