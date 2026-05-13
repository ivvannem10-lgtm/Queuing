import type { Server as SocketIOServer } from 'socket.io'
import { SOCKET_EVENTS } from '@/types'

/**
 * Get the globally registered Socket.IO instance.
 * Set by server.ts at startup, accessed by API routes.
 */
export function getIO(): SocketIOServer | null {
  return (global as any).__io ?? null
}

// ── Emit helpers (called from API route handlers) ────────────────────────────

export function emitToDisplay(event: string, data: unknown) {
  getIO()?.to('display').emit(event, data)
}

export function emitToAdmin(event: string, data: unknown) {
  getIO()?.to('admin').emit(event, data)
}

export function emitToDepartment(deptId: string, event: string, data: unknown) {
  getIO()?.to(`dept:${deptId}`).emit(event, data)
}

export function emitToCounter(counterId: string, event: string, data: unknown) {
  getIO()?.to(`counter:${counterId}`).emit(event, data)
}

/** Broadcast a queue event to all relevant rooms */
export function broadcastQueueEvent(
  event: keyof typeof SOCKET_EVENTS,
  data: unknown,
  deptId?: string,
  counterId?: string,
) {
  const io = getIO()
  if (!io) return

  const evtName = SOCKET_EVENTS[event]

  io.to('display').emit(evtName, data)
  io.to('admin').emit(evtName, data)
  if (deptId)    io.to(`dept:${deptId}`).emit(evtName, data)
  if (counterId) io.to(`counter:${counterId}`).emit(evtName, data)
}
