import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
  if (!['admin', 'sales'].includes(profile?.role ?? '')) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })

  const { email, name } = await req.json() as { email: string; name: string }
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Invite user via Supabase auth (sends invite email)
  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name || email.split('@')[0] },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Set their role to 'site' in the users table
  await admin.from('users').upsert({
    id: invited.user.id,
    email,
    full_name: name || email.split('@')[0],
    role: 'site',
  })

  return NextResponse.json({ ok: true })
}
