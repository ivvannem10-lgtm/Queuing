'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Printer, Info } from 'lucide-react'

interface Setting { key: string; value: string; description: string | null }

const SETTING_LABELS: Record<string, string> = {
  institution_name:   'Institution Name',
  queue_reset_time:   'Queue Reset Time (HH:mm)',
  max_queue_per_dept: 'Max Queues per Department / Day',
  sound_alerts:       'Enable Sound Alerts',
  display_theme:      'Display Theme',
  auto_print:         'Auto-Print Queue Tickets',
}

const SETTING_DESCRIPTIONS: Record<string, string> = {
  auto_print: 'Automatically open the print dialog when a client receives a queue number.',
}

// Settings that should always appear even if not yet in the DB
const DEFAULT_SETTINGS: Setting[] = [
  { key: 'auto_print', value: 'false', description: 'Automatically open the print dialog when a client receives a queue number.' },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [values,   setValues]   = useState<Record<string, string>>({})
  const [saved,    setSaved]    = useState(false)

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((j) => {
      const fromDb: Setting[] = j.data ?? []
      // Merge: DB settings + any defaults not yet in DB
      const keys = new Set(fromDb.map((s) => s.key))
      const merged = [...fromDb, ...DEFAULT_SETTINGS.filter((s) => !keys.has(s.key))]
      setSettings(merged)
      setValues(Object.fromEntries(merged.map((x) => [x.key, x.value])))
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
          const isBool = values[s.key] === 'true' || values[s.key] === 'false'
          const desc   = SETTING_DESCRIPTIONS[s.key] ?? s.description
          return (
            <div key={s.key}>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {SETTING_LABELS[s.key] ?? s.key}
              </label>
              {desc && <p className="text-xs text-slate-500 mb-1.5">{desc}</p>}
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

      {/* Printer setup guide */}
      <div className="glass p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Printer size={16} className="text-brand-light" />
          <h2 className="font-semibold text-white">Printer / Kiosk Setup</h2>
        </div>

        <div className="flex gap-2 bg-brand/8 border border-brand/20 rounded-lg px-4 py-3">
          <Info size={14} className="text-brand-light flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            When <strong className="text-white">Auto-Print</strong> is enabled, the browser print dialog opens automatically each time a client gets a queue number. The browser remembers the last selected printer — instruct your kiosk operator to select the correct printer once and it will be used for all future tickets.
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <p className="text-slate-400 font-medium text-xs uppercase tracking-wider">Setup steps for kiosk / receipt printer</p>
          {[
            { step: '1', text: 'Enable Auto-Print above and save.' },
            { step: '2', text: 'Open the queue page (/queue) on the kiosk device.' },
            { step: '3', text: 'Generate a test ticket — the print dialog will open.' },
            { step: '4', text: 'Select your receipt or A4 printer and click Print.' },
            { step: '5', text: 'The browser remembers this choice for all future tickets.' },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-brand/15 text-brand-light text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {step}
              </div>
              <p className="text-slate-300 text-sm">{text}</p>
            </div>
          ))}
        </div>

        <div className="bg-navy-mid border border-white/5 rounded-lg px-4 py-3">
          <p className="text-xs text-slate-400">
            <strong className="text-slate-300">Silent printing (no dialog):</strong> Set your OS default printer, then in Chrome go to <span className="font-mono text-brand-light">chrome://settings/content/pdfDocuments</span> and enable <em>Download PDFs</em>. For fully silent kiosk printing, launch Chrome with the <span className="font-mono text-brand-light">--kiosk-printing</span> flag.
          </p>
        </div>
      </div>
    </div>
  )
}
