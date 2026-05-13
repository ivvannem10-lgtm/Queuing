import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateQueueNumber } from '@/lib/queue-engine'
import { broadcastQueueEvent } from '@/lib/socket'
import { ok, err, audit } from '@/lib/utils'
import { z } from 'zod'

const CreateSchema = z.object({
  departmentId: z.string().min(1),
  clientName:   z.string().optional().nullable(),
  priorityType: z.enum(['NONE', 'SENIOR_CITIZEN', 'PWD', 'PREGNANT', 'VIP']).default('NONE'),
  isPriority:   z.boolean().default(false),
})

// ── POST /api/queues — Create new queue ticket ───────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const parsed = CreateSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.message)

    const { departmentId, clientName, priorityType, isPriority } = parsed.data

    const dept = await prisma.department.findFirst({
      where: { id: departmentId, status: 'ACTIVE' },
    })
    if (!dept) return err('Department not found or inactive', 404)

    const queueNumber = await generateQueueNumber(departmentId, isPriority)

    const queue = await prisma.queue.create({
      data: {
        queueNumber,
        clientName:   clientName ?? null,
        departmentId,
        isPriority,
        priorityType,
        status: 'WAITING',
      },
      include: { department: true, counter: true, logs: true },
    })

    await prisma.queueLog.create({
      data: { queueId: queue.id, action: 'CREATED', details: JSON.stringify({ clientName, priorityType }) },
    })

    // Count position
    const position = await prisma.queue.count({
      where: { departmentId, status: 'WAITING', createdAt: { lt: queue.createdAt } },
    })

    const dept2        = await prisma.department.findUnique({ where: { id: departmentId } })
    const avgServingMs = 3 * 60 * 1000 // default 3 min
    const waitMins     = Math.ceil((position + 1) * (avgServingMs / 60000))
    const estimatedWait = waitMins <= 1 ? '< 1 min' : `~${waitMins} mins`

    broadcastQueueEvent('QUEUE_CREATED', { queue }, departmentId)
    audit('CREATE', 'Queue', queue.id, undefined, { queueNumber, departmentId })

    return ok({ ...queue, position: position + 1, estimatedWait })
  } catch (e) {
    console.error(e)
    return err('Failed to create queue', 500)
  }
}

// ── GET /api/queues — List queues ────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const departmentId     = searchParams.get('departmentId')
  const counterId        = searchParams.get('counterId')
  const statusRaw        = searchParams.get('status')
  const limit            = parseInt(searchParams.get('limit') ?? '50')
  const statuses         = statusRaw?.split(',') ?? []

  const where: any = {}
  if (departmentId) where.departmentId = departmentId
  if (counterId)    where.counterId    = counterId
  if (statuses.length) where.status    = { in: statuses }

  const queues = await prisma.queue.findMany({
    where,
    include: { department: true, counter: { include: { staff: true } } },
    orderBy: [{ isPriority: 'desc' }, { createdAt: 'asc' }],
    take:    limit,
  })

  return ok(queues)
}
