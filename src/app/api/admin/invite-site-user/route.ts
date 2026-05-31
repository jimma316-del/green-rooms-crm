import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

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
  const displayName = name || email.split('@')[0]

  // Try invite first; fall back to recovery link if user already exists
  let userId: string | null = null

  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: displayName },
    redirectTo,
  })

  if (error) {
    if (!error.message.toLowerCase().includes('already registered') && error.code !== 'email_exists') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    // User exists — generate a recovery link and email it ourselves (bypasses rate limit)
    const { data: existing } = await admin.from('users').select('id').eq('email', email).single()
    userId = existing?.id ?? null

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })
    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 400 })

    await sendEmail({
      to: email,
      subject: 'Set your password — The Green Rooms',
      html: `
        <p>Hi ${displayName},</p>
        <p>Click the link below to set your password and access The Green Rooms team portal:</p>
        <p><a href="${linkData.properties.action_link}" style="background:#2d6a4f;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Set your password</a></p>
        <p>This link expires in 24 hours.</p>
      `,
    })
  } else {
    userId = invited.user.id
  }

  // Ensure role is set correctly
  if (userId) {
    await admin.from('users').upsert({
      id: userId,
      email,
      full_name: displayName,
      role: 'site',
    })
  }

  return NextResponse.json({ ok: true })
}
