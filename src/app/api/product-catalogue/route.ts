import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'

// GET /api/product-catalogue — returns all products (active + inactive for admin, active-only otherwise)
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const all = req.nextUrl.searchParams.get('all') === 'true'

  let query = adminAny
    .from('product_catalogue')
    .select('id, category, sku, name, description, unit, base_price_pence, vat_rate, sort_order, is_active, is_size_banded, created_at')
    .order('category')
    .order('sort_order')

  if (!all) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grouped: Record<string, any[]> = {}
  for (const product of data ?? []) {
    if (!grouped[product.category]) grouped[product.category] = []
    grouped[product.category].push(product)
  }

  return NextResponse.json({ products: data ?? [], grouped })
}

// POST /api/product-catalogue — create product
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const body = await req.json() as {
    category: string; name: string; description?: string; sku?: string
    unit?: string; base_price_pence?: number; vat_rate?: number; sort_order?: number
  }

  if (!body.category || !body.name) {
    return NextResponse.json({ error: 'category and name are required' }, { status: 400 })
  }

  const { data: product, error } = await adminAny
    .from('product_catalogue')
    .insert({
      id: randomUUID(),
      category: body.category,
      name: body.name,
      description: body.description ?? null,
      sku: body.sku ?? null,
      unit: body.unit ?? 'item',
      base_price_pence: body.base_price_pence ?? 0,
      vat_rate: body.vat_rate ?? 0.2,
      sort_order: body.sort_order ?? 0,
      is_active: true,
      is_size_banded: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ product }, { status: 201 })
}
