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

  // All data from cache — no live Xero calls on page load
  const [cacheResult, liveResult] = await Promise.all([
    admin.from('xero_financial_cache').select('period, account_name, account_type, net_amount_pence').order('period'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('xero_live_cache').select('key, value'),
  ])

  const cacheRows = cacheResult.data ?? []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const liveRows: { key: string; value: any }[] = liveResult.data ?? []
  const liveMap = Object.fromEntries(liveRows.map((r: { key: string; value: unknown }) => [r.key, r.value]))

  type OutstandingInvoice = {
    id: string; contact: string; invoiceNumber: string
    dueDate: string | null; amountDuePence: number; totalPence: number; daysOverdue: number
  }
  type SupplierSpend = { contact: string; totalPence: number; count: number }
  type InvoiceMetrics = { avgInvoiceValuePence: number; avgDaysToPay: number | null }

  const outstanding: OutstandingInvoice[] = Array.isArray(liveMap['outstanding']) ? liveMap['outstanding'] : []
  const supplierSpend: SupplierSpend[] = Array.isArray(liveMap['supplier_spend']) ? liveMap['supplier_spend'] : []
  const metricsRaw = liveMap['invoice_metrics']
  const metrics: InvoiceMetrics = metricsRaw && typeof metricsRaw === 'object'
    ? metricsRaw as InvoiceMetrics
    : { avgInvoiceValuePence: 0, avgDaysToPay: null }

  return (
    <FinanceDashboard
      connection={connection}
      cacheRows={cacheRows}
      outstanding={outstanding}
      supplierSpend={supplierSpend}
      avgInvoiceValuePence={metrics.avgInvoiceValuePence}
      avgDaysToPay={metrics.avgDaysToPay}
      bankFeedsConnected={false}
      bankByMonth={{}}
    />
  )
}
