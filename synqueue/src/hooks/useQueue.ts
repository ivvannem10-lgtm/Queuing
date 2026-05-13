'use client'

import { useState, useEffect, useCallback } from 'react'
import type { QueueWithRelations } from '@/types'

interface UseQueueOptions {
  departmentId?: string
  counterId?:    string
  statuses?:     string[]
  autoRefresh?:  number // interval ms, 0 = no auto-refresh
}

export function useQueue({
  departmentId,
  counterId,
  statuses = ['WAITING'],
  autoRefresh = 0,
}: UseQueueOptions) {
  const [queues,  setQueues]  = useState<QueueWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (departmentId) params.set('departmentId', departmentId)
    if (counterId)    params.set('counterId',    counterId)
    if (statuses.length) params.set('status', statuses.join(','))

    const res = await fetch(`/api/queues?${params}`).catch(() => null)
    if (!res?.ok) { setError('Failed to load queues'); return }

    const json = await res.json()
    setQueues(json.data ?? [])
    setLoading(false)
  }, [departmentId, counterId, statuses.join(',')])

  useEffect(() => {
    load()
    if (!autoRefresh) return
    const id = setInterval(load, autoRefresh)
    return () => clearInterval(id)
  }, [load, autoRefresh])

  return { queues, loading, error, refresh: load }
}
