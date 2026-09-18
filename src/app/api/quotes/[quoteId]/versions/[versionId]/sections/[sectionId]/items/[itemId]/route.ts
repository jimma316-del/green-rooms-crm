import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recalcVersionTotal } from '@/app/api/quotes/route'

interface Params { params: Promise<{ quoteId: string; versionId: string; sectionId: string; itemId: string }> }

// PATCH /api/quotes/[quoteId]/versions/[versionId]/sections/[sectionId]/items/[itemId]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { versionId, itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['name', 'description', 'quantity', 'unit', 'unit_price_pence', 'is_optional', 'is_included', 'sort_order', 'internal_notes']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  // Recalculate line total if qty or unit price changed
  if (patch.quantity !== undefined || patch.unit_price_pence !== undefined) {
    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (admin as any).from('quote_line_items').select('quantity, unit_price_pence').eq('id', itemId).single()
    const qty = parseFloat(String(patch.quantity ?? existing?.quantity ?? 1))
    const price = parseInt(String(patch.unit_price_pence ?? existing?.unit_price_pence ?? 0))
    patch.line_total_pence = Math.round(qty * price)
    if (patch.quantity !== undefined) patch.quantity = qty
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const { data, error } = await adminAny
    .from('quote_line_items')
    .update(patch)
    .eq('id', itemId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recalcVersionTotal(adminAny, versionId)

  return NextResponse.json({ item: data })
}

// DELETE /api/quotes/[quoteId]/versions/[versionId]/sections/[sectionId]/items/[itemId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { versionId, itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const { error } = await adminAny.from('quote_line_items').delete().eq('id', itemId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recalcVersionTotal(adminAny, versionId)

  return NextResponse.json({ success: true })
}
