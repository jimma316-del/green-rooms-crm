export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { StockClient } from '@/components/stock/StockClient'

export default async function StockPage() {
  const admin = createAdminClient()

  const [{ data: items }, { data: notesRow }] = await Promise.all([
    admin.from('stock_items').select('*').order('order_index', { ascending: true }),
    admin.from('stock_notes').select('notes').eq('id', 1).single(),
  ])

  return (
    <div className="px-4 md:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track what needs reordering</p>
      </div>
      <StockClient
        initialItems={items ?? []}
        initialNotes={notesRow?.notes ?? ''}
      />
    </div>
  )
}
