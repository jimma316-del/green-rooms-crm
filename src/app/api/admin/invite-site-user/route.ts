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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://green-rooms-crm.vercel.app'
  const redirectTo = `${siteUrl}/auth/callback`

  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name || email.split('@')[0] },
    redirectTo,
  })

  if (error) {
    // User already exists — send a password reset so they can set one
    if (error.message.toLowerCase().includes('already registered') || error.code === 'email_exists') {
      const { error: resetError } = await admin.auth.resetPasswordForEmail(email, { redirectTo })
      if (resetError) return NextResponse.json({ error: resetError.message }, { status: 400 })

      // Make sure their role is correct
      const { data: existing } = await admin.from('users').select('id').eq('email', email).single()
      if (existing) {
        await admin.from('users').update({ role: 'site', full_name: name || email.split('@')[0] }).eq('id', existing.id)
      }

      return NextResponse.json({ ok: true, resent: true })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // New user — set their role
  await admin.from('users').upsert({
    id: invited.user.id,
    email,
    full_name: name || email.split('@')[0],
    role: 'site',
  })

  return NextResponse.json({ ok: true })
}
