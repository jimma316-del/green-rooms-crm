export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { StockClient } from '@/components/stock/StockClient'

export default async function StockPage() {
  const admin = createAdminClient()

  const [{ data: items, error: itemsError }, { data: notesRow }] = await Promise.all([
    admin.from('stock_items').select('*').order('order_index', { ascending: true }),
    admin.from('stock_notes').select('notes').eq('id', 1).single(),
  ])

  return (
    <div className="px-4 md:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track what needs reordering</p>
      </div>
      {itemsError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-mono">
          Error: {itemsError.message} (code: {itemsError.code})
        </div>
      )}
      <StockClient
        initialItems={items ?? []}
        initialNotes={notesRow?.notes ?? ''}
      />
    </div>
  )
}
