import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { xeroFetch } from '@/lib/xero'

interface XeroAccount {
  AccountID: string
  Code: string | null
  Name: string
  Type: string
  Class: string | null
  Status: string
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  let res: Response
  try {
    res = await xeroFetch('/Accounts?where=Status%3D%3D%22ACTIVE%22&order=Class,Code')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  if (!res.ok) {
    const text = await res.text()
    console.error('Xero accounts fetch failed:', text)
    return NextResponse.json({ error: `Xero API error ${res.status}` }, { status: 502 })
  }

  const data = await res.json()
  const accounts: XeroAccount[] = data.Accounts ?? []

  // Upsert into cache
  const rows = accounts.map((a) => ({
    account_id: a.AccountID,
    code: a.Code ?? null,
    name: a.Name,
    type: a.Type,
    class: a.Class ?? null,
    status: a.Status,
    updated_at: new Date().toISOString(),
  }))

  if (rows.length > 0) {
    await admin.from('xero_accounts').upsert(rows, { onConflict: 'account_id' })
  }

  return NextResponse.json({ accounts: rows })
}
