'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

const tooltipStyle = {
  contentStyle: { background: '#132038', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#e2e8f0' },
  cursor:       { fill: 'rgba(255,255,255,0.04)' },
}

export function AnalyticsCharts() {
  const [hourly, setHourly] = useState<any[]>([])
  const [daily,  setDaily]  = useState<any[]>([])
  const [pie,    setPie]    = useState<any[]>([])

  useEffect(() => {
    const from = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)
    const to   = new Date().toISOString().slice(0, 10)

    fetch(`/api/analytics/reports?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((j) => {
        setHourly(j.data?.hourly ?? [])
        setDaily(j.data?.daily?.slice(-7) ?? [])

        const s = j.data?.summary
        if (s) {
          setPie([
            { name: 'Completed',   value: s.completed },
            { name: 'Skipped',     value: s.skipped },
            { name: 'Transferred', value: s.transferred },
            { name: 'Other',       value: Math.max(0, s.total - s.completed - s.skipped - s.transferred) },
          ].filter((x) => x.value > 0))
        }
      })
      .catch(() => {})
  }, [])

  const chartLabel = { fontSize: 11, fill: '#64748b' }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Daily volume */}
      <div className="lg:col-span-2 glass p-5">
        <h3 className="font-semibold text-white mb-4 text-sm">7-Day Queue Volume</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={daily} barSize={14} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="date" tick={chartLabel} stroke="transparent"
              tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={chartLabel} stroke="transparent" />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            <Bar dataKey="total"     fill="#2563EB" radius={[3,3,0,0]} name="Total" />
            <Bar dataKey="completed" fill="#10B981" radius={[3,3,0,0]} name="Completed" />
            <Bar dataKey="skipped"   fill="#F59E0B" radius={[3,3,0,0]} name="Skipped" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie chart */}
      <div className="glass p-5">
        <h3 className="font-semibold text-white mb-4 text-sm">Queue Outcomes</h3>
        {pie.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pie} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3}>
                  {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {pie.map((entry, i) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-400">{entry.name}</span>
                  </div>
                  <span className="font-medium text-white">{entry.value}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-40 flex items-center justify-center text-slate-600 text-sm">No data yet</div>
        )}
      </div>

      {/* Hourly heatmap (line chart) */}
      <div className="lg:col-span-3 glass p-5">
        <h3 className="font-semibold text-white mb-4 text-sm">Hourly Queue Traffic (Today's Pattern)</h3>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={hourly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="hour" tick={chartLabel} stroke="transparent"
              tickFormatter={(h) => h % 4 === 0 ? `${h}:00` : ''} />
            <YAxis tick={chartLabel} stroke="transparent" />
            <Tooltip {...tooltipStyle} labelFormatter={(h) => `${h}:00`} />
            <Line
              type="monotone" dataKey="count"
              stroke="#3B82F6" strokeWidth={2}
              dot={{ r: 2, fill: '#3B82F6', strokeWidth: 0 }}
              activeDot={{ r: 4 }}
              name="Queues"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
