'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'

interface Setting { key: string; value: string; description: string | null }

const SETTING_LABELS: Record<string, string> = {
  institution_name:   'Institution Name',
  queue_reset_time:   'Queue Reset Time (HH:mm)',
  max_queue_per_dept: 'Max Queues per Department/Day',
  sound_alerts:       'Enable Sound Alerts',
  display_theme:      'Display Theme',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [values,   setValues]   = useState<Record<string, string>>({})
  const [saved,    setSaved]    = useState(false)

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((j) => {
      const s: Setting[] = j.data ?? []
      setSettings(s)
      setValues(Object.fromEntries(s.map((x) => [x.key, x.value])))
      setLoading(false)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    await fetch('/api/settings', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ settings: values }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">System Settings</h1>
        <p className="text-slate-400 text-sm">Configure global queue system behaviour</p>
      </div>

      <div className="glass p-6 space-y-6">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-lg" />
          ))
        ) : settings.map((s) => {
          const isBool = s.value === 'true' || s.value === 'false'
          return (
            <div key={s.key}>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {SETTING_LABELS[s.key] ?? s.key}
              </label>
              {s.description && <p className="text-xs text-slate-500 mb-1.5">{s.description}</p>}
              {isBool ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setValues((v) => ({ ...v, [s.key]: v[s.key] === 'true' ? 'false' : 'true' }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${values[s.key] === 'true' ? 'bg-brand' : 'bg-slate-600'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${values[s.key] === 'true' ? 'translate-x-5' : ''}`} />
                  </button>
                  <span className="text-sm text-slate-300">{values[s.key] === 'true' ? 'Enabled' : 'Disabled'}</span>
                </div>
              ) : (
                <input
                  value={values[s.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                  className="w-full bg-navy-mid border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand/60"
                />
              )}
            </div>
          )
        })}

        <div className="pt-4 border-t border-white/5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
