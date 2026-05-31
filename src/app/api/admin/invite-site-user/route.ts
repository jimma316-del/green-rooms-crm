import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

function generateTempPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let pw = ''
  for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  return pw + 'A1!'
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
  if (!['admin', 'sales'].includes(profile?.role ?? '')) return NextResponse.json({ error: 'Not authorised' }, { status: 403 })

  const { email, name } = await req.json() as { email: string; name: string }
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://green-rooms-crm.vercel.app'
  const displayName = name || email.split('@')[0]
  const tempPassword = generateTempPassword()

  // Check if user already exists via our users table
  const { data: existingProfile } = await admin.from('users').select('id').eq('email', email).maybeSingle()

  let userId: string

  if (existingProfile) {
    // Update their password directly
    const { error } = await admin.auth.admin.updateUserById(existingProfile.id, { password: tempPassword })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    userId = existingProfile.id
  } else {
    // Create new user
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: displayName },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    userId = created.user.id
  }

  // Ensure role is set
  await admin.from('users').upsert({
    id: userId,
    email,
    full_name: displayName,
    role: 'site',
  })

  // Send credentials via Resend
  await sendEmail({
    to: email,
    subject: 'Your Green Rooms team portal access',
    html: `
      <p>Hi ${displayName},</p>
      <p>Your account has been set up for The Green Rooms team portal.</p>
      <p><strong>Login:</strong> <a href="${siteUrl}/login">${siteUrl}/login</a></p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Temporary password:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:16px;">${tempPassword}</code></p>
      <p style="color:#6b7280;font-size:14px;">You can change your password after logging in via Settings.</p>
    `,
  })

  return NextResponse.json({ ok: true })
}
