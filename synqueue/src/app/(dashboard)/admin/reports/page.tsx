'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Download, Calendar } from 'lucide-react'
import type { Department } from '@/types'

export default function ReportsPage() {
  const [from,       setFrom]       = useState(() => new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10))
  const [to,         setTo]         = useState(() => new Date().toISOString().slice(0, 10))
  const [deptId,     setDeptId]     = useState('')
  const [depts,      setDepts]      = useState<Department[]>([])
  const [report,     setReport]     = useState<any>(null)
  const [loading,    setLoading]    = useState(false)
  const [hourly,     setHourly]     = useState<any[]>([])
  const [daily,      setDaily]      = useState<any[]>([])

  useEffect(() => {
    fetch('/api/departments?status=ACTIVE').then((r) => r.json()).then((j) => setDepts(j.data ?? []))
    loadReport()
  }, [])

  async function loadReport() {
    setLoading(true)
    const params = new URLSearchParams({ from, to })
    if (deptId) params.set('departmentId', deptId)
    const res  = await fetch(`/api/analytics/reports?${params}`)
    const json = await res.json()
    setReport(json.data?.summary)
    setHourly(json.data?.hourly ?? [])
    setDaily(json.data?.daily ?? [])
    setLoading(false)
  }

  function handleExportCSV() {
    if (!daily.length) return
    const headers = ['Date', 'Total Queues', 'Completed', 'Skipped', 'Priority']
    const rows    = daily.map((d: any) => [d.date, d.total, d.completed, d.skipped, d.priority])
    const csv     = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob    = new Blob([csv], { type: 'text/csv' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a')
    a.href = url; a.download = `synqueue-report-${from}-${to}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-slate-400 text-sm">Queue performance over time</p>
        </div>
        <button onClick={handleExportCSV} className="flex items-center gap-2 bg-navy-card border border-white/8 text-slate-300 hover:text-white font-medium px-4 py-2 rounded-lg text-sm transition">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="glass p-4 flex flex-wrap items-end gap-4">
        {[
          { label: 'From', val: from, set: setFrom, type: 'date' },
          { label: 'To',   val: to,   set: setTo,   type: 'date' },
        ].map(({ label, val, set, type }) => (
          <div key={label}>
            <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
            <input type={type} value={val} onChange={(e) => set(e.target.value)}
              className="bg-navy-mid border border-white/8 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand/60" />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Department</label>
          <select value={deptId} onChange={(e) => setDeptId(e.target.value)}
            className="bg-navy-mid border border-white/8 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand/60">
            <option value="">All Departments</option>
            {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <button onClick={loadReport} disabled={loading}
          className="flex items-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
          <Calendar size={14} /> {loading ? 'Loading…' : 'Generate'}
        </button>
      </div>

      {/* Summary KPIs */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Queues',   val: report.total,       color: 'text-white' },
            { label: 'Completed',      val: report.completed,   color: 'text-green-400' },
            { label: 'Avg Wait',       val: `${Math.round(report.avgWaitMs / 60000)}m`, color: 'text-blue-400' },
            { label: 'Priority Count', val: report.priority,    color: 'text-purple-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="glass p-5">
              <div className="text-xs text-slate-400 mb-1">{label}</div>
              <div className={`text-3xl font-bold ${color}`}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-5">
          <h3 className="font-semibold text-white mb-4">Daily Queue Volume</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={daily} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#132038', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="total"     fill="#2563EB" radius={[4,4,0,0]} name="Total" />
              <Bar dataKey="completed" fill="#10B981" radius={[4,4,0,0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass p-5">
          <h3 className="font-semibold text-white mb-4">Hourly Queue Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(h) => `${h}:00`} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#132038', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} labelFormatter={(h) => `${h}:00`} />
              <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3, fill: '#3B82F6' }} name="Queues" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily table */}
      {daily.length > 0 && (
        <div className="glass overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <h3 className="font-semibold text-white text-sm">Daily Breakdown</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 text-xs uppercase tracking-wider">
                {['Date', 'Total', 'Completed', 'Skipped', 'Transferred', 'Priority', 'Avg Wait'].map((h, i) => (
                  <th key={h} className={`px-5 py-3 ${i > 0 ? 'text-center' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {daily.map((d: any) => (
                <tr key={d.date} className="border-b border-white/4 hover:bg-white/2 transition">
                  <td className="px-5 py-3 font-medium text-white">{d.date}</td>
                  <td className="px-5 py-3 text-center">{d.total}</td>
                  <td className="px-5 py-3 text-center text-green-400">{d.completed}</td>
                  <td className="px-5 py-3 text-center text-red-400">{d.skipped}</td>
                  <td className="px-5 py-3 text-center text-blue-400">{d.transferred}</td>
                  <td className="px-5 py-3 text-center text-purple-400">{d.priority}</td>
                  <td className="px-5 py-3 text-center text-slate-300">{Math.round(d.avgWaitMs / 60000)}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
