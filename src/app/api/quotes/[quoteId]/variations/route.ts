import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'

interface Params { params: Promise<{ quoteId: string }> }

// GET /api/quotes/[quoteId]/variations
export async function GET(_req: NextRequest, { params }: Params) {
  const { quoteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any
  const { data, error } = await adminAny
    .from('quote_variations')
    .select('*')
    .eq('quote_id', quoteId)
    .order('variation_number')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ variations: data ?? [] })
}

// POST /api/quotes/[quoteId]/variations — create new variation order
export async function POST(req: NextRequest, { params }: Params) {
  const { quoteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  // Get quote to derive ref and lead_id
  const { data: quote } = await adminAny
    .from('quotes')
    .select('id, quote_ref, lead_id')
    .eq('id', quoteId)
    .single()

  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

  // Count existing variations to determine number
  const { count } = await adminAny
    .from('quote_variations')
    .select('id', { count: 'exact', head: true })
    .eq('quote_id', quoteId)

  const variationNumber = (count ?? 0) + 1
  const variationRef = `${quote.quote_ref}-VO${variationNumber}`

  const body = await req.json() as { title?: string; description?: string }

  const { data: variation, error } = await adminAny
    .from('quote_variations')
    .insert({
      id: randomUUID(),
      quote_id: quoteId,
      lead_id: quote.lead_id,
      variation_number: variationNumber,
      variation_ref: variationRef,
      title: body.title ?? `Variation Order ${variationNumber}`,
      description: body.description ?? null,
      status: 'draft',
      total_pence: 0,
      line_items: [],
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log activity
  await admin.from('activities').insert({
    lead_id: quote.lead_id,
    created_by: user.id,
    type: 'note',
    body: `Variation order ${variationRef} created`,
  })

  return NextResponse.json({ variation }, { status: 201 })
}
