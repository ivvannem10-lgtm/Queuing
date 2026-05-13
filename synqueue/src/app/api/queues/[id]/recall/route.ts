import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { broadcastQueueEvent } from '@/lib/socket'
import { ok, err, unauthorized } from '@/lib/utils'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return unauthorized()

  const { id } = await params
  const queue  = await prisma.queue.findUnique({ where: { id } })
  if (!queue || queue.status !== 'SERVING') return err('Queue is not currently serving')

  await prisma.queueLog.create({
    data: { queueId: id, action: 'RECALLED', userId: session.user.id, counterId: queue.counterId ?? undefined },
  })

  broadcastQueueEvent('QUEUE_CALLED', { queue, counterName: 'Recall' }, queue.departmentId, queue.counterId ?? undefined)
  return ok({ recalled: true, queueNumber: queue.queueNumber })
}
