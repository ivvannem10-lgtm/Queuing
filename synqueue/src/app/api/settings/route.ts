import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ok, unauthorized } from '@/lib/utils'

export async function GET() {
  const settings = await prisma.systemSetting.findMany({ orderBy: { key: 'asc' } })
  return ok(settings)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) return unauthorized()

  const { settings } = await req.json()

  for (const [key, value] of Object.entries(settings)) {
    await prisma.systemSetting.upsert({
      where:  { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })
  }

  return ok({ updated: true })
}
