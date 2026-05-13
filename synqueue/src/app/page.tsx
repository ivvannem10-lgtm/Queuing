import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const role = session.user.role
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') redirect('/admin')
  if (role === 'STAFF') redirect('/staff')
  redirect('/queue')
}
