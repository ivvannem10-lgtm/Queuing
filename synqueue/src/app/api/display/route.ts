import { prisma } from '@/lib/db'
import { ok } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  const departments = await prisma.department.findMany({
    where:   { status: 'ACTIVE' },
    orderBy: { sortOrder: 'asc' },
  })

  const deptDisplays = await Promise.all(
    departments.map(async (dept) => {
      const [serving, nextUp, waiting] = await Promise.all([
        prisma.queue.findFirst({
          where:   { departmentId: dept.id, status: 'SERVING' },
          include: { department: true, counter: true, logs: true },
          orderBy: { calledAt: 'desc' },
        }),
        prisma.queue.findFirst({
          where:   { departmentId: dept.id, status: 'WAITING' },
          include: { department: true, counter: true, logs: true },
          orderBy: [{ isPriority: 'desc' }, { createdAt: 'asc' }],
        }),
        prisma.queue.count({
          where: { departmentId: dept.id, status: 'WAITING' },
        }),
      ])

      return { department: dept, serving, nextUp, waiting }
    }),
  )

  return ok(deptDisplays)
}
