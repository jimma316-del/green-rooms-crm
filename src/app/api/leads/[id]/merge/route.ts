import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/leads/[id]/merge?with=[otherId]
// Keeps [id] (newest), merges data from [otherId], deletes [otherId]
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: keepId } = await params
  const otherId = req.nextUrl.searchParams.get('with')
  if (!otherId) return NextResponse.json({ error: 'Missing ?with= param' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const [{ data: keep }, { data: other }] = await Promise.all([
    admin.from('leads').select('*').eq('id', keepId).single(),
    admin.from('leads').select('*').eq('id', otherId).single(),
  ])

  if (!keep || !other) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  // Merge: fill in missing fields from the other lead, combine notes, combine calculator_data
  const mergedNotes = [keep.notes, other.notes].filter(Boolean).join('\n\n---\n\n') || null
  const mergedCalcData = keep.calculator_data ?? other.calculator_data

  await admin.from('leads').update({
    mobile: keep.mobile ?? other.mobile,
    email: keep.email ?? other.email,
    address: keep.address ?? other.address,
    postcode: keep.postcode ?? other.postcode,
    notes: mergedNotes,
    calculator_data: mergedCalcData,
    distance_miles: keep.distance_miles ?? other.distance_miles,
    marketing_consent: keep.marketing_consent || other.marketing_consent,
    tags: [...new Set([...(keep.tags ?? []), ...(other.tags ?? [])])],
  }).eq('id', keepId)

  // Reassign all activities and tasks from the old lead to the kept lead
  await Promise.all([
    admin.from('activities').update({ lead_id: keepId }).eq('lead_id', otherId),
    admin.from('tasks').update({ lead_id: keepId }).eq('lead_id', otherId),
  ])

  // Log the merge
  await admin.from('activities').insert({
    lead_id: keepId,
    created_by: user.id,
    type: 'note',
    body: `Merged with duplicate lead (${other.name} — ${other.email})`,
  })

  // Delete the old lead
  await admin.from('leads').delete().eq('id', otherId)

  return NextResponse.json({ ok: true })
}
