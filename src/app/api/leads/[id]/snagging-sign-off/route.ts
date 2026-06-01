import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { notes, mediaUrls } = await req.json() as { notes?: string; mediaUrls?: string[] }

  const admin = createAdminClient()

  const { error } = await admin
    .from('leads')
    .update({ snagging_signed_off_at: new Date().toISOString(), stage: 'paid_closed' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('activities').insert({
    lead_id: id,
    created_by: null,
    type: 'stage_change',
    body: notes
      ? `Snagging confirmed complete — client happy. Notes: ${notes}`
      : 'Snagging confirmed complete — client happy.',
    metadata: mediaUrls?.length ? { mediaUrls } : null,
  })

  return NextResponse.json({ ok: true })
}
