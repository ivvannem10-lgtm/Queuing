'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, CheckCircle, ChevronRight, Printer, ArrowLeft, Star, Users, Clock } from 'lucide-react'
import type { Department, PriorityType } from '@/types'
import QRCode from 'qrcode'

const PRIORITY_OPTIONS: Array<{ value: PriorityType; label: string; icon: string; color: string }> = [
  { value: 'NONE',           label: 'Regular',          icon: '👤', color: 'border-slate-600 hover:border-brand' },
  { value: 'SENIOR_CITIZEN', label: 'Senior Citizen',   icon: '👴', color: 'border-purple-600/50 hover:border-purple-500' },
  { value: 'PWD',            label: 'PWD',              icon: '♿', color: 'border-pink-600/50 hover:border-pink-500' },
  { value: 'PREGNANT',       label: 'Pregnant',         icon: '🤰', color: 'border-orange-600/50 hover:border-orange-500' },
  { value: 'VIP',            label: 'VIP',              icon: '⭐', color: 'border-yellow-600/50 hover:border-yellow-500' },
]

interface GeneratedTicket {
  id:          string
  queueNumber: string
  serviceName: string
  clientName:  string | null
  isPriority:  boolean
  priorityType: string
  position:    number
  estimatedWait: string
  createdAt:   string
}

