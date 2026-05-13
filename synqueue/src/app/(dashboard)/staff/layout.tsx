import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export const metadata = { title: { template: '%s | Staff — SynQueue' } }

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role === 'CLIENT') redirect('/queue')

  return (
    <div className="min-h-screen bg-navy-deep">
      {children}
    </div>
  )
}
