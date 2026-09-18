import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Params { params: Promise<{ id: string }> }

// POST /api/leads/[id]/convert-to-job
// Advances a lead from any sales stage to job_booked after quote acceptance
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { quoteRef } = body as { quoteRef?: string }

  const admin = createAdminClient()

  const { error } = await admin
    .from('leads')
    .update({ stage: 'job_booked' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('activities').insert({
    lead_id: id,
    created_by: user.id,
    type: 'stage_change',
    body: quoteRef
      ? `Job booked — converted from accepted quote ${quoteRef}`
      : 'Job booked — converted from accepted quote',
  })

  return NextResponse.json({ ok: true })
}
