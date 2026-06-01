import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { taskId, notes } = await req.json() as { taskId: string; notes: string }

  const admin = createAdminClient()
  const { error } = await admin
    .from('tasks')
    .update({ notes: notes.trim() || null })
    .eq('id', taskId)
    .eq('lead_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
