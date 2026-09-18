import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Params { params: Promise<{ quoteId: string; variationId: string }> }

// PATCH /api/quotes/[quoteId]/variations/[variationId]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { quoteId, variationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const body = await req.json() as {
    title?: string
    description?: string
    line_items?: VariationLineItem[]
    status?: string
    approved_by?: string
  }

  // Recalculate total from line items if provided
  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.status !== undefined) {
    updates.status = body.status
    if (body.status === 'approved') {
      updates.approved_at = new Date().toISOString()
      updates.approved_by = body.approved_by ?? null
    }
  }
  if (body.line_items !== undefined) {
    updates.line_items = body.line_items
    updates.total_pence = body.line_items.reduce((s, i) => s + i.line_total_pence, 0)
  }

  const { data: variation, error } = await adminAny
    .from('quote_variations')
    .update(updates)
    .eq('id', variationId)
    .eq('quote_id', quoteId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ variation })
}

// DELETE /api/quotes/[quoteId]/variations/[variationId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { quoteId, variationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const { error } = await adminAny
    .from('quote_variations')
    .delete()
    .eq('id', variationId)
    .eq('quote_id', quoteId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

interface VariationLineItem {
  id: string
  name: string
  description?: string | null
  quantity: number
  unit: string
  unit_price_pence: number
  line_total_pence: number
}
