'use client'

import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, KeyRound } from 'lucide-react'

interface Props {
  children: React.ReactNode
  userName: string
}

export function SiteShell({ children, userName }: Props) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1a4731] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="The Green Rooms" width={24} height={24} className="rounded" />
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
      <main>{children}</main>
    </div>
  )
}
