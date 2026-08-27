import { createAdminClient } from './supabase/admin'

const XERO_API_BASE = 'https://api.xero.com/api.xro/2.0'
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token'

interface XeroConnection {
  id: number
  access_token: string
  refresh_token: string
  token_expires_at: string
  tenant_id: string
  org_name: string
  connected_at: string
  last_sync_at: string | null
  last_sync_error: string | null
}

export interface XeroStatus {
  connected: boolean
  orgName: string | null
  connectedAt: string | null
  lastSyncAt: string | null
  lastSyncError: string | null
  tokenExpiresAt: string | null
}

export async function getXeroStatus(): Promise<XeroStatus> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('xero_connection')
    .select('org_name, connected_at, last_sync_at, last_sync_error, token_expires_at')
    .eq('id', 1)
    .single()

  if (!data) {
    return { connected: false, orgName: null, connectedAt: null, lastSyncAt: null, lastSyncError: null, tokenExpiresAt: null }
  }

  return {
    connected: true,
    orgName: data.org_name,
    connectedAt: data.connected_at,
    lastSyncAt: data.last_sync_at,
    lastSyncError: data.last_sync_error,
    tokenExpiresAt: data.token_expires_at,
  }
}

async function getConnection(): Promise<XeroConnection | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('xero_connection').select('*').eq('id', 1).single()
  return data ?? null
}

async function refreshTokens(conn: XeroConnection): Promise<XeroConnection> {
  const credentials = Buffer.from(
    `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: conn.refresh_token,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Xero token refresh failed (${res.status}): ${text}`)
  }

  const tokens = await res.json()
  const updated: Partial<XeroConnection> = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  }

  const admin = createAdminClient()
  await admin.from('xero_connection').update(updated).eq('id', 1)

  return { ...conn, ...updated }
}

async function getValidConnection(): Promise<XeroConnection> {
  const conn = await getConnection()
  if (!conn) throw new Error('Xero is not connected')

  const expiresAt = new Date(conn.token_expires_at)
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000)

  if (expiresAt <= fiveMinFromNow) {
    return refreshTokens(conn)
  }

  return conn
}

// Make an authenticated request to the Xero API.
// Automatically refreshes tokens if they are near expiry.
export async function xeroFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const conn = await getValidConnection()

  return fetch(`${XERO_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      'Xero-tenant-id': conn.tenant_id,
      Accept: 'application/json',
      ...options.headers,
    },
  })
}

export async function disconnectXero(): Promise<void> {
  const admin = createAdminClient()
  await admin.from('xero_connection').delete().eq('id', 1)
  await admin.from('xero_accounts').delete().neq('account_id', '')
  await admin.from('xero_financial_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}
