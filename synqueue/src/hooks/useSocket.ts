'use client'

import { useEffect } from 'react'
import Pusher from 'pusher-js'

interface UseSocketOptions {
  channels?: string[]
  events?:   Record<string, (...args: any[]) => void>
}

export function useSocket({ channels = [], events = {} }: UseSocketOptions = {}) {
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })

    const subs = channels.map((ch) => {
      const channel = pusher.subscribe(ch)
      Object.entries(events).forEach(([event, handler]) => {
        channel.bind(event, handler)
      })
      return channel
    })

    return () => {
      subs.forEach((ch) => ch.unbind_all())
      pusher.disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
