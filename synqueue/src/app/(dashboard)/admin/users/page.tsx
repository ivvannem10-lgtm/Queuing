'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Plus, Pencil, Loader2, Search, KeyRound, Eye, EyeOff, X } from 'lucide-react'
import type { User, Department, Role } from '@/types'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/utils'

const ROLES: Role[] = ['ADMIN', 'STAFF', 'CLIENT']

interface UserWithDepts extends User { departments: { department: Department }[] }

export default function UsersPage() {
  const [users,      setUsers]      = useState<UserWithDepts[]>([])
  const [depts,      setDepts]      = useState<Department[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [editing,    setEditing]    = useState<UserWithDepts | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [formError,  setFormError]  = useState('')
  const [mounted,    setMounted]    = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'STAFF' as Role, departmentIds: [] as string[], isActive: true,
  })

  // Change password modal
  const [pwdUser,    setPwdUser]    = useState<UserWithDepts | null>(null)
  const [newPwd,     setNewPwd]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd,    setShowPwd]    = useState(false)
  const [pwdSaving,  setPwdSaving]  = useState(false)
  const [pwdError,   setPwdError]   = useState('')
  const [pwdSuccess, setPwdSuccess] = useState(false)

  async function load() {
    const [ur, dr] = await Promise.all([fetch('/api/users'), fetch('/api/departments?status=ACTIVE')])
    const [uj, dj] = await Promise.all([ur.json(), dr.json()])
    setUsers(uj.data ?? [])
    setDepts(dj.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load(); setMounted(true) }, [])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', email: '', password: '', role: 'STAFF', departmentIds: [], isActive: true })
    setFormError('')
    setShowForm(true)
  }

  function openEdit(u: UserWithDepts) {
    setEditing(u)
    setForm({
      name:          u.name,
      email:         u.email,
      password:      '',
      role:          u.role as Role,
      departmentIds: u.departments.map((d) => d.department.id),
      isActive:      u.isActive,
    })
    setFormError('')
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) { setFormError('Name and email are required'); return }
    if (!editing && !form.password) { setFormError('Password is required for new users'); return }

    setSaving(true)
    setFormError('')
    try {
      const url    = editing ? `/api/users/${editing.id}` : '/api/users'
      const method = editing ? 'PATCH' : 'POST'
      const body   = { ...form }
      if (editing && !body.password) delete (body as any).password

      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok || !json.success) { setFormError(json.error ?? `Error ${res.status}`); return }
      setShowForm(false)
      load()
    } catch {
      setFormError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    if (!newPwd)             { setPwdError('Enter a new password'); return }
    if (newPwd.length < 6)   { setPwdError('Password must be at least 6 characters'); return }
    if (newPwd !== confirmPwd){ setPwdError('Passwords do not match'); return }

    setPwdSaving(true)
    setPwdError('')
    try {
      const res  = await fetch(`/api/users/${pwdUser!.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password: newPwd }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) { setPwdError(json.error ?? `Error ${res.status}`); return }
      setPwdSuccess(true)
      setTimeout(() => { setPwdUser(null); setPwdSuccess(false) }, 1500)
    } catch {
      setPwdError('Network error — please try again')
    } finally {
      setPwdSaving(false)
    }
  }

  function openPwdModal(u: UserWithDepts) {
    setPwdUser(u)
    setNewPwd('')
    setConfirmPwd('')
    setShowPwd(false)
    setPwdError('')
    setPwdSuccess(false)
  }

  async function toggleActive(u: UserWithDepts) {
    await fetch(`/api/users/${u.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !u.isActive }),
    })
    load()
  }

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-slate-400 text-sm">Create and manage staff accounts</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-medium px-4 py-2 rounded-lg text-sm transition">
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="relative w-full sm:w-80">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users…"
          className="w-full bg-navy-card border border-white/8 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/60"
        />
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-slate-400 text-xs uppercase tracking-wider">
              <th className="text-left px-5 py-3">User</th>
              <th className="text-left px-5 py-3">Role</th>
              <th className="text-left px-5 py-3">Departments</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-right px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-5 py-3"><div className="skeleton h-5 rounded" /></td></tr>
              ))
            ) : filtered.map((u) => (
              <tr key={u.id} className="border-b border-white/4 hover:bg-white/2 transition">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand-light font-bold text-xs">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-white">{u.name}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full border ${ROLE_COLORS[u.role as Role]}`}>
                    {ROLE_LABELS[u.role as Role]}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-400 text-xs">
                  {u.departments.map((d) => d.department.name).join(', ') || '—'}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.isActive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                    {u.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openPwdModal(u)}
                      title="Change Password"
                      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded transition bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                    >
                      <KeyRound size={12} /> Password
                    </button>
                    <button
                      onClick={() => toggleActive(u)}
                      className={`text-xs font-medium px-2.5 py-1 rounded transition ${u.isActive ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}
                    >
                      {u.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => openEdit(u)} className="text-slate-400 hover:text-brand-light transition p-1">
                      <Pencil size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Portaled modals ── */}
      {mounted && createPortal(
        <>
          {/* Create / Edit User modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-navy-card border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]"
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-white">{editing ? 'Edit User' : 'Create User'}</h2>
                  <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white transition"><X size={18} /></button>
                </div>

                {formError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-2.5 mb-4">
                    {formError}
                  </div>
                )}

                <div className="space-y-4">
                  {[
                    { key: 'name',     label: 'Full Name', type: 'text',     ph: 'Juan dela Cruz' },
                    { key: 'email',    label: 'Email',     type: 'email',    ph: 'juan@company.com' },
                    { key: 'password', label: editing ? 'New Password (leave blank to keep)' : 'Password', type: 'password', ph: '••••••••' },
                  ].map(({ key, label, type, ph }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
                      <input
                        type={type}
                        value={(form as any)[key]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        placeholder={ph}
                        className="w-full bg-navy-mid border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/60"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                      className="w-full bg-navy-mid border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand/60"
                    >
                      {ROLES.filter((r) => r !== 'CLIENT').map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Departments</label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {depts.map((d) => (
                        <label key={d.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/4">
                          <input
                            type="checkbox"
                            checked={form.departmentIds.includes(d.id)}
                            onChange={(e) => setForm((f) => ({
                              ...f,
                              departmentIds: e.target.checked
                                ? [...f.departmentIds, d.id]
                                : f.departmentIds.filter((id) => id !== d.id),
                            }))}
                            className="rounded border-slate-600 bg-navy-mid"
                          />
                          <span className="text-sm text-slate-300">{d.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowForm(false)} className="flex-1 bg-navy-mid border border-white/8 text-white rounded-lg py-2.5 text-sm">Cancel</button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white rounded-lg py-2.5 text-sm transition">
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    {editing ? 'Save Changes' : 'Create User'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Change Password modal */}
          {pwdUser && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-navy-card border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold text-white">Change Password</h2>
                  <button onClick={() => setPwdUser(null)} className="text-slate-400 hover:text-white transition"><X size={18} /></button>
                </div>
                <p className="text-sm text-slate-400 mb-5">
                  Setting new password for <strong className="text-slate-200">{pwdUser.name}</strong>
                </p>

                {pwdError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-2.5 mb-4">
                    {pwdError}
                  </div>
                )}

                {pwdSuccess ? (
                  <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-3 text-center font-medium">
                    ✓ Password changed successfully
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[
                      { key: 'new',     label: 'New Password',     val: newPwd,     set: setNewPwd },
                      { key: 'confirm', label: 'Confirm Password', val: confirmPwd, set: setConfirmPwd },
                    ].map(({ key, label, val, set }) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
                        <div className="flex items-center gap-2 bg-navy-mid border border-white/8 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand/60">
                          <input
                            type={showPwd ? 'text' : 'password'}
                            value={val}
                            onChange={(e) => set(e.target.value)}
                            placeholder="••••••••"
                            className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white focus:outline-none"
                          />
                          {key === 'new' && (
                            <button onClick={() => setShowPwd(v => !v)} className="pr-3 text-slate-400 hover:text-white transition">
                              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="flex gap-3 pt-1">
                      <button onClick={() => setPwdUser(null)} className="flex-1 bg-navy-mid border border-white/8 text-white rounded-lg py-2.5 text-sm">Cancel</button>
                      <button onClick={handleChangePassword} disabled={pwdSaving}
                        className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-medium transition">
                        {pwdSaving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                        Update Password
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  )
}
