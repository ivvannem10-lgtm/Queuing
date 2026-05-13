'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Power, Loader2, Building, Users, Layers, X } from 'lucide-react'

interface Brand {
  id:          string
  name:        string
  slug:        string
  logoUrl:     string | null
  accentColor: string | null
  userLimit:   number
  isActive:    boolean
  createdAt:   string
  _count:      { users: number; departments: number }
}

const EMPTY_FORM = { name: '', slug: '', logoUrl: '', accentColor: '#2563eb', userLimit: 15 }

export default function BrandsPage() {
  const [brands,    setBrands]    = useState<Brand[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState<Brand | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [error,     setError]     = useState('')

  async function load() {
    const res  = await fetch('/api/brands')
    const json = await res.json()
    setBrands(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowForm(true)
  }

  function openEdit(b: Brand) {
    setEditing(b)
    setForm({ name: b.name, slug: b.slug, logoUrl: b.logoUrl ?? '', accentColor: b.accentColor ?? '#2563eb', userLimit: b.userLimit ?? 15 })
    setError('')
    setShowForm(true)
  }

  // Auto-generate slug from name on create
  function handleNameChange(name: string) {
    setForm((f) => ({
      ...f,
      name,
      ...(editing ? {} : { slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }),
    }))
  }

  async function handleSave() {
    if (!form.name.trim() || !form.slug.trim()) { setError('Name and slug are required'); return }
    setSaving(true)
    setError('')

    const url    = editing ? `/api/brands/${editing.id}` : '/api/brands'
    const method = editing ? 'PATCH' : 'POST'
    const res    = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    })
    const json = await res.json()
    setSaving(false)

    if (!json.success) { setError(json.error ?? 'Something went wrong'); return }
    setShowForm(false)
    load()
  }

  async function toggleActive(b: Brand) {
    await fetch(`/api/brands/${b.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ isActive: !b.isActive }),
    })
    load()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Brands</h1>
          <p className="text-slate-400 text-sm">Manage companies / organisations on this system</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-medium px-4 py-2 rounded-lg text-sm transition"
        >
          <Plus size={16} /> New Brand
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      ) : brands.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center py-20 text-slate-500">
          <Building size={40} className="mb-3 opacity-30" />
          <p className="font-medium">No brands yet</p>
          <p className="text-sm mt-1">Create the first brand to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {brands.map((b) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass p-5 flex flex-col gap-4 ${!b.isActive ? 'opacity-50' : ''}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                      style={{ background: b.accentColor ?? '#2563eb' }}
                    >
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-white leading-tight">{b.name}</div>
                      <div className="text-xs text-slate-500 font-mono">/{b.slug}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    b.isActive ? 'bg-green-500/15 text-green-400' : 'bg-slate-500/15 text-slate-400'
                  }`}>
                    {b.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-navy-mid rounded-lg px-3 py-2 flex items-center gap-2">
                    <Users size={12} className="text-slate-400" />
                    <span className="text-xs text-slate-300">
                      <strong className={b._count.users >= b.userLimit ? 'text-red-400' : 'text-white'}>{b._count.users}</strong>
                      <span className="text-slate-500"> / {b.userLimit}</span>
                      <span className="ml-1">users</span>
                    </span>
                  </div>
                  <div className="bg-navy-mid rounded-lg px-3 py-2 flex items-center gap-2">
                    <Layers size={12} className="text-slate-400" />
                    <span className="text-xs text-slate-300"><strong className="text-white">{b._count.departments}</strong> depts</span>
                  </div>
                </div>

                {/* Queue URL */}
                <div className="text-xs text-slate-500 font-mono bg-navy-mid rounded-lg px-3 py-2 truncate">
                  /queue?brand={b.slug}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-white/5">
                  <button
                    onClick={() => openEdit(b)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-navy-mid hover:bg-white/10 text-slate-300 rounded-lg py-2 transition"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => toggleActive(b)}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs rounded-lg py-2 transition ${
                      b.isActive
                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                        : 'bg-green-500/10 hover:bg-green-500/20 text-green-400'
                    }`}
                  >
                    <Power size={12} /> {b.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{   opacity: 0, scale: 0.95 }}
              className="bg-navy-card border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">{editing ? 'Edit Brand' : 'New Brand'}</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white transition">
                  <X size={18} />
                </button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-2.5 mb-4">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Brand / Company Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full bg-navy-mid border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Slug <span className="text-slate-500 text-xs">(used in queue URL)</span>
                  </label>
                  <div className="flex items-center bg-navy-mid border border-white/8 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/60">
                    <span className="pl-3 text-slate-500 text-sm select-none">/queue?brand=</span>
                    <input
                      value={form.slug}
                      onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                      placeholder="acme-corp"
                      className="flex-1 bg-transparent px-1 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Accent Colour <span className="text-slate-500 text-xs">(brand colour)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.accentColor}
                      onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                      className="w-10 h-10 rounded-lg border border-white/8 bg-navy-mid cursor-pointer"
                    />
                    <input
                      value={form.accentColor}
                      onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                      className="flex-1 bg-navy-mid border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    User Limit <span className="text-slate-500 text-xs">(max staff accounts for this brand)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={form.userLimit}
                    onChange={(e) => setForm((f) => ({ ...f, userLimit: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full bg-navy-mid border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand/60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Logo URL <span className="text-slate-500 text-xs">(optional)</span>
                  </label>
                  <input
                    value={form.logoUrl}
                    onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                    className="w-full bg-navy-mid border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/60"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-navy-mid border border-white/8 text-white rounded-lg py-2.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-medium transition"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  {editing ? 'Save Changes' : 'Create Brand'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
