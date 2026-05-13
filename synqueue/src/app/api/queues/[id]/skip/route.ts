import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { updateFrontlinerStats } from '@/lib/queue-engine'
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
  if (!queue || !['SERVING', 'WAITING'].includes(queue.status)) return err('Cannot skip this queue')

  const updated = await prisma.queue.update({
    where: { id },
    data:  { status: 'SKIPPED', completedAt: new Date() },
    include: { department: true, counter: true, logs: true },
  })

  await prisma.queueLog.create({
    data: { queueId: id, action: 'SKIPPED', userId: session.user.id, counterId: queue.counterId ?? undefined },
  })

  await updateFrontlinerStats(session.user.id, 'SKIPPED')
  broadcastQueueEvent('QUEUE_UPDATED', { queue: updated }, queue.departmentId, queue.counterId ?? undefined)
  audit('SKIP', 'Queue', id, session.user.id)

  return ok(updated)
}
