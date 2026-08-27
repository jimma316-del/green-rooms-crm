import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { xeroFetch } from '@/lib/xero'

const MONTH_MAP: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

function parseXeroMonth(str: string): string | null {
  const match = str.trim().match(/^(\w{3})\s+(\d{4})$/)
  if (!match) return null
  const month = MONTH_MAP[match[1]]
  return month ? `${match[2]}-${month}` : null
}

interface XeroCell { Value: string }
interface XeroRow {
  RowType: string
  Title?: string
  Cells?: XeroCell[]
  Rows?: XeroRow[]
}

// These are the P&L summary rows we cache — individual account lines are skipped
const SUMMARY_NAMES = new Set([
  'Total Income',
  'Total Cost of Sales',
  'Gross Profit',
  'Total Operating Expenses',
  'Net Profit',
])

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
  if (profile?.role === 'site') return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  // Last 12 months ending today
  const now = new Date()
  const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const fromDate = new Date(now.getFullYear(), now.getMonth() - 10, 1)
  const fromStr = fromDate.toISOString().slice(0, 10)
  const toStr = toDate.toISOString().slice(0, 10)

  let res: Response
  try {
    res = await xeroFetch(
      `/Reports/ProfitAndLoss?fromDate=${fromStr}&toDate=${toStr}&periods=11&timeframe=MONTH&standardLayout=true`
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sync failed'
    await admin.from('xero_connection').update({ last_sync_error: msg }).eq('id', 1)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  if (!res.ok) {
    const text = await res.text()
    const msg = `Xero API ${res.status}: ${text.slice(0, 300)}`
    console.error('Xero P&L sync failed:', msg)
    await admin.from('xero_connection').update({ last_sync_error: `Xero API error ${res.status}` }).eq('id', 1)
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const json = await res.json()
  const report = json.Reports?.[0]
  if (!report) return NextResponse.json({ error: 'No report in Xero response' }, { status: 502 })

  // Parse monthly period headers from the Header row
  const headerRow: XeroRow | undefined = report.Rows?.find((r: XeroRow) => r.RowType === 'Header')
  const periods: string[] = []
  for (let i = 1; i < (headerRow?.Cells?.length ?? 0); i++) {
    const p = parseXeroMonth(headerRow!.Cells![i].Value)
    if (p) periods.push(p)
  }
  if (!periods.length) {
    return NextResponse.json({ error: 'Could not read period headers from Xero report' }, { status: 502 })
  }

  // Walk each section, extract only the summary rows we care about
  const rows: Array<{
    period: string
    account_id: null
    account_name: string
    account_type: string | null
    net_amount_pence: number
    synced_at: string
  }> = []
  const now2 = new Date().toISOString()

  for (const section of report.Rows ?? []) {
    if (section.RowType !== 'Section') continue
    const sectionTitle: string | null = section.Title ?? null

    for (const row of section.Rows ?? []) {
      const cells = row.Cells
      if (!cells?.length) continue
      const name: string = cells[0].Value
      if (!SUMMARY_NAMES.has(name)) continue

      for (let i = 1; i < cells.length && i - 1 < periods.length; i++) {
        const pence = Math.round((parseFloat(cells[i].Value || '0') || 0) * 100)
        rows.push({
          period: periods[i - 1],
          account_id: null,
          account_name: name,
          account_type: sectionTitle,
          net_amount_pence: pence,
          synced_at: now2,
        })
      }
    }
  }

  // Replace cache: delete all then insert fresh
  await admin.from('xero_financial_cache').delete().neq('period', '')
  if (rows.length > 0) {
    await admin.from('xero_financial_cache').insert(rows)
  }

  await admin.from('xero_connection').update({
    last_sync_at: now2,
    last_sync_error: null,
  }).eq('id', 1)

  return NextResponse.json({ ok: true, periods, rowCount: rows.length })
}
