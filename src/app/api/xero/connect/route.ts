import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize'
const SCOPES = 'openid offline_access accounting.settings.read accounting.transactions.read'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
  if (profile?.role === 'site') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set('xero_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  // Build URL manually — URLSearchParams encodes spaces as '+' but Xero requires '%20'
  const url =
    `${XERO_AUTH_URL}` +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(process.env.XERO_CLIENT_ID!)}` +
    `&redirect_uri=${encodeURIComponent(process.env.XERO_REDIRECT_URI!)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&state=${encodeURIComponent(state)}`

  return NextResponse.redirect(url)
}
