'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, ChevronLeft, ChevronRight, Download, RefreshCw, Clock, Star } from 'lucide-react'
import { STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/types'
import type { QueueStatus, PriorityType } from '@/types'
import { formatDateTime, msToMinSec } from '@/lib/utils'

interface Record {
  id:               string
  queueNumber:      string
  clientName:       string | null
  status:           string
  isPriority:       boolean
  priorityType:     string
  createdAt:        string
  calledAt:         string | null
  completedAt:      string | null
  waitingDurationMs: number | null
  servingDurationMs: number | null
  department:       { id: string; name: string; prefix: string }
  counter:          { id: string; name: string; staff: { name: string } | null } | null
}

interface Dept { id: string; name: string }

const STATUSES = ['', 'WAITING', 'SERVING', 'COMPLETED', 'SKIPPED', 'CANCELLED', 'TRANSFERRED']

export default function RecordsPage() {
  const [records,    setRecords]    = useState<Record[]>([])
  const [depts,      setDepts]      = useState<Dept[]>([])
  const [loading,    setLoading]    = useState(true)
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [pages,      setPages]      = useState(1)

  const [search,     setSearch]     = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [status,     setStatus]     = useState('')
  const [dateFrom,   setDateFrom]   = useState('')
  const [dateTo,     setDateTo]     = useState('')

  const load = useCallback(async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search)     params.set('search',       search)
    if (deptFilter) params.set('departmentId', deptFilter)
    if (status)     params.set('status',       status)
    if (dateFrom)   params.set('dateFrom',     dateFrom)
    if (dateTo)     params.set('dateTo',       dateTo)
    params.set('page', String(p))

    const res  = await fetch(`/api/records?${params}`)
    const json = await res.json()
    if (json.success) {
      setRecords(json.data.records)
      setTotal(json.data.total)
      setPage(json.data.page)
      setPages(json.data.pages)
    }
    setLoading(false)
  }, [search, deptFilter, status, dateFrom, dateTo, page])

  useEffect(() => {
    fetch('/api/departments?status=ACTIVE').then(r => r.json()).then(j => setDepts(j.data ?? []))
  }, [])

  useEffect(() => { load(1) }, [search, deptFilter, status, dateFrom, dateTo])

  function exportCSV() {
    const headers = ['Queue No', 'Client', 'Department', 'Counter', 'Staff', 'Status', 'Priority', 'Created', 'Called', 'Completed', 'Wait (ms)', 'Serve (ms)']
    const rows = records.map(r => [
      r.queueNumber,
      r.clientName ?? '',
      r.department.name,
      r.counter?.name ?? '',
      r.counter?.staff?.name ?? '',
      r.status,
      r.isPriority ? r.priorityType : 'Regular',
      r.createdAt,
      r.calledAt ?? '',
      r.completedAt ?? '',
      r.waitingDurationMs ?? '',
      r.servingDurationMs ?? '',
    ])
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `queue-records-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Queue Records</h1>
          <p className="text-slate-400 text-sm">{total.toLocaleString()} total records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load(page)} className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 px-3 py-2 rounded-lg text-sm transition">
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={exportCSV} disabled={records.length === 0} className="flex items-center gap-1.5 bg-brand/15 hover:bg-brand/25 border border-brand/30 text-brand-light px-3 py-2 rounded-lg text-sm transition disabled:opacity-40">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search queue number or client name…"
            className="w-full bg-navy-mid border border-white/8 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/60"
          />
        </div>

        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
          className="bg-navy-mid border border-white/8 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand/60">
          <option value="">All Departments</option>
          {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="bg-navy-mid border border-white/8 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand/60">
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>

        <div className="flex gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="flex-1 bg-navy-mid border border-white/8 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand/60" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="flex-1 bg-navy-mid border border-white/8 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand/60" />
        </div>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 text-xs uppercase tracking-wider">
                {['Queue #', 'Client', 'Department', 'Counter / Staff', 'Status', 'Priority', 'Created', 'Wait', 'Served'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td></tr>
                ))
              ) : records.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-16 text-slate-500">No records found</td></tr>
              ) : records.map((r) => (
                <tr key={r.id} className="border-b border-white/4 hover:bg-white/2 transition">
                  <td className="px-4 py-3 font-mono font-bold text-white">{r.queueNumber}</td>
                  <td className="px-4 py-3 text-slate-300">{r.clientName ?? <span className="text-slate-600">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="text-slate-300 text-xs">{r.department.name}</div>
                    <div className="text-slate-600 text-[10px] font-mono">{r.department.prefix}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="text-slate-300">{r.counter?.name ?? <span className="text-slate-600">—</span>}</div>
                    {r.counter?.staff && <div className="text-slate-500">{r.counter.staff.name}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[r.status as QueueStatus]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.isPriority ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 w-fit ${PRIORITY_COLORS[r.priorityType as PriorityType]}`}>
                        <Star size={8} /> {PRIORITY_LABELS[r.priorityType as PriorityType]}
                      </span>
                    ) : <span className="text-slate-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {r.waitingDurationMs ? (
                      <span className="flex items-center gap-1"><Clock size={10} />{msToMinSec(r.waitingDurationMs)}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {r.servingDurationMs ? msToMinSec(r.servingDurationMs) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-slate-400">Page {page} of {pages} · {total.toLocaleString()} records</span>
            <div className="flex gap-2">
              <button onClick={() => load(page - 1)} disabled={page <= 1}
                className="flex items-center gap-1 text-xs bg-navy-mid border border-white/8 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition disabled:opacity-40">
                <ChevronLeft size={13} /> Prev
              </button>
              <button onClick={() => load(page + 1)} disabled={page >= pages}
                className="flex items-center gap-1 text-xs bg-navy-mid border border-white/8 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition disabled:opacity-40">
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
