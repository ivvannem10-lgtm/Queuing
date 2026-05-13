'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import type { Role } from '@/types'
import {
  LayoutDashboard, Building2, Monitor, Users, BarChart2,
  Shield, Settings, LogOut, Tv, Layers, ChevronRight, Briefcase, ClipboardList,
} from 'lucide-react'

interface NavItem {
  href:  string
  label: string
  icon:  React.ElementType
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin',             label: 'Dashboard',   icon: LayoutDashboard, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { href: '/admin/brands',      label: 'Brands',      icon: Briefcase,       roles: ['SUPER_ADMIN'] },
  { href: '/admin/departments', label: 'Departments', icon: Building2,       roles: ['ADMIN', 'SUPER_ADMIN'] },
  { href: '/admin/counters',    label: 'Counters',    icon: Monitor,         roles: ['ADMIN', 'SUPER_ADMIN'] },
  { href: '/admin/users',       label: 'Users',       icon: Users,           roles: ['ADMIN', 'SUPER_ADMIN'] },
  { href: '/admin/records',     label: 'Records',     icon: ClipboardList,   roles: ['ADMIN', 'SUPER_ADMIN'] },
  { href: '/admin/reports',     label: 'Reports',     icon: BarChart2,       roles: ['ADMIN', 'SUPER_ADMIN'] },
  { href: '/admin/audit-logs',  label: 'Audit Logs',  icon: Shield,          roles: ['SUPER_ADMIN'] },
  { href: '/admin/settings',    label: 'Settings',    icon: Settings,        roles: ['ADMIN', 'SUPER_ADMIN'] },
]

const QUICK_LINKS = [
  { href: '/queue',   label: 'Queue Page',    icon: Layers },
  { href: '/display', label: 'Live Display',  icon: Tv },
  { href: '/staff',   label: 'Staff Console', icon: Monitor },
]

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname()

  return (
    <aside className="w-60 flex-shrink-0 border-r border-white/5 bg-navy-mid flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center text-white font-black text-sm shadow-lg shadow-brand/40">
          Q
        </div>
        <div>
          <div className="font-bold text-white text-sm leading-tight">SynQueue</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Admin Panel</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => {
          const active = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group',
                active
                  ? 'bg-brand text-white shadow-md shadow-brand/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5',
              )}
            >
              <item.icon size={16} className={active ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
              {item.label}
              {active && <ChevronRight size={12} className="ml-auto" />}
            </Link>
          )
        })}

        <div className="pt-4 pb-1">
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-1">Quick Links</div>
          {QUICK_LINKS.map((link) => (
            <Link key={link.href} href={link.href} target="_blank"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-white/4 transition"
            >
              <link.icon size={13} />
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition"
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
