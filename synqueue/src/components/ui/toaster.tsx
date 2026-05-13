'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id:      string
  message: string
  type:    ToastType
}

interface ToastCtx {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  // Expose globally
  useEffect(() => {
    ;(window as any).__synqueue_toast = addToast
  }, [addToast])

  const ICONS = {
    success: <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />,
    error:   <XCircle     size={16} className="text-red-400 flex-shrink-0" />,
    info:    <AlertCircle size={16} className="text-blue-400 flex-shrink-0" />,
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{   opacity: 0, y: 10,  scale: 0.95 }}
              className="flex items-center gap-3 bg-navy-card border border-white/10 rounded-xl px-4 py-3 shadow-2xl"
            >
              {ICONS[t.type]}
              <p className="text-sm text-slate-200 flex-1">{t.message}</p>
              <button onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))} className="text-slate-500 hover:text-white transition">
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

// Global helper (for use outside React tree)
export function showToast(message: string, type: ToastType = 'success') {
  ;(window as any).__synqueue_toast?.(message, type)
}
