import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { initials } = await req.json() as { initials: string }
  if (!initials?.trim()) return NextResponse.json({ error: 'Initials required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: lead } = await admin.from('leads').select('delivery_info').eq('id', id).single()
  const current = (lead?.delivery_info ?? {}) as Record<string, unknown>

  if (current.build_approval) {
    return NextResponse.json({ error: 'Already signed off' }, { status: 409 })
  }

  const approval = { initials: initials.trim().toUpperCase(), signed_at: new Date().toISOString() }
  const { error } = await admin.from('leads').update({ delivery_info: { ...current, build_approval: approval } }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, build_approval: approval })
}
