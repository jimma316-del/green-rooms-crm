'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, KanbanSquare,
  Settings, LogOut, BarChart3, HardHat, Package, PoundSterling
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads',      label: 'All Leads',  icon: Users },
  { href: '/pipeline',   label: 'Pipeline',   icon: KanbanSquare },
  { href: '/jobs',       label: 'Jobs',       icon: HardHat },
  { href: '/stock',      label: 'Stock',      icon: Package },

  { href: '/reports',    label: 'Reports',    icon: BarChart3 },
  { href: '/finance',    label: 'Finance',    icon: PoundSterling },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="hidden md:flex flex-col w-56 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[var(--sidebar-border)]">
        <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <Image src="/logo.png" alt="The Green Rooms" width={32} height={32} className="rounded-lg" />
          <div>
            <p className="text-sm font-semibold leading-tight">The Green Rooms</p>
            <p className="text-[10px] text-[var(--sidebar-foreground)]/50 leading-tight">CRM</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-primary)]'
                  : 'text-[var(--sidebar-foreground)]/70 hover:bg-[var(--sidebar-accent)]/60 hover:text-[var(--sidebar-foreground)]'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-[var(--sidebar-border)] space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-primary)]'
              : 'text-[var(--sidebar-foreground)]/70 hover:bg-[var(--sidebar-accent)]/60 hover:text-[var(--sidebar-foreground)]'
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          Settings
        </Link>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--sidebar-foreground)]/70 hover:bg-[var(--sidebar-accent)]/60 hover:text-[var(--sidebar-foreground)] transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
