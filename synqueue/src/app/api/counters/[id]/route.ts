import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { broadcastQueueEvent } from '@/lib/socket'
import { ok, err, unauthorized, audit } from '@/lib/utils'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return unauthorized()

  const { id } = await params
  const body   = await req.json()

  const counter = await prisma.counter.update({
    where:   { id },
    data:    body,
    include: { department: true, staff: true },
  }).catch(() => null)

  if (!counter) return err('Counter not found', 404)

  broadcastQueueEvent('COUNTER_UPDATED', { counter }, counter.departmentId, counter.id)
  audit('UPDATE', 'Counter', counter.id, session.user.id, body)

  return ok(counter)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) return unauthorized()

  const { id } = await params
  await prisma.counter.update({ where: { id }, data: { isActive: false } })
  audit('DELETE', 'Counter', id, session.user.id)

  return ok({ deleted: true })
}
