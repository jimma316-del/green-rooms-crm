import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { xeroFetch } from '@/lib/xero'

interface XeroCell { Value: string }
interface XeroRow {
  RowType: string
  Title?: string
  Cells?: XeroCell[]
  Rows?: XeroRow[]
}

const REVENUE_NAMES = new Set(['Total Income', 'Total Turnover'])
const COGS_NAMES = new Set(['Total Cost of Sales'])
const GROSS_PROFIT_NAMES = new Set(['Gross Profit'])
const OPEX_NAMES = new Set(['Total Operating Expenses', 'Total Administrative Costs', 'Total Overhead Expenses'])
const NET_PROFIT_NAMES = new Set(['Net Profit', 'Operating Profit', 'Profit after Taxation', 'Profit on Ordinary Activities Before Taxation'])
const ALL_SUMMARY_NAMES = new Set([...REVENUE_NAMES, ...COGS_NAMES, ...GROSS_PROFIT_NAMES, ...OPEX_NAMES, ...NET_PROFIT_NAMES])

function summaryCategory(name: string): string {
  if (REVENUE_NAMES.has(name)) return 'Total Income'
  if (COGS_NAMES.has(name)) return 'Total Cost of Sales'
  if (GROSS_PROFIT_NAMES.has(name)) return 'Gross Profit'
  if (OPEX_NAMES.has(name)) return 'Total Operating Expenses'
  if (NET_PROFIT_NAMES.has(name)) return 'Net Profit'
  return name
}

type CacheRow = {
  period: string
  account_id: null
  account_name: string
  account_type: string | null
  net_amount_pence: number
  synced_at: string
}

