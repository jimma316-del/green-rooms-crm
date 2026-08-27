import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token'
const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const redirectBase = new URL('/settings/xero', req.url)

  if (error) {
    redirectBase.searchParams.set('error', 'access_denied')
    return NextResponse.redirect(redirectBase)
  }

  // Verify CSRF state
  const cookieStore = await cookies()
  const savedState = cookieStore.get('xero_oauth_state')?.value
  cookieStore.delete('xero_oauth_state')

  if (!state || state !== savedState) {
    redirectBase.searchParams.set('error', 'invalid_state')
    return NextResponse.redirect(redirectBase)
  }

  if (!code) {
    redirectBase.searchParams.set('error', 'no_code')
    return NextResponse.redirect(redirectBase)
  }

  // Exchange auth code for tokens
  const credentials = Buffer.from(
    `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
  ).toString('base64')

  const tokenRes = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.XERO_REDIRECT_URI!,
    }),
  })

  if (!tokenRes.ok) {
    console.error('Xero token exchange failed:', await tokenRes.text())
    redirectBase.searchParams.set('error', 'token_exchange')
    return NextResponse.redirect(redirectBase)
  }

  const tokens = await tokenRes.json()

  // Fetch the tenant (Xero organisation) list
  const connectionsRes = await fetch(XERO_CONNECTIONS_URL, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!connectionsRes.ok) {
    console.error('Xero connections fetch failed:', await connectionsRes.text())
    redirectBase.searchParams.set('error', 'tenant_fetch')
    return NextResponse.redirect(redirectBase)
  }

  const connections: Array<{ tenantId: string; tenantName: string }> = await connectionsRes.json()

  if (!connections.length) {
    redirectBase.searchParams.set('error', 'no_tenant')
    return NextResponse.redirect(redirectBase)
  }

  // Use first tenant (Green Rooms will only ever have one Xero org)
  const tenant = connections[0]

  const admin = createAdminClient()
  const { error: dbError } = await admin.from('xero_connection').upsert({
    id: 1,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    tenant_id: tenant.tenantId,
    org_name: tenant.tenantName,
    connected_at: new Date().toISOString(),
    last_sync_at: null,
    last_sync_error: null,
  })

  if (dbError) {
    console.error('Xero connection save failed:', dbError)
    redirectBase.searchParams.set('error', 'save_failed')
    return NextResponse.redirect(redirectBase)
  }

  redirectBase.searchParams.set('connected', '1')
  return NextResponse.redirect(redirectBase)
}
