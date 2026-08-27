export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getXeroStatus } from '@/lib/xero'
import { XeroSettings } from '@/components/xero/XeroSettings'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ connected?: string; error?: string }>
}

export default async function XeroSettingsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('role').eq('id', user!.id).single()

  if (profile?.role === 'site') {
    return (
      <div className="px-4 md:px-6 py-6 max-w-2xl">
        <p className="text-sm text-gray-500">Admin access required to manage integrations.</p>
      </div>
    )
  }

  const status = await getXeroStatus()
  const params = await searchParams

  return (
    <div className="px-4 md:px-6 py-6 max-w-2xl">
      <Link href="/settings" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-5 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" />
        Settings
      </Link>

      <div className="flex items-center gap-3 mb-6">
        {/* Xero blue dot */}
        <div className="w-9 h-9 rounded-xl bg-[#13B5EA] flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">X</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Xero Integration</h1>
          <p className="text-xs text-gray-400">Connect your accounting data for financial reporting</p>
        </div>
      </div>

      <XeroSettings
        connected={status.connected}
        orgName={status.orgName}
        connectedAt={status.connectedAt}
        lastSyncAt={status.lastSyncAt}
        lastSyncError={status.lastSyncError}
        tokenExpiresAt={status.tokenExpiresAt}
        flashError={params.error ?? null}
        flashConnected={params.connected === '1'}
      />
    </div>
  )
}
