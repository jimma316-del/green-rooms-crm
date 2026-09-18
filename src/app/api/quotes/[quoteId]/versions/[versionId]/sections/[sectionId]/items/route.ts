import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recalcVersionTotal } from '@/app/api/quotes/route'

interface Params { params: Promise<{ quoteId: string; versionId: string; sectionId: string }> }

// POST /api/quotes/[quoteId]/versions/[versionId]/sections/[sectionId]/items
export async function POST(req: NextRequest, { params }: Params) {
  const { versionId, sectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const qty = parseFloat(body.quantity ?? 1)
  const unitPrice = parseInt(body.unit_price_pence ?? 0)
  const lineTotal = Math.round(qty * unitPrice)

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const { data, error } = await adminAny
    .from('quote_line_items')
    .insert({
      section_id: sectionId,
      product_id: body.product_id ?? null,
      name: body.name ?? 'New item',
      description: body.description ?? null,
      quantity: qty,
      unit: body.unit ?? 'item',
      unit_price_pence: unitPrice,
      line_total_pence: lineTotal,
      is_optional: body.is_optional ?? false,
      is_included: body.is_included ?? true,
      sort_order: body.sort_order ?? 99,
      internal_notes: body.internal_notes ?? null,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recalcVersionTotal(adminAny, versionId)

  return NextResponse.json({ item: data })
}
