import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Params { params: Promise<{ id: string }> }

// PATCH /api/tc-versions/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const body = await req.json() as { version_tag?: string; content_html?: string; is_current?: boolean }

  // If setting to current, unset others first
  if (body.is_current) {
    await adminAny.from('tc_versions').update({ is_current: false }).eq('is_current', true)
  }

  const { data: version, error } = await adminAny
    .from('tc_versions')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ version })
}

// DELETE /api/tc-versions/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  // Don't allow deleting the current version
  const { data: existing } = await adminAny.from('tc_versions').select('is_current').eq('id', id).single()
  if (existing?.is_current) {
    return NextResponse.json({ error: 'Cannot delete the current T&C version' }, { status: 400 })
  }

  const { error } = await adminAny.from('tc_versions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
