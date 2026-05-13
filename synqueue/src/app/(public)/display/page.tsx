'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Maximize2, Volume2, VolumeX, Clock, Mic } from 'lucide-react'
import { io as SocketIO } from 'socket.io-client'
import { SOCKET_EVENTS } from '@/types'
import type { Department, QueueWithRelations } from '@/types'

interface DeptDisplay {
  department: Department
  serving:    QueueWithRelations | null
  nextUp:     QueueWithRelations | null
  waiting:    number
}

interface CallBanner {
  queueNumber: string
  serviceName: string
  counterName: string
}

// ── Format queue number so TTS reads it clearly ───────────────────────────────
// "REG-001"  → "R E G, zero zero one"
// "CASH-P002" → "C A S H, priority zero zero two"
function formatForSpeech(queueNumber: string): string {
  const dashIdx = queueNumber.indexOf('-')
  if (dashIdx === -1) return queueNumber

  const prefix = queueNumber.slice(0, dashIdx)
  let   seq    = queueNumber.slice(dashIdx + 1)

  // Spell out prefix letters with spaces
  const spokenPrefix = prefix.split('').join(' ')

  // Handle priority prefix
  const isPriority = seq.startsWith('P')
  if (isPriority) seq = seq.slice(1)

  // Spell out each digit so TTS says "zero zero one" not "one"
  const spokenSeq = seq.split('').map(c => {
    const map: Record<string, string> = {
      '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
      '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
    }
    return map[c] ?? c
  }).join(' ')

  return isPriority
    ? `${spokenPrefix}, priority, ${spokenSeq}`
    : `${spokenPrefix}, ${spokenSeq}`
}

