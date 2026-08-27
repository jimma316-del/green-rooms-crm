export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { FinanceDashboard } from '@/components/finance/FinanceDashboard'
import Link from 'next/link'

export default async function FinancePage() {
  const admin = createAdminClient()

  const { data: connection } = await admin
    .from('xero_connection')
    .select('org_name, last_sync_at, last_sync_error')
    .eq('id', 1)
    .single()

  if (!connection) {
    return (
      <div className="px-4 md:px-6 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Finance</h1>
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center mt-6">
          <p className="text-gray-500 text-sm mb-3">Xero is not connected.</p>
          <Link href="/settings/xero" className="text-sm font-medium text-[var(--primary)] hover:underline">
            Connect Xero in Settings →
          </Link>
        </div>
      </div>
    )
  }

  const { data: cacheRows } = await admin
    .from('xero_financial_cache')
    .select('period, account_name, net_amount_pence')
    .order('period')

  return (
    <FinanceDashboard
      connection={connection}
      cacheRows={cacheRows ?? []}
    />
  )
}
