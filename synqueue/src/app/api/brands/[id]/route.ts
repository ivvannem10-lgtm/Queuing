import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ok, err, unauthorized, audit } from '@/lib/utils'
import { z } from 'zod'

const UpdateSchema = z.object({
  name:        z.string().min(1).max(100).optional(),
  logoUrl:     z.string().url().optional().or(z.literal('')),
  accentColor: z.string().optional(),
  userLimit:   z.number().int().min(1).max(500).optional(),
  isActive:    z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPER_ADMIN') return unauthorized()

  const { id }  = await params
  const body    = await req.json()
  const parsed  = UpdateSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.message)

  const brand = await prisma.brand.update({
    where: { id },
    data:  {
      ...(parsed.data.name        !== undefined && { name:        parsed.data.name }),
      ...(parsed.data.logoUrl     !== undefined && { logoUrl:     parsed.data.logoUrl || null }),
      ...(parsed.data.accentColor !== undefined && { accentColor: parsed.data.accentColor }),
      ...(parsed.data.userLimit   !== undefined && { userLimit:   parsed.data.userLimit }),
      ...(parsed.data.isActive    !== undefined && { isActive:    parsed.data.isActive }),
    },
  })

  audit('UPDATE', 'Brand', brand.id, session.user.id, { name: brand.name })
  return ok(brand)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPER_ADMIN') return unauthorized()

  const { id } = await params

  // Deactivate instead of hard delete to preserve queue history
  const brand = await prisma.brand.update({
    where: { id },
    data:  { isActive: false },
  })

  audit('DELETE', 'Brand', brand.id, session.user.id, { name: brand.name })
  return ok({ deactivated: true })
}