export default function DisplayPage() {
  const [deptDisplays, setDeptDisplays] = useState<DeptDisplay[]>([])
  const [time,         setTime]         = useState(new Date())
  const [soundOn,      setSoundOn]      = useState(true)
  const [callBanner,   setCallBanner]   = useState<CallBanner | null>(null)
  const [loading,      setLoading]      = useState(true)
  const synthReady     = useRef(false)
  const pendingUtter   = useRef<SpeechSynthesisUtterance | null>(null)

  // ── Pick the best available voice ──────────────────────────────────────────
  function pickVoice(): SpeechSynthesisVoice | null {
    const voices    = window.speechSynthesis.getVoices()
    const preferred = [
      'Google US English',
      'Microsoft Mark',
      'Microsoft David',
      'Alex',
      'Samantha',
      'Daniel',
      'Karen',
    ]
    for (const name of preferred) {
      const v = voices.find(v => v.name === name)
      if (v) return v
    }
    return voices.find(v => v.lang.startsWith('en')) ?? voices[0] ?? null
  }

  // ── Speak announcement ──────────────────────────────────────────────────────
  const announce = useCallback((queueNumber: string, serviceName: string, counterName: string) => {
    if (!soundOn || typeof window === 'undefined' || !('speechSynthesis' in window)) return

    // Cancel any currently running speech
    window.speechSynthesis.cancel()

    const spokenNum  = formatForSpeech(queueNumber)
    const text = [
      'Attention.',
      `Now serving, ${spokenNum}.`,
      `${serviceName}.`,
      `${counterName}.`,
      'Please proceed.',
    ].join('  ')

    const utter      = new SpeechSynthesisUtterance(text)
    utter.rate       = 0.88   // slightly slower = clearer
    utter.pitch      = 1.05
    utter.volume     = 1
    const voice      = pickVoice()
    if (voice) utter.voice = voice

    // Chrome bug workaround: speech cuts off if tab loses focus briefly
    utter.onend = () => { pendingUtter.current = null }
    pendingUtter.current = utter

    // Small delay so the banner animation plays first
    setTimeout(() => {
      if (pendingUtter.current === utter) window.speechSynthesis.speak(utter)
    }, 400)
  }, [soundOn])

  // ── Load display data ───────────────────────────────────────────────────────
  async function loadDisplay() {
    const res  = await fetch('/api/display').catch(() => null)
    const json = await res?.json().catch(() => null)
    if (json?.success) setDeptDisplays(json.data)
    setLoading(false)
  }

  // ── Socket + clock ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadDisplay()
    const tick = setInterval(() => setTime(new Date()), 1000)

    // Pre-load voices (Chrome needs a trigger)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => { synthReady.current = true }
    }

    const socket = SocketIO({ path: '/api/socket', transports: ['websocket', 'polling'] })
    socket.on('connect', () => socket.emit('join:display'))

    socket.on(SOCKET_EVENTS.QUEUE_CALLED, (data: any) => {
      const q           = data.queue
      const counterName = data.counterName ?? 'the counter'
      const serviceName = q?.department?.name ?? 'the service'
      const queueNumber = q?.queueNumber ?? ''

      setCallBanner({ queueNumber, serviceName, counterName })
      announce(queueNumber, serviceName, counterName)
      setTimeout(() => setCallBanner(null), 6000)
      loadDisplay()
    })

    socket.on(SOCKET_EVENTS.QUEUE_UPDATED,   loadDisplay)
    socket.on(SOCKET_EVENTS.DISPLAY_REFRESH, loadDisplay)

    return () => {
      socket.disconnect()
      clearInterval(tick)
      window.speechSynthesis?.cancel()
    }
  }, [announce])

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {})
    else document.exitFullscreen().catch(() => {})
  }

  function toggleSound() {
    if (soundOn) window.speechSynthesis?.cancel()
    setSoundOn(v => !v)
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-navy-deep flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-brand border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading live display…</p>
        </div>
      </div>
    )
  }

  // ── Main display ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-navy-deep flex flex-col select-none">

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-navy-mid/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white font-black">Q</div>
          <div>
            <div className="font-bold text-white text-lg leading-tight">SynQueue</div>
            <div className="text-xs text-slate-400">Live Queue Display</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Clock size={14} />
            <span className="font-mono text-sm tabular-nums">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Voice toggle */}
          <button
            onClick={toggleSound}
            title={soundOn ? 'Mute voice announcements' : 'Enable voice announcements'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
              soundOn
                ? 'bg-brand/15 border-brand/30 text-brand-light'
                : 'bg-navy-card border-white/8 text-slate-400 hover:text-white'
            }`}
          >
            {soundOn
              ? <><Mic size={13} className="text-brand-light" /> Voice On</>
              : <><VolumeX size={13} /> Voice Off</>
            }
          </button>

          <button onClick={toggleFullscreen} className="text-slate-400 hover:text-white transition p-2">
            <Maximize2 size={18} />
          </button>
        </div>
      </header>

      {/* ── Call announcement banner ── */}
      <AnimatePresence>
        {callBanner && (
          <motion.div
            key={callBanner.queueNumber + callBanner.counterName}
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0,   opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 28 } }}
            exit={{   y: -80, opacity: 0, transition: { duration: 0.3 } }}
            className="relative overflow-hidden bg-gradient-to-r from-brand via-blue-500 to-brand-light shadow-2xl shadow-brand/30"
          >
            {/* Animated shimmer */}
            <div className="absolute inset-0 bg-shimmer bg-[length:200%_100%] animate-shimmer opacity-30" />

            <div className="relative flex items-center justify-center gap-6 px-6 py-4 flex-wrap text-white text-center">
              {/* Bell pulse */}
              <motion.span
                animate={{ rotate: [0, -20, 20, -15, 15, 0] }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-2xl flex-shrink-0"
              >
                🔔
              </motion.span>

              <div className="flex items-center gap-4 flex-wrap justify-center">
                <div className="text-sm font-medium opacity-80">NOW SERVING</div>

                {/* Queue number — large */}
                <div className="text-3xl sm:text-4xl font-black tracking-tight">
                  {callBanner.queueNumber}
                </div>

                <div className="hidden sm:block w-px h-8 bg-white/30" />

                {/* Service + Counter */}
                <div className="text-left">
                  <div className="font-bold text-base sm:text-lg leading-tight">
                    {callBanner.serviceName}
                  </div>
                  <div className="text-sm opacity-80 font-medium">
                    {callBanner.counterName}
                  </div>
                </div>
              </div>

              <span className="text-2xl flex-shrink-0">🚶</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NOW SERVING cards ── */}
      <div className="px-6 pt-6 pb-2">
        <div className="text-xs font-bold tracking-[0.3em] text-brand-light uppercase mb-4">Now Serving</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {deptDisplays.map(({ department, serving }) => {
            const isJustCalled = callBanner?.serviceName === department.name
            return (
              <motion.div
                key={department.id}
                layout
                animate={isJustCalled ? { scale: [1, 1.04, 1] } : {}}
                transition={{ duration: 0.4 }}
                className={`rounded-2xl border p-4 text-center transition-all duration-500 ${
                  serving
                    ? 'bg-brand/10 border-brand/40 shadow-lg shadow-brand/10'
                    : 'bg-navy-card border-white/5'
                }`}
              >
                <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2 truncate">
                  {department.name}
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={serving?.queueNumber ?? 'idle'}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{   opacity: 0, scale: 0.8 }}
                    className={`font-black tabular-nums leading-none mb-2 ${
                      serving ? 'text-white text-4xl sm:text-5xl' : 'text-slate-600 text-3xl'
                    }`}
                  >
                    {serving?.queueNumber ?? '—'}
                  </motion.div>
                </AnimatePresence>
                {serving?.isPriority && (
                  <div className="text-[9px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full inline-block mb-1">
                    ★ PRIORITY
                  </div>
                )}
                {serving?.counter && (
                  <div className="text-[10px] text-brand-light font-medium truncate">
                    {serving.counter.name}
                  </div>
                )}
                <div className={`text-[10px] font-medium mt-0.5 ${serving ? 'text-green-400' : 'text-slate-600'}`}>
                  {serving ? '● Serving' : 'Idle'}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Queue status table ── */}
      <div className="flex-1 px-6 pb-6 mt-6">
        <div className="text-xs font-bold tracking-[0.3em] text-slate-400 uppercase mb-4">Queue Status</div>
        <div className="bg-navy-card border border-white/5 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-6 py-3 border-b border-white/5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <div>Department</div>
            <div className="text-center">Waiting</div>
            <div className="text-center">Next Up</div>
            <div className="text-right">Queue Load</div>
          </div>

          {deptDisplays.map(({ department, waiting, nextUp }, idx) => (
            <div
              key={department.id}
              className={`grid grid-cols-4 gap-4 px-6 py-4 items-center ${
                idx !== deptDisplays.length - 1 ? 'border-b border-white/4' : ''
              }`}
            >
              <div>
                <div className="font-semibold text-white text-sm">{department.name}</div>
                <div className="text-xs text-slate-500 font-mono">{department.prefix}</div>
              </div>

              <div className="text-center">
                <span className={`text-2xl font-bold ${waiting > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {waiting}
                </span>
              </div>

              <div className="text-center text-sm font-mono font-bold text-slate-300">
                {nextUp?.queueNumber ?? <span className="text-slate-600">—</span>}
              </div>

              <div>
                <div className="h-2 bg-navy-mid rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-brand to-blue-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((waiting / 20) * 100, 100)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <div className="text-xs text-slate-500 mt-1 text-right">{waiting} in line</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-brand/8 border-t border-brand/15 px-6 py-2 flex items-center gap-4 text-xs">
        <span className="text-red-400 font-bold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
          LIVE
        </span>
        {soundOn && (
          <span className="text-brand-light flex items-center gap-1.5">
            <Mic size={11} /> Voice announcements active
          </span>
        )}
        <span className="ml-auto text-slate-500">
          {time.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>
    </div>
  )
}
