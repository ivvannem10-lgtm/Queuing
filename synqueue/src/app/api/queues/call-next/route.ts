import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getNextQueue } from '@/lib/queue-engine'
import { broadcastQueueEvent } from '@/lib/socket'
import { ok, err, unauthorized, audit } from '@/lib/utils'
import { z } from 'zod'

const Schema = z.object({
  departmentId: z.string(),
  counterId:    z.string(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return unauthorized()

  const body   = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return err(parsed.error.message)

  const { departmentId, counterId } = parsed.data

  // Get next queue (respects priority settings)
  const next = await getNextQueue(departmentId, counterId)
  if (!next) return err('No queues waiting', 404)

  const now = new Date()

  const updated = await prisma.queue.update({
    where: { id: next.id },
    data: {
      status:          'SERVING',
      counterId,
      calledAt:        now,
      servingStartedAt: now,
      waitingDurationMs: now.getTime() - new Date(next.createdAt).getTime(),
    },
    include: { department: true, counter: { include: { staff: true } }, logs: true },
  })

  await prisma.queueLog.create({
    data: {
      queueId:  updated.id,
      action:   'CALLED',
      userId:   session.user.id,
      counterId,
    },
  })

  const counter = await prisma.counter.findUnique({ where: { id: counterId } })

  broadcastQueueEvent('QUEUE_CALLED', { queue: updated, counterName: counter?.name }, departmentId, counterId)
  audit('CALL', 'Queue', updated.id, session.user.id, { queueNumber: updated.queueNumber, counterId })

  return ok(updated)
}
