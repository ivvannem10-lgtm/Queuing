import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ok, err, unauthorized, notFound, audit } from '@/lib/utils'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) return unauthorized()

  const { id } = await params
  const body   = await req.json()

  const dept = await prisma.department.update({
    where: { id },
    data:  body,
  }).catch(() => null)

  if (!dept) return notFound('Department')
  audit('UPDATE', 'Department', dept.id, session.user.id, body)

  return ok(dept)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) return unauthorized()

  const { id } = await params

  // Soft-delete: mark inactive and remove from active views
  const dept = await prisma.department.update({
    where: { id },
    data:  { status: 'INACTIVE' },
  }).catch(() => null)

  if (!dept) return notFound('Department')
  audit('DELETE', 'Department', id, session.user.id)

  return ok({ deleted: true })
}
