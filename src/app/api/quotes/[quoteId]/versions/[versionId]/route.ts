import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Params { params: Promise<{ quoteId: string; versionId: string }> }

// PATCH /api/quotes/[quoteId]/versions/[versionId]
// Update version metadata: title, cover_letter, internal_notes, status
export async function PATCH(req: NextRequest, { params }: Params) {
  const { versionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  // Only allow updating safe fields (no overwriting id, quote_id, version_number)
  const allowed = ['title', 'internal_notes', 'cover_letter', 'status', 'sent_at', 'viewed_at', 'responded_at', 'pdf_url', 'is_current', 'build_date', 'expires_at']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k))) as any

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any
  let { data, error } = await adminAny
    .from('quote_versions')
    .update(patch)
    .eq('id', versionId)
    .select('id, title, status, internal_notes, cover_letter')
    .single()

  // If update failed due to missing column (42703), strip new columns and retry
  if (error?.code === '42703') {
    const migratedColumns = ['build_date', 'expires_at', 'accepted_by_name', 'accepted_at', 'acceptance_ip']
    const safePatch = Object.fromEntries(Object.entries(patch).filter(([k]) => !migratedColumns.includes(k)))
    if (Object.keys(safePatch).length > 0) {
      const retry = await adminAny
        .from('quote_versions')
        .update(safePatch)
        .eq('id', versionId)
        .select('id, title, status, internal_notes, cover_letter')
        .single()
      data = retry.data
      error = retry.error
    } else {
      error = null
    }
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ version: data })
}

// POST /api/quotes/[quoteId]/versions/[versionId]
// Duplicate this version into a new version (for creating v2, v3, etc.)
export async function POST(req: NextRequest, { params }: Params) {
  const { quoteId, versionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  // Get latest version number for this quote
  const { data: versions } = await adminAny
    .from('quote_versions')
    .select('version_number')
    .eq('quote_id', quoteId)
    .order('version_number', { ascending: false })
    .limit(1)

  const nextVersion = ((versions?.[0]?.version_number) ?? 0) + 1

  // Mark current version as superseded
  await adminAny
    .from('quote_versions')
    .update({ is_current: false, status: 'superseded' })
    .eq('id', versionId)

  // Create new version
  const { data: newVersion, error: vErr } = await adminAny
    .from('quote_versions')
    .insert({
      quote_id: quoteId,
      version_number: nextVersion,
      status: 'draft',
      title: body.title ?? null,
      is_current: true,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 })

  // Copy sections + items from source version
  const { data: sourceSections } = await adminAny
    .from('quote_sections')
    .select(`id, title, sort_order, show_subtotal, notes,
      quote_line_items ( name, description, quantity, unit, unit_price_pence, line_total_pence, is_optional, is_included, sort_order, internal_notes, product_id )`)
    .eq('quote_version_id', versionId)
    .order('sort_order')

  for (const s of sourceSections ?? []) {
    const { data: newSec } = await adminAny
      .from('quote_sections')
      .insert({ quote_version_id: newVersion.id, title: s.title, sort_order: s.sort_order, show_subtotal: s.show_subtotal, notes: s.notes })
      .select('id')
      .single()
    if (!newSec) continue

    const items = (s.quote_line_items ?? []).map((item: Record<string, unknown>) => ({
      ...item,
      section_id: newSec.id,
    }))
    if (items.length) await adminAny.from('quote_line_items').insert(items)
  }

  // Copy payment schedule
  const { data: sourcePayments } = await adminAny
    .from('payment_schedules')
    .select('milestone, label, amount_pence, percentage, due_trigger, due_date, sort_order')
    .eq('quote_version_id', versionId)
    .order('sort_order')

  if (sourcePayments?.length) {
    await adminAny.from('payment_schedules').insert(
      sourcePayments.map((p: Record<string, unknown>) => ({ ...p, quote_version_id: newVersion.id }))
    )
  }

  return NextResponse.json({ versionId: newVersion.id, versionNumber: nextVersion })
}
