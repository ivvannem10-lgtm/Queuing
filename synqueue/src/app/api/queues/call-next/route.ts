import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
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
  const now = new Date()

  // Atomic transaction: find + update in one step so two counters
  // under the same department never get assigned the same ticket.
  const updated = await prisma.$transaction(async (tx) => {
    // Priority ratio logic (inline so it runs inside the transaction)
    const prioritySettings = await tx.prioritySetting.findMany({
      where:   { enabled: true },
      orderBy: { priorityLevel: 'asc' },
    })
    const minRatio = prioritySettings.length > 0
      ? Math.min(...prioritySettings.map((p) => p.servingRatio))
      : 2

    const recentServed = await tx.queue.count({
      where: {
        departmentId,
        counterId,
        status:     'COMPLETED',
        isPriority: false,
        completedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
    })

    const hasPriorityWaiting = await tx.queue.findFirst({
      where: { departmentId, status: 'WAITING', isPriority: true },
    })

    const servePriority = hasPriorityWaiting && (recentServed >= minRatio || recentServed === 0)

    const next = await tx.queue.findFirst({
      where: {
        departmentId,
        status:     'WAITING',
        isPriority: servePriority ? true : undefined,
      },
      orderBy: [{ isPriority: 'desc' }, { createdAt: 'asc' }],
    })

    if (!next) return null

    return tx.queue.update({
      where:   { id: next.id },
      data:    {
        status:            'SERVING',
        counterId,
        calledAt:          now,
        servingStartedAt:  now,
        waitingDurationMs: now.getTime() - new Date(next.createdAt).getTime(),
      },
      include: { department: true, counter: { include: { staff: true } }, logs: true },
    })
  })

  if (!updated) return err('No queues waiting', 404)

  await prisma.queueLog.create({
    data: { queueId: updated.id, action: 'CALLED', userId: session.user.id, counterId },
  })

  const counter = await prisma.counter.findUnique({ where: { id: counterId } })

  broadcastQueueEvent('QUEUE_CALLED', { queue: updated, counterName: counter?.name }, departmentId, counterId)
  audit('CALL', 'Queue', updated.id, session.user.id, { queueNumber: updated.queueNumber, counterId })

  return ok(updated)
}
