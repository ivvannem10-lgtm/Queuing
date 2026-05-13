import { pusherServer } from './pusher'
import { SOCKET_EVENTS } from '@/types'

export function emitToDisplay(event: string, data: unknown) {
  pusherServer.trigger('display', event, data as object).catch(() => {})
}

export function emitToAdmin(event: string, data: unknown) {
  pusherServer.trigger('admin', event, data as object).catch(() => {})
}

export function emitToDepartment(deptId: string, event: string, data: unknown) {
  pusherServer.trigger(`dept-${deptId}`, event, data as object).catch(() => {})
}

export function emitToCounter(counterId: string, event: string, data: unknown) {
  pusherServer.trigger(`counter-${counterId}`, event, data as object).catch(() => {})
}

export function broadcastQueueEvent(
  event:     keyof typeof SOCKET_EVENTS,
  data:      unknown,
  deptId?:   string,
  counterId?: string,
) {
  const evtName  = SOCKET_EVENTS[event]
  const channels = ['display', 'admin']
  if (deptId)    channels.push(`dept-${deptId}`)
  if (counterId) channels.push(`counter-${counterId}`)

  pusherServer.triggerBatch(
    channels.map((channel) => ({ channel, name: evtName, data: JSON.stringify(data) })),
  ).catch(() => {})
}
