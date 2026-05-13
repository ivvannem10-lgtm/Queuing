/**
 * SynQueue — Core Queue Engine
 * Handles all queue business logic: generation, priority ordering,
 * smart distribution, transfer, and statistics.
 */
import { prisma } from './db'
import { format } from 'date-fns'
import type { PriorityType, CounterStatus } from '@prisma/client'

// ── Queue Number Generation ──────────────────────────────────────────────────

/**
 * Atomically generates the next queue number for a department.
 * Uses a daily counter stored in DepartmentCounter.
 * Format: REG-001 (regular) | REG-P001 (priority)
 */
export async function generateQueueNumber(
  departmentId: string,
  isPriority: boolean,
): Promise<string> {
  const today  = format(new Date(), 'yyyy-MM-dd')
  const dept   = await prisma.department.findUniqueOrThrow({ where: { id: departmentId } })

  // Upsert counter record and increment atomically
  const counter = await prisma.$transaction(async (tx) => {
    const existing = await tx.departmentCounter.findUnique({
      where: { departmentId_date: { departmentId, date: today } },
    })

    if (!existing) {
      return tx.departmentCounter.create({
        data: {
          departmentId,
          date:            today,
          regularCounter:  isPriority ? 0 : 1,
          priorityCounter: isPriority ? 1 : 0,
        },
      })
    }

    return tx.departmentCounter.update({
      where: { departmentId_date: { departmentId, date: today } },
      data: isPriority
        ? { priorityCounter: { increment: 1 } }
        : { regularCounter:  { increment: 1 } },
    })
  })

  const seq = isPriority ? counter.priorityCounter : counter.regularCounter
  const num = String(seq).padStart(3, '0')

  return isPriority ? `${dept.prefix}-P${num}` : `${dept.prefix}-${num}`
}

// ── Next Queue Selection ─────────────────────────────────────────────────────

/**
 * Determines the next queue to serve for a given department/counter.
 * Priority queues are served first, then regular in FIFO order.
 * Respects the servingRatio from PrioritySettings.
 */
export async function getNextQueue(
  departmentId: string,
  counterId: string,
) {
  // Count how many regular queues have been served since last priority
  const recentServed = await prisma.queue.count({
    where: {
      departmentId,
      counterId,
      status: 'COMPLETED',
      isPriority: false,
      completedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }, // last 10 min
    },
  })

  const prioritySettings = await prisma.prioritySetting.findMany({
    where: { enabled: true },
    orderBy: { priorityLevel: 'asc' },
  })

  const minRatio = prioritySettings.length > 0
    ? Math.min(...prioritySettings.map((p) => p.servingRatio))
    : 2

  const hasPriorityWaiting = await prisma.queue.findFirst({
    where: { departmentId, status: 'WAITING', isPriority: true },
  })

  // Serve priority if waiting and ratio threshold is met
  const servePriority = hasPriorityWaiting && (recentServed >= minRatio || recentServed === 0)

  return prisma.queue.findFirst({
    where: {
      departmentId,
      status:     'WAITING',
      isPriority: servePriority ? true : undefined,
    },
    orderBy: [
      { isPriority: 'desc' },  // priorities first within their group
      { createdAt:  'asc' },   // FIFO
    ],
    include: {
      department: true,
      counter:    true,
    },
  })
}

// ── Queue Transfer ───────────────────────────────────────────────────────────

export async function transferQueue(
  fromQueueId:     string,
  toDepartmentId:  string,
  transferredById: string,
  reason?:         string,
) {
  return prisma.$transaction(async (tx) => {
    const fromQueue = await tx.queue.findUniqueOrThrow({
      where:   { id: fromQueueId },
      include: { department: true },
    })

    const isPriority = fromQueue.isPriority
    const newNumber  = await generateQueueNumber(toDepartmentId, isPriority)

    // Mark original as TRANSFERRED
    const updatedFrom = await tx.queue.update({
      where: { id: fromQueueId },
      data: {
        status:       'TRANSFERRED',
        completedAt:  new Date(),
        isTransferred: true,
      },
    })

    // Create new queue in target department
    const newQueue = await tx.queue.create({
      data: {
        queueNumber:      newNumber,
        clientName:       fromQueue.clientName,
        departmentId:     toDepartmentId,
        status:           'WAITING',
        isPriority:       fromQueue.isPriority,
        priorityType:     fromQueue.priorityType,
        isTransferred:    true,
        transferredFromId: fromQueueId,
      },
      include: { department: true, counter: true, logs: true },
    })

    // Transfer record
    const transfer = await tx.queueTransfer.create({
      data: {
        fromQueueId,
        toQueueId:       newQueue.id,
        fromDepartmentId: fromQueue.departmentId,
        toDepartmentId,
        fromCounterId:   fromQueue.counterId ?? undefined,
        transferredById,
        reason,
      },
    })

    // Logs
    await tx.queueLog.createMany({
      data: [
        { queueId: fromQueueId, action: 'TRANSFERRED', userId: transferredById, details: JSON.stringify({ toQueueId: newQueue.id, reason }) },
        { queueId: newQueue.id, action: 'CREATED_BY_TRANSFER', userId: transferredById, details: JSON.stringify({ fromQueueId, reason }) },
      ],
    })

    return { updatedFrom, newQueue, transfer }
  })
}

