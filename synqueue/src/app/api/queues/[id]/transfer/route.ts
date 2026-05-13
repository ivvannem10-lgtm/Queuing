import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { transferQueue, updateFrontlinerStats } from '@/lib/queue-engine'
import { broadcastQueueEvent } from '@/lib/socket'
import { ok, err, unauthorized, audit } from '@/lib/utils'
import { z } from 'zod'

const Schema = z.object({
  toDepartmentId: z.string(),
  reason:         z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return unauthorized()

  const { id }  = await params
  const body    = await req.json()
  const parsed  = Schema.safeParse(body)
  if (!parsed.success) return err(parsed.error.message)

  try {
    const result = await transferQueue(id, parsed.data.toDepartmentId, session.user.id, parsed.data.reason)

    await updateFrontlinerStats(session.user.id, 'TRANSFERRED')
    broadcastQueueEvent('QUEUE_TRANSFERRED', result, result.newQueue.departmentId)
    broadcastQueueEvent('QUEUE_UPDATED', { queue: result.updatedFrom }, result.updatedFrom.departmentId)
    audit('TRANSFER', 'Queue', id, session.user.id, { toDepartmentId: parsed.data.toDepartmentId })

    return ok(result)
  } catch (e: any) {
    return err(e.message ?? 'Transfer failed', 500)
  }
}
