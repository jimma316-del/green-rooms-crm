import { NextResponse } from 'next/server'

const SCOPES = 'openid offline_access accounting.settings.read accounting.reports.profitandloss.read accounting.reports.executivesummary.read'
const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize'

export async function GET() {
  const clientId = process.env.XERO_CLIENT_ID
  const secret = process.env.XERO_CLIENT_SECRET
  const redirectUri = process.env.XERO_REDIRECT_URI

  const authUrl = clientId && redirectUri
    ? `${XERO_AUTH_URL}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(SCOPES)}&state=DEBUG`
    : null

  return NextResponse.json({
    XERO_CLIENT_ID: clientId ? `${clientId.slice(0, 6)}...${clientId.slice(-4)}` : 'NOT SET',
    XERO_CLIENT_SECRET: secret ? `set (${secret.length} chars)` : 'NOT SET',
    XERO_REDIRECT_URI: redirectUri ?? 'NOT SET',
    scopes: SCOPES,
    full_auth_url: authUrl,
  })
}