// ── Statistics Updater ───────────────────────────────────────────────────────

export async function updateFrontlinerStats(
  userId:     string,
  action:     'SERVED' | 'SKIPPED' | 'TRANSFERRED' | 'CANCELLED',
  servingMs?: number,
) {
  const date = format(new Date(), 'yyyy-MM-dd')

  const data: Record<string, unknown> = {
    userId,
    date,
    totalServed:      action === 'SERVED'      ? { increment: 1 } : undefined,
    totalSkipped:     action === 'SKIPPED'     ? { increment: 1 } : undefined,
    totalTransferred: action === 'TRANSFERRED' ? { increment: 1 } : undefined,
    totalCancelled:   action === 'CANCELLED'   ? { increment: 1 } : undefined,
  }

  // Clean undefined entries
  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k])

  await prisma.frontlinerStatistic.upsert({
    where:  { userId_date: { userId, date } },
    update: data as any,
    create: {
      userId,
      date,
      totalServed:      action === 'SERVED'      ? 1 : 0,
      totalSkipped:     action === 'SKIPPED'     ? 1 : 0,
      totalTransferred: action === 'TRANSFERRED' ? 1 : 0,
      totalCancelled:   action === 'CANCELLED'   ? 1 : 0,
      avgServingMs:     servingMs ?? 0,
    },
  }).catch(() => {})
}

export async function updateCounterStats(
  counterId:  string,
  handlingMs: number,
) {
  const date = format(new Date(), 'yyyy-MM-dd')

  const existing = await prisma.counterStatistic.findUnique({
    where: { counterId_date: { counterId, date } },
  })

  if (!existing) {
    await prisma.counterStatistic.create({
      data: { counterId, date, queuesServed: 1, avgHandlingMs: handlingMs },
    }).catch(() => {})
  } else {
    const newAvg = Math.round(
      (existing.avgHandlingMs * existing.queuesServed + handlingMs) / (existing.queuesServed + 1),
    )
    await prisma.counterStatistic.update({
      where: { counterId_date: { counterId, date } },
      data: { queuesServed: { increment: 1 }, avgHandlingMs: newAvg },
    }).catch(() => {})
  }
}

// ── Smart Counter Assignment ─────────────────────────────────────────────────

/**
 * Find the least-busy active counter in a department for auto-assignment.
 */
export async function getLeastBusyCounter(departmentId: string) {
  const counters = await prisma.counter.findMany({
    where:   { departmentId, status: 'ACTIVE' as CounterStatus },
    include: {
      queues: { where: { status: 'SERVING' } },
    },
  })

  if (!counters.length) return null

  return counters.reduce((least, c) =>
    c.queues.length < least.queues.length ? c : least,
  )
}

// ── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const today    = new Date()
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const [total, waiting, serving, completed, skipped, cancelled, transferred, priorityWaiting] =
    await Promise.all([
      prisma.queue.count({ where: { createdAt: { gte: dayStart } } }),
      prisma.queue.count({ where: { status: 'WAITING' } }),
      prisma.queue.count({ where: { status: 'SERVING' } }),
      prisma.queue.count({ where: { status: 'COMPLETED', createdAt: { gte: dayStart } } }),
      prisma.queue.count({ where: { status: 'SKIPPED',   createdAt: { gte: dayStart } } }),
      prisma.queue.count({ where: { status: 'CANCELLED', createdAt: { gte: dayStart } } }),
      prisma.queue.count({ where: { status: 'TRANSFERRED', createdAt: { gte: dayStart } } }),
      prisma.queue.count({ where: { status: 'WAITING', isPriority: true } }),
    ])

  const activeCounters = await prisma.counter.count({ where: { status: 'ACTIVE' } })

  // Average wait time for completed queues today
  const completedQueues = await prisma.queue.findMany({
    where: {
      status:    'COMPLETED',
      createdAt: { gte: dayStart },
      waitingDurationMs: { not: null },
    },
    select: { waitingDurationMs: true, servingDurationMs: true },
  })

  const avgWaitMs    = completedQueues.length
    ? completedQueues.reduce((s, q) => s + (q.waitingDurationMs ?? 0), 0) / completedQueues.length
    : 0
  const avgServingMs = completedQueues.length
    ? completedQueues.reduce((s, q) => s + (q.servingDurationMs ?? 0), 0) / completedQueues.length
    : 0

  return {
    totalToday:      total,
    waiting,
    serving,
    completed,
    skipped,
    cancelled,
    transferred,
    priorityWaiting,
    activeCounters,
    avgWaitMs:       Math.round(avgWaitMs),
    avgServingMs:    Math.round(avgServingMs),
  }
}
