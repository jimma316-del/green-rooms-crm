import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.XERO_CLIENT_ID
  const secret = process.env.XERO_CLIENT_SECRET
  const redirectUri = process.env.XERO_REDIRECT_URI

  return NextResponse.json({
    XERO_CLIENT_ID: clientId ? `${clientId.slice(0, 6)}...${clientId.slice(-4)}` : 'NOT SET',
    XERO_CLIENT_SECRET: secret ? `set (${secret.length} chars)` : 'NOT SET',
    XERO_REDIRECT_URI: redirectUri ?? 'NOT SET',
    scopes: 'openid offline_access accounting.settings.read accounting.transactions.read',
  })
}