function extractRows(report: { Rows?: XeroRow[] }, period: string, synced_at: string): CacheRow[] {
  const out: CacheRow[] = []
  const seen = new Set<string>()

  function addRow(rawName: string, sectionTitle: string, valueStr: string) {
    const value = parseFloat(valueStr || '0') || 0
    const isSummary = ALL_SUMMARY_NAMES.has(rawName)
    if (!isSummary && value === 0) return
    const name = isSummary ? summaryCategory(rawName) : rawName
    const key = `${name}::${sectionTitle}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ period, account_id: null, account_name: name, account_type: sectionTitle || null, net_amount_pence: Math.round(value * 100), synced_at })
  }

  for (const section of report.Rows ?? []) {
    if (section.RowType === 'Header') continue
    const sectionTitle = (section.Title ?? '').replace(/^Less\s+/i, '')
    if (section.RowType === 'Section') {
      for (const row of section.Rows ?? []) {
        const cells = row.Cells
        if (!cells?.length) continue
        addRow(cells[0].Value, sectionTitle, cells[1]?.Value ?? '0')
      }
    } else {
      const cells = section.Cells
      if (!cells?.length) continue
      addRow(cells[0].Value, sectionTitle, cells[1]?.Value ?? '0')
    }
  }
  return out
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
  if (profile?.role === 'site') return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const now2 = new Date().toISOString()
  const now = new Date()
  const MONTHS_BACK = 35 // 3 years back from current month

  // Build list of months to fetch
  const monthsToFetch: Array<{ fromStr: string; toStr: string; period: string }> = []
  for (let i = MONTHS_BACK; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    monthsToFetch.push({
      fromStr: monthStart.toISOString().slice(0, 10),
      toStr: monthEnd.toISOString().slice(0, 10),
      period: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
    })
  }

  // Fetch all months in parallel batches of 6 to stay within Xero rate limits
  const BATCH_SIZE = 4
  const BATCH_DELAY_MS = 1200 // stay well under 60 req/min
  const rows: Array<{
    period: string; account_id: null; account_name: string
    account_type: string | null; net_amount_pence: number; synced_at: string
  }> = []

  async function fetchMonth(m: typeof monthsToFetch[0]) {
    let res: Response
    try {
      res = await xeroFetch(`/Reports/ProfitAndLoss?fromDate=${m.fromStr}&toDate=${m.toStr}&periods=1&timeframe=MONTH`)
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Sync failed')
    }
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Xero API ${res.status}: ${text.slice(0, 200)}`)
    }
    const json = await res.json()
    const report = json.Reports?.[0]
    return report ? extractRows(report, m.period, now2) : []
  }

  for (let b = 0; b < monthsToFetch.length; b += BATCH_SIZE) {
    if (b > 0) await new Promise(r => setTimeout(r, BATCH_DELAY_MS))
    const batch = monthsToFetch.slice(b, b + BATCH_SIZE)
    let results: Awaited<ReturnType<typeof fetchMonth>>[]
    try {
      results = await Promise.all(batch.map(fetchMonth))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed'
      await admin.from('xero_connection').update({ last_sync_error: msg }).eq('id', 1)
      return NextResponse.json({ error: msg }, { status: 502 })
    }
    for (const r of results) rows.push(...r)
  }

  if (!rows.length) {
    return NextResponse.json({ error: 'No data returned from Xero' }, { status: 502 })
  }

  // Fetch live data (invoices, supplier spend) to cache — done AFTER P&L to avoid rate limits
  const sixMonthsAgo = new Date(Date.now() - 183 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  await new Promise(r => setTimeout(r, BATCH_DELAY_MS))

  type XeroInvoice = {
    InvoiceID: string; InvoiceNumber: string; Contact: { Name: string }
    DueDate: string; Date: string; AmountDue: number; Total: number
    FullyPaidOnDate?: string; Type: string
  }

  const [outstandingRes, paidRes, billsRes] = await Promise.allSettled([
    xeroFetch('/Invoices?Statuses=AUTHORISED&where=AmountDue%3E0&order=DueDate+ASC'),
    xeroFetch('/Invoices?Type=ACCREC&Statuses=PAID&order=FullyPaidOnDate+DESC&page=1&pageSize=100'),
    xeroFetch(`/Invoices?Type=ACCPAY&Statuses=AUTHORISED,PAID&where=Date>%3D"${sixMonthsAgo}"`),
  ])

  const today = new Date(); today.setHours(0, 0, 0, 0)

  function parseXeroDate(d: string | null | undefined): Date | null {
    if (!d) return null
    const m = d.match(/\/Date\((\d+)/)
    return m ? new Date(parseInt(m[1])) : null
  }

  const outstandingRaw: XeroInvoice[] = outstandingRes.status === 'fulfilled' && outstandingRes.value.ok
    ? ((await outstandingRes.value.json()).Invoices ?? []) : []
  const outstanding = outstandingRaw.map(inv => {
    const due = parseXeroDate(inv.DueDate)
    const daysOverdue = due ? Math.floor((today.getTime() - due.getTime()) / 86400000) : 0
    return {
      id: inv.InvoiceID, contact: inv.Contact.Name, invoiceNumber: inv.InvoiceNumber,
      dueDate: due ? due.toISOString().slice(0, 10) : null,
      amountDuePence: Math.round(inv.AmountDue * 100),
      totalPence: Math.round(inv.Total * 100), daysOverdue,
    }
  })

  const paidRaw: XeroInvoice[] = paidRes.status === 'fulfilled' && paidRes.value.ok
    ? ((await paidRes.value.json()).Invoices ?? []) : []
  const paidWithDates = paidRaw
    .map(inv => {
      const raised = parseXeroDate(inv.Date)
      const paid = parseXeroDate(inv.FullyPaidOnDate)
      const daysToPay = raised && paid ? Math.floor((paid.getTime() - raised.getTime()) / 86400000) : null
      return { total: inv.Total, daysToPay }
    })
    .filter(i => i.total > 100)
  const avgInvoiceValuePence = paidWithDates.length
    ? Math.round((paidWithDates.reduce((s, i) => s + i.total, 0) / paidWithDates.length) * 100) : 0
  const withDays = paidWithDates.filter(i => i.daysToPay !== null && i.daysToPay >= 0)
  const avgDaysToPay = withDays.length
    ? Math.round(withDays.reduce((s, i) => s + i.daysToPay!, 0) / withDays.length) : null

  type XeroBill = { Contact: { Name: string }; Total: number }
  const billsRaw: XeroBill[] = billsRes.status === 'fulfilled' && billsRes.value.ok
    ? ((await billsRes.value.json()).Invoices ?? []) : []
  const spendMap = new Map<string, { totalPence: number; count: number }>()
  for (const bill of billsRaw) {
    const name = bill.Contact.Name
    const prev = spendMap.get(name) ?? { totalPence: 0, count: 0 }
    spendMap.set(name, { totalPence: prev.totalPence + Math.round(bill.Total * 100), count: prev.count + 1 })
  }
  const supplierSpend = Array.from(spendMap.entries())
    .map(([contact, v]) => ({ contact, ...v }))
    .sort((a, b) => b.totalPence - a.totalPence)
    .slice(0, 10)

  // Write all caches
  const periods = [...new Set(rows.map(r => r.period))]
  await admin.from('xero_financial_cache').delete().neq('period', '')
  await admin.from('xero_financial_cache').insert(rows)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from('xero_live_cache').upsert([
    { key: 'outstanding', value: outstanding, synced_at: now2 },
    { key: 'supplier_spend', value: supplierSpend, synced_at: now2 },
    { key: 'invoice_metrics', value: { avgInvoiceValuePence, avgDaysToPay }, synced_at: now2 },
  ])

  await admin.from('xero_connection').update({
    last_sync_at: now2,
    last_sync_error: null,
  }).eq('id', 1)

  return NextResponse.json({ ok: true, periods, rowCount: rows.length })
}
