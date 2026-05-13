import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { ok, notFound, unauthorized, audit } from '@/lib/utils'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) return unauthorized()

  const { id }                          = await params
  const { password, departmentIds, ...rest } = await req.json()

  const data: Record<string, unknown> = { ...rest }
  if (password) data.password = await bcrypt.hash(password, 12)

  const user = await prisma.user.update({ where: { id }, data }).catch(() => null)
  if (!user) return notFound('User')

  if (Array.isArray(departmentIds)) {
    await prisma.userDepartment.deleteMany({ where: { userId: id } })
    if (departmentIds.length) {
      await prisma.userDepartment.createMany({
        data: departmentIds.map((dId: string) => ({ userId: id, departmentId: dId })),
      })
    }
  }

  audit('UPDATE', 'User', user.id, session.user.id, { fields: Object.keys(rest) })
  return ok({ ...user, password: undefined })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPER_ADMIN') return unauthorized()

  const { id } = await params
  await prisma.user.update({ where: { id }, data: { isActive: false } })
  audit('DELETE', 'User', id, session.user.id)

  return ok({ deleted: true })
}
