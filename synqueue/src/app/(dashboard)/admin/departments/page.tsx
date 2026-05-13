'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Loader2, X, Building2, CheckCircle2, AlertCircle,
  Hash, Tag, AlignLeft, ArrowUpDown,
} from 'lucide-react'

interface Department {
  id: string; name: string; prefix: string
  description: string | null; status: string; sortOrder: number
  _count?: { queues: number; counters: number }
}

interface Toast { id: string; msg: string; type: 'success' | 'error' }

const DEPT_ICONS: Record<string, string> = {
  REG: '📋', CASH: '💰', ADM: '🎓', GDN: '🧭',
  HR: '👥', MED: '🏥', LIB: '📚', IT: '💻',
  SEC: '🔒', ACC: '📊', ENG: '⚙️',
}
const getIcon = (prefix: string) => DEPT_ICONS[prefix] ?? '🏢'

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editing,     setEditing]     = useState<Department | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState<string | null>(null)
  const [toggling,    setToggling]    = useState<string | null>(null)
  const [toasts,      setToasts]      = useState<Toast[]>([])
  const [form, setForm]   = useState({ name: '', prefix: '', description: '', sortOrder: 1 })
  const [mounted, setMounted] = useState(false)

  /* ── Data ─────────────────────────────────────────────── */
  async function load() {
    setLoading(true)
    const res  = await fetch('/api/departments')
    const json = await res.json()
    setDepartments(json.data ?? [])
    setLoading(false)
  }
  useEffect(() => { load(); setMounted(true) }, [])

  /* ── Toast ────────────────────────────────────────────── */
  function toast(msg: string, type: 'success' | 'error' = 'success') {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }

  /* ── Form helpers ─────────────────────────────────────── */
  function openCreate() {
    setEditing(null)
    setForm({ name: '', prefix: '', description: '', sortOrder: departments.length + 1 })
    setShowForm(true)
  }
  function openEdit(d: Department) {
    setEditing(d)
    setForm({ name: d.name, prefix: d.prefix, description: d.description ?? '', sortOrder: d.sortOrder })
    setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditing(null) }

  async function handleSave() {
    if (!form.name.trim() || !form.prefix.trim()) {
      toast('Name and prefix are required.', 'error'); return
    }
    setSaving(true)
    const url    = editing ? `/api/departments/${editing.id}` : '/api/departments'
    const method = editing ? 'PATCH' : 'POST'
    const res    = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, prefix: form.prefix.toUpperCase() }),
    })
    const json = await res.json()
    setSaving(false)
    if (!json.success) { toast(json.error ?? 'Failed to save.', 'error'); return }
    toast(editing ? `"${form.name}" updated successfully.` : `"${form.name}" created successfully.`)
    closeForm()
    load()
  }

  async function handleToggle(d: Department) {
    setToggling(d.id)
    const next = d.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const res  = await fetch(`/api/departments/${d.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    const json = await res.json()
    setToggling(null)
    if (!json.success) { toast('Failed to update status.', 'error'); return }
    toast(`"${d.name}" is now ${next === 'ACTIVE' ? 'enabled' : 'disabled'}.`)
    load()
  }

  async function handleDelete(d: Department) {
    if (!confirm(`Delete "${d.name}"?\n\nThis will disable the department. Existing queue records are preserved.`)) return
    setDeleting(d.id)
    const res  = await fetch(`/api/departments/${d.id}`, { method: 'DELETE' })
    const json = await res.json()
    setDeleting(null)
    if (!json.success) { toast('Failed to delete.', 'error'); return }
    toast(`"${d.name}" has been removed.`)
    load()
  }

  const active   = departments.filter(d => d.status === 'ACTIVE')
  const inactive = departments.filter(d => d.status !== 'ACTIVE')

  /* ── Render ───────────────────────────────────────────── */
  return (
    <div className="space-y-6 animate-fade-in">

      {/* Toast stack */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{   opacity: 0, y: 8,   scale: 0.95 }}
              className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium ${
                t.type === 'success'
                  ? 'bg-navy-card border-green-500/30 text-green-300'
                  : 'bg-navy-card border-red-500/30 text-red-300'
              }`}
            >
              {t.type === 'success'
                ? <CheckCircle2 size={15} className="text-green-400 flex-shrink-0" />
                : <AlertCircle  size={15} className="text-red-400 flex-shrink-0" />}
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Services & Departments</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {active.length} active · {inactive.length} inactive
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition shadow-lg shadow-brand/20">
          <Plus size={16} /> Add Service
        </button>
      </div>

      {/* Create / Edit modal — portal escapes animate-fade-in transform stacking context */}
      {mounted && createPortal(
        <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              exit={{   opacity: 0, scale: 0.96, y: 12 }}
              className="bg-navy-card border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand/15 flex items-center justify-center">
                    <Building2 size={15} className="text-brand-light" />
                  </div>
                  <h2 className="font-semibold text-white">
                    {editing ? 'Edit Service' : 'New Service'}
                  </h2>
                </div>
                <button onClick={closeForm} className="text-slate-400 hover:text-white transition">
                  <X size={18} />
                </button>
              </div>

              {/* Form body */}
              <div className="p-6 space-y-4">

                {/* Preview badge */}
                {(form.name || form.prefix) && (
                  <div className="flex items-center gap-3 p-3 bg-navy-mid rounded-xl border border-white/5">
                    <span className="text-2xl">{getIcon(form.prefix.toUpperCase())}</span>
                    <div>
                      <div className="font-semibold text-white text-sm">{form.name || 'Service Name'}</div>
                      <span className="text-xs bg-brand/15 text-brand-light font-bold px-2 py-0.5 rounded mt-0.5 inline-block">
                        {form.prefix.toUpperCase() || 'PREFIX'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300 mb-1.5">
                    <Tag size={13} className="text-slate-400" /> Service Name
                  </label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Registrar, Cashier, Admissions"
                    autoFocus
                    className="w-full bg-navy-mid border border-white/8 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/60 transition"
                  />
                </div>

                {/* Prefix */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300 mb-1.5">
                    <Hash size={13} className="text-slate-400" /> Queue Prefix
                    <span className="text-xs text-slate-500 font-normal">(2–5 characters)</span>
                  </label>
                  <input
                    value={form.prefix}
                    onChange={e => setForm(f => ({ ...f, prefix: e.target.value.toUpperCase().slice(0, 5) }))}
                    placeholder="e.g. REG, CASH, ADM"
                    maxLength={5}
                    disabled={!!editing}
                    className="w-full bg-navy-mid border border-white/8 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/60 transition disabled:opacity-50 disabled:cursor-not-allowed font-mono tracking-widest uppercase"
                  />
                  {editing && (
                    <p className="text-xs text-slate-500 mt-1">Prefix cannot be changed after creation.</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300 mb-1.5">
                    <AlignLeft size={13} className="text-slate-400" /> Description
                    <span className="text-xs text-slate-500 font-normal">(optional)</span>
                  </label>
                  <input
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="e.g. Documents, payments, enrollment"
                    className="w-full bg-navy-mid border border-white/8 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/60 transition"
                  />
                </div>

                {/* Sort order */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300 mb-1.5">
                    <ArrowUpDown size={13} className="text-slate-400" /> Display Order
                  </label>
                  <input
                    type="number" min={1}
                    value={form.sortOrder}
                    onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 1 }))}
                    className="w-24 bg-navy-mid border border-white/8 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand/60 transition"
                  />
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex gap-3 px-6 pb-6">
                <button onClick={closeForm}
                  className="flex-1 bg-navy-mid hover:bg-navy-light border border-white/8 text-slate-300 hover:text-white rounded-lg py-2.5 text-sm font-medium transition">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name.trim() || !form.prefix.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-semibold transition"
                >
                  {saving
                    ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                    : editing ? '✓ Save Changes' : '+ Create Service'
                  }
                </button>
              </div>
            </motion.div>
          </div>
        )}
        </AnimatePresence>,
        document.body
      )}

      {/* Department cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-36 rounded-xl" />
          ))}
        </div>
      ) : departments.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center py-20 text-center">
          <Building2 size={40} className="text-slate-600 mb-3" />
          <p className="text-slate-400 font-medium">No services yet</p>
          <p className="text-slate-500 text-sm mt-1">Click "Add Service" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {departments.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{   opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-xl border p-5 flex flex-col gap-4 transition-all ${
                  d.status === 'ACTIVE'
                    ? 'bg-navy-card border-white/8 hover:border-white/15'
                    : 'bg-navy-mid/40 border-white/4 opacity-60'
                }`}
              >
                {/* Card top */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{getIcon(d.prefix)}</div>
                    <div>
                      <div className="font-semibold text-white">{d.name}</div>
                      <span className="text-xs bg-brand/10 text-brand-light font-bold px-2 py-0.5 rounded mt-0.5 inline-block">
                        {d.prefix}
                      </span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                    d.status === 'ACTIVE'
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-slate-500/15 text-slate-400'
                  }`}>
                    {d.status === 'ACTIVE' ? '● Active' : '○ Inactive'}
                  </span>
                </div>

                {/* Description */}
                {d.description && (
                  <p className="text-xs text-slate-400 -mt-2">{d.description}</p>
                )}

                {/* Stats */}
                <div className="flex gap-3 text-xs text-slate-400">
                  <span>{d._count?.queues ?? 0} queues total</span>
                  <span>·</span>
                  <span>{d._count?.counters ?? 0} counters</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                  {/* Edit */}
                  <button
                    onClick={() => openEdit(d)}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-navy-mid hover:bg-white/8 text-slate-300 hover:text-white transition"
                  >
                    <Pencil size={12} /> Edit
                  </button>

                  {/* Enable / Disable */}
                  <button
                    onClick={() => handleToggle(d)}
                    disabled={toggling === d.id}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-60 ${
                      d.status === 'ACTIVE'
                        ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                        : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                    }`}
                  >
                    {toggling === d.id
                      ? <Loader2 size={12} className="animate-spin" />
                      : d.status === 'ACTIVE'
                        ? <ToggleRight size={12} />
                        : <ToggleLeft  size={12} />
                    }
                    {d.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(d)}
                    disabled={deleting === d.id}
                    className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500/8 text-red-400 hover:bg-red-500/20 transition disabled:opacity-60"
                  >
                    {deleting === d.id
                      ? <Loader2 size={12} className="animate-spin" />
                      : <Trash2 size={12} />
                    }
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Summary table for admins who prefer it */}
      {departments.length > 0 && (
        <div className="glass overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            All Services — Quick Reference
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-slate-400 text-xs uppercase tracking-wider">
                  {['Service', 'Prefix', 'Description', 'Status', 'Actions'].map((h, i) => (
                    <th key={h} className={`px-5 py-3 ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {departments.map(d => (
                  <tr key={d.id} className="border-b border-white/4 hover:bg-white/2 transition">
                    <td className="px-5 py-3 font-medium text-white flex items-center gap-2">
                      <span>{getIcon(d.prefix)}</span> {d.name}
                    </td>
                    <td className="px-5 py-3">
                      <span className="bg-brand/10 text-brand-light font-bold text-xs px-2 py-0.5 rounded font-mono">
                        {d.prefix}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{d.description ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        d.status === 'ACTIVE'
                          ? 'bg-green-500/15 text-green-400'
                          : 'bg-slate-500/15 text-slate-400'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(d)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-light hover:bg-brand/10 transition">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleToggle(d)} disabled={toggling === d.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition disabled:opacity-50">
                          {toggling === d.id
                            ? <Loader2 size={13} className="animate-spin" />
                            : d.status === 'ACTIVE' ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                        </button>
                        <button onClick={() => handleDelete(d)} disabled={deleting === d.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-50">
                          {deleting === d.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
