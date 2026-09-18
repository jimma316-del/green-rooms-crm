import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Params { params: Promise<{ quoteId: string }> }

// GET /api/quotes/[quoteId]
// Returns the quote with its current version (full sections + items + payment schedule)
export async function GET(_req: NextRequest, { params }: Params) {
  const { quoteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  // Load quote + all versions
  const { data: quote, error: qErr } = await adminAny
    .from('quotes')
    .select(`
      id, quote_ref, lead_id, created_at, archived_at,
      leads ( id, name, email, mobile ),
      quote_versions (
        id, version_number, status, title, internal_notes, cover_letter,
        total_pence, is_current, created_at, sent_at, viewed_at, responded_at, pdf_url
      )
    `)
    .eq('id', quoteId)
    .single()

  if (qErr || !quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Find the current version
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const versions: any[] = quote.quote_versions ?? []
  const currentVersion = versions.find((v: { is_current: boolean }) => v.is_current)
    ?? versions.sort((a: { version_number: number }, b: { version_number: number }) => b.version_number - a.version_number)[0]

  if (!currentVersion) return NextResponse.json({ quote, currentVersion: null })

  // Load sections + items for current version
  const { data: sections } = await adminAny
    .from('quote_sections')
    .select(`
      id, title, sort_order, show_subtotal, notes,
      quote_line_items (
        id, product_id, name, description, quantity, unit,
        unit_price_pence, line_total_pence, is_optional, is_included,
        sort_order, internal_notes
      )
    `)
    .eq('quote_version_id', currentVersion.id)
    .order('sort_order')

  // Sort items within each section
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sectionsWithSortedItems = (sections ?? []).map((s: any) => ({
    ...s,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    quote_line_items: (s.quote_line_items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
  }))

  // Load payment schedule
  const { data: paymentSchedule } = await adminAny
    .from('payment_schedules')
    .select('*')
    .eq('quote_version_id', currentVersion.id)
    .order('sort_order')

  return NextResponse.json({
    quote: {
      ...quote,
      quote_versions: versions.map((v: { id: string }) => ({
        ...v,
        isCurrent: v.id === currentVersion.id,
      })),
    },
    currentVersion: {
      ...currentVersion,
      sections: sectionsWithSortedItems,
      paymentSchedule: paymentSchedule ?? [],
    },
  })
}

// PATCH /api/quotes/[quoteId]
// Archive the quote
export async function PATCH(req: NextRequest, { params }: Params) {
  const { quoteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('quotes')
    .update(body)
    .eq('id', quoteId)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ quote: data })
}
