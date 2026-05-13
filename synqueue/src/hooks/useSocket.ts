'use client'

import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSocketOptions {
  rooms?:  string[]
  events?: Record<string, (...args: any[]) => void>
}

export function useSocket({ rooms = [], events = {} }: UseSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null)

  const emit = useCallback((event: string, ...args: any[]) => {
    socketRef.current?.emit(event, ...args)
  }, [])

  useEffect(() => {
    const socket = io({ path: '/api/socket', transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      rooms.forEach((room) => socket.emit(room.startsWith('dept:') ? 'join:department' : 'join:counter', room.split(':')[1]))
    })

    Object.entries(events).forEach(([event, handler]) => {
      socket.on(event, handler)
    })

    return () => {
      socket.disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { emit, socket: socketRef.current }
}
