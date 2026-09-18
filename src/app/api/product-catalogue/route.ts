import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/product-catalogue
// Returns all active products grouped by category
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('product_catalogue')
    .select('id, category, sku, name, description, unit, base_price_pence, vat_rate, sort_order')
    .eq('is_active', true)
    .order('category')
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by category for easy rendering in the picker
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grouped: Record<string, any[]> = {}
  for (const product of data ?? []) {
    if (!grouped[product.category]) grouped[product.category] = []
    grouped[product.category].push(product)
  }

  return NextResponse.json({ products: data ?? [], grouped })
}
