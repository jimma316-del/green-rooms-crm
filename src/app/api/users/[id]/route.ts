import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireOfficeUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!profile || profile.role === 'site') return null
  return user
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireOfficeUser()
  if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { role } = await req.json() as { role: string }

  const validRoles = ['admin', 'sales', 'operations', 'site']
  if (!validRoles.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  // Prevent demoting yourself
  if (id === caller.id) return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('users').update({ role }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireOfficeUser()
  if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (id === caller.id) return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })

  const admin = createAdminClient()

  // Delete from users table first (auth user delete cascades or is separate)
  const { error: profileErr } = await admin.from('users').delete().eq('id', id)
  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })

  // Delete auth user
  const { error: authErr } = await admin.auth.admin.deleteUser(id)
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
