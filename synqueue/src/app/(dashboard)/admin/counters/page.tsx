'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Plus, Pencil, Loader2, Monitor } from 'lucide-react'
import type { Department, User, CounterStatus } from '@/types'
import type { Counter } from '@prisma/client'

interface CounterWithRelations extends Counter { department: Department; staff: User | null }

const STATUS_OPTIONS: CounterStatus[] = ['ACTIVE', 'INACTIVE', 'BREAK']
const STATUS_COLORS: Record<CounterStatus, string> = {
  ACTIVE:   'bg-green-500/15 text-green-400',
  INACTIVE: 'bg-slate-500/15 text-slate-400',
  BREAK:    'bg-amber-500/15 text-amber-400',
}

export default function CountersPage() {
  const [counters, setCounters] = useState<CounterWithRelations[]>([])
  const [depts,    setDepts]    = useState<Department[]>([])
  const [staff,    setStaff]    = useState<User[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState<CounterWithRelations | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [mounted,  setMounted]  = useState(false)
  const [form, setForm] = useState({ name: '', number: 1, departmentId: '', staffId: '', status: 'INACTIVE' as CounterStatus, })

  async function load() {
    const [cr, dr, ur] = await Promise.all([
      fetch('/api/counters'), fetch('/api/departments?status=ACTIVE'), fetch('/api/users?role=STAFF'),
    ])
    const [cj, dj, uj] = await Promise.all([cr.json(), dr.json(), ur.json()])
    setCounters(cj.data ?? [])
    setDepts(dj.data ?? [])
    setStaff(uj.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load(); setMounted(true) }, [])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', number: 1, departmentId: depts[0]?.id ?? '', staffId: '', status: 'INACTIVE' })
    setShowForm(true)
  }

  function openEdit(c: CounterWithRelations) {
    setEditing(c)
    setForm({ name: c.name, number: c.number, departmentId: c.departmentId, staffId: c.staffId ?? '', status: c.status as CounterStatus })
    setShowForm(true)
  }

  async function handleSave() {
    setSaving(true)
    const url    = editing ? `/api/counters/${editing.id}` : '/api/counters'
    const method = editing ? 'PATCH' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false); setShowForm(false); load()
  }

  async function toggleStatus(c: CounterWithRelations) {
    const next = c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    await fetch(`/api/counters/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) })
    load()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Counters / Windows</h1>
          <p className="text-slate-400 text-sm">Manage service counters and staff assignments</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-medium px-4 py-2 rounded-lg text-sm transition">
          <Plus size={16} /> Add Counter
        </button>
      </div>

      {mounted && createPortal(
        <>
        {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-navy-card border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-5">{editing ? 'Edit Counter' : 'New Counter'}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Counter Name</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Counter 1"
                    className="w-full bg-navy-mid border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/60" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Number</label>
                  <input type="number" min={1} value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: parseInt(e.target.value) }))}
                    className="w-full bg-navy-mid border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand/60" />
                </div>
              </div>
              {[
                { key: 'departmentId', label: 'Department', opts: depts.map((d) => ({ val: d.id, label: d.name })) },
                { key: 'staffId',      label: 'Assigned Staff', opts: [{ val: '', label: 'Unassigned' }, ...staff.map((u) => ({ val: u.id, label: u.name }))] },
                { key: 'status',       label: 'Status',     opts: STATUS_OPTIONS.map((s) => ({ val: s, label: s })) },
              ].map(({ key, label, opts }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
                  <select value={(form as any)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-navy-mid border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand/60">
                    {opts.map((o) => <option key={o.val} value={o.val}>{o.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 bg-navy-mid border border-white/8 text-white rounded-lg py-2.5 text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.departmentId}
                className="flex-1 flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white rounded-lg py-2.5 text-sm transition">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editing ? 'Save' : 'Create'}
              </button>
            </div>
          </motion.div>
        </div>
        )}
        </>,
        document.body
      )}

      <div className="glass overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-slate-400 text-xs uppercase tracking-wider">
              {['Counter', 'Department', 'Assigned Staff', 'Status', 'Actions'].map((h, i) => (
                <th key={h} className={`px-5 py-3 ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td colSpan={5} className="px-5 py-3"><div className="skeleton h-5 rounded" /></td></tr>
            )) : counters.map((c) => (
              <tr key={c.id} className="border-b border-white/4 hover:bg-white/2 transition">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <Monitor size={16} className="text-brand-light" />
                    <span className="font-medium text-white">{c.name}</span>
                    <span className="text-xs text-slate-500">#{c.number}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-slate-300">{c.department.name}</td>
                <td className="px-5 py-3.5 text-slate-300">{c.staff?.name ?? <span className="text-slate-500">Unassigned</span>}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[c.status as CounterStatus]}`}>{c.status}</span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => toggleStatus(c)}
                      className={`text-xs px-2.5 py-1 rounded font-medium transition ${c.status === 'ACTIVE' ? 'bg-slate-500/10 text-slate-400 hover:bg-slate-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                      {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => openEdit(c)} className="text-slate-400 hover:text-brand-light transition"><Pencil size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