export default function QueuePage() {
  const [departments,    setDepartments]    = useState<Department[]>([])
  const [selectedDept,   setSelectedDept]   = useState<Department | null>(null)
  const [clientName,     setClientName]     = useState('')
  const [priorityType,   setPriorityType]   = useState<PriorityType>('NONE')
  const [loading,        setLoading]        = useState(false)
  const [ticket,         setTicket]         = useState<GeneratedTicket | null>(null)
  const [qrDataUrl,      setQrDataUrl]      = useState('')
  const [step,           setStep]           = useState<'select' | 'details' | 'ticket'>('select')
  const [deptLoading,    setDeptLoading]    = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/departments?status=ACTIVE')
      .then((r) => r.json())
      .then((j) => { setDepartments(j.data ?? []); setDeptLoading(false) })
      .catch(() => setDeptLoading(false))
  }, [])

  useEffect(() => {
    if (ticket) {
      QRCode.toDataURL(`${window.location.origin}/queue/status/${ticket.id}`, {
        width: 200, margin: 2,
        color: { dark: '#ffffff', light: '#00000000' },
      }).then(setQrDataUrl).catch(() => {})
    }
  }, [ticket])

  async function handleGetNumber() {
    if (!selectedDept) return
    setLoading(true)
    try {
      const res = await fetch('/api/queues', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          departmentId: selectedDept.id,
          clientName:   clientName.trim() || null,
          priorityType,
          isPriority:   priorityType !== 'NONE',
        }),
      })
      const json = await res.json()
      if (json.success) {
        setTicket(json.data)
        setStep('ticket')
      }
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  function handleReset() {
    setTicket(null)
    setSelectedDept(null)
    setClientName('')
    setPriorityType('NONE')
    setStep('select')
  }

  return (
    <div className="min-h-screen bg-navy-deep">
      {/* Header */}
      <header className="border-b border-white/5 bg-navy-mid/60 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-black text-sm">Q</div>
            <span className="font-bold text-white">SynQueue</span>
          </div>
          <a href="/display" className="text-sm text-slate-400 hover:text-white transition flex items-center gap-1.5">
            Live Display <ChevronRight size={14} />
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <AnimatePresence mode="wait">

          {/* ── Step 1: Select Department ── */}
          {step === 'select' && (
            <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-white mb-2">Get Your Queue Number</h1>
                <p className="text-slate-400">Select a service to get started — no waiting in line required.</p>
              </div>

              {deptLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="skeleton h-28 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {departments.map((dept) => (
                    <motion.button
                      key={dept.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setSelectedDept(dept); setStep('details') }}
                      className="glass p-5 text-left hover:border-brand/50 hover:bg-brand/5 transition-all group"
                    >
                      <div className="text-2xl mb-3">
                        {dept.prefix === 'REG' ? '📋' : dept.prefix === 'CASH' ? '💰' :
                         dept.prefix === 'ADM' ? '🎓' : dept.prefix === 'GDN' ? '🧭' :
                         dept.prefix === 'HR'  ? '👥' : dept.prefix === 'MED' ? '🏥' : '🏢'}
                      </div>
                      <div className="font-semibold text-white text-sm group-hover:text-brand-light transition">{dept.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{dept.description ?? dept.prefix}</div>
                      <div className="mt-3 inline-block bg-brand/10 text-brand-light text-xs font-bold px-2 py-0.5 rounded-full">{dept.prefix}</div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Step 2: Details ── */}
          {step === 'details' && selectedDept && (
            <motion.div key="details" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <button onClick={() => setStep('select')} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition">
                <ArrowLeft size={14} /> Back to services
              </button>

              <div className="glass p-6 mb-4">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg bg-brand/15 flex items-center justify-center text-brand-light font-bold text-sm">
                    {selectedDept.prefix}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{selectedDept.name}</div>
                    <div className="text-xs text-slate-400">{selectedDept.description}</div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Your Name <span className="text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="e.g. Juan dela Cruz"
                      className="w-full bg-navy-mid border border-white/8 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/60 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Priority Category
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {PRIORITY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setPriorityType(opt.value)}
                          className={`flex items-center gap-2 p-3 rounded-lg border text-left text-sm transition-all ${opt.color} ${
                            priorityType === opt.value
                              ? 'bg-brand/10 border-brand text-white'
                              : 'bg-navy-mid text-slate-300'
                          }`}
                        >
                          <span className="text-base">{opt.icon}</span>
                          <span className="font-medium text-xs">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGetNumber}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-semibold rounded-xl py-3.5 text-base transition"
              >
                {loading
                  ? <><Loader2 size={18} className="animate-spin" /> Generating…</>
                  : <><CheckCircle size={18} /> Get My Queue Number</>
                }
              </button>
            </motion.div>
          )}

          {/* ── Step 3: Ticket ── */}
          {step === 'ticket' && ticket && (
            <motion.div key="ticket" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-6">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring' }}>
                  <CheckCircle className="mx-auto text-green-400 mb-3" size={48} />
                </motion.div>
                <h2 className="text-xl font-bold text-white">You're in the queue!</h2>
                <p className="text-slate-400 text-sm mt-1">Show or save this ticket</p>
              </div>

              {/* Ticket */}
              <div ref={printRef} className="bg-gradient-to-br from-navy-card to-navy-mid border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                {/* Top stripe */}
                <div className={`h-2 ${ticket.isPriority ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-brand to-blue-400'}`} />

                <div className="p-8 text-center">
                  <div className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase mb-1">{ticket.serviceName}</div>

                  {ticket.isPriority && (
                    <div className="inline-flex items-center gap-1.5 bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-bold px-3 py-1 rounded-full mb-3">
                      <Star size={10} /> PRIORITY LANE
                    </div>
                  )}

                  <div className="tv-number text-white my-4">{ticket.queueNumber}</div>

                  {ticket.clientName && (
                    <div className="text-slate-300 text-sm mb-4">Hello, <strong>{ticket.clientName}</strong> 👋</div>
                  )}

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <div className="bg-navy-deep/60 rounded-xl p-4">
                      <Users size={16} className="text-slate-400 mx-auto mb-1" />
                      <div className="text-xs text-slate-400">Position</div>
                      <div className="text-2xl font-bold text-white">#{ticket.position}</div>
                    </div>
                    <div className="bg-navy-deep/60 rounded-xl p-4">
                      <Clock size={16} className="text-slate-400 mx-auto mb-1" />
                      <div className="text-xs text-slate-400">Est. Wait</div>
                      <div className="text-2xl font-bold text-white">{ticket.estimatedWait}</div>
                    </div>
                  </div>

                  {/* QR code */}
                  {qrDataUrl && (
                    <div className="mt-6 flex justify-center">
                      <img src={qrDataUrl} alt="QR Code" className="w-28 h-28 rounded-xl opacity-80" />
                    </div>
                  )}

                  <p className="text-xs text-slate-500 mt-4">
                    Scan to check your queue status anytime
                  </p>
                </div>

                {/* Perforation line */}
                <div className="relative my-1">
                  <div className="border-t border-dashed border-white/10" />
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-navy-deep" />
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-navy-deep" />
                </div>

                <div className="px-8 py-4 flex justify-between text-xs text-slate-500">
                  <span>SynQueue</span>
                  <span>{new Date(ticket.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleReset}
                  className="flex-1 bg-navy-mid hover:bg-navy-card border border-white/8 text-white font-medium rounded-xl py-3 text-sm transition"
                >
                  Get Another
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-medium rounded-xl py-3 text-sm transition"
                >
                  <Printer size={15} /> Print Ticket
                </button>
              </div>

              <a href="/display" className="block text-center text-sm text-brand-light hover:text-white mt-4 transition">
                Watch live queue display →
              </a>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
