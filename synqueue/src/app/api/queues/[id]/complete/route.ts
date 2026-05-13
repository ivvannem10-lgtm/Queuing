import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { updateFrontlinerStats, updateCounterStats } from '@/lib/queue-engine'
import { broadcastQueueEvent } from '@/lib/socket'
import { ok, err, unauthorized, audit } from '@/lib/utils'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return unauthorized()

  const { id }  = await params
  const queue   = await prisma.queue.findUnique({ where: { id } })
  if (!queue || queue.status !== 'SERVING') return err('Queue not in serving state')

  const now       = new Date()
  const servingMs = queue.servingStartedAt
    ? now.getTime() - new Date(queue.servingStartedAt).getTime()
    : 0

  const updated = await prisma.queue.update({
    where: { id },
    data:  { status: 'COMPLETED', completedAt: now, servingDurationMs: servingMs },
    include: { department: true, counter: true, logs: true },
  })

  await prisma.queueLog.create({
    data: { queueId: id, action: 'COMPLETED', userId: session.user.id, counterId: queue.counterId ?? undefined },
  })

  if (queue.counterId) {
    await updateFrontlinerStats(session.user.id, 'SERVED', servingMs)
    await updateCounterStats(queue.counterId, servingMs)
  }

  broadcastQueueEvent('QUEUE_UPDATED', { queue: updated }, queue.departmentId, queue.counterId ?? undefined)
  audit('COMPLETE', 'Queue', id, session.user.id)

  return ok(updated)
}
