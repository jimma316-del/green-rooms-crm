'use client'

import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, KeyRound, HardHat, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  children: React.ReactNode
  userName: string
}

const siteNav = [
  { href: '/jobs', label: 'Jobs', icon: HardHat },
  { href: '/stock', label: 'Stock', icon: Package },
]

export function SiteShell({ children, userName }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[var(--brand-header)] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="The Green Rooms" width={24} height={24} className="rounded" />
          <span className="font-semibold text-sm">The Green Rooms</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/60">{userName}</span>
          <Link
            href="/auth/set-password"
            className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            Change password
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>
      <nav className="bg-white border-b border-gray-200 px-4 flex gap-1">
        {siteNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <a
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                active
                  ? 'border-[var(--brand-header)] text-[var(--brand-header)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </a>
          )
        })}
      </nav>
      <main>{children}</main>
    </div>
  )
}
