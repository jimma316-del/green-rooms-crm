import { NextResponse } from 'next/server'
import { xeroFetch } from '@/lib/xero'

interface XeroCell { Value: string }
interface XeroRow {
  RowType: string
  Title?: string
  Cells?: XeroCell[]
  Rows?: XeroRow[]
}

export async function GET() {
  // Just one month to keep the output manageable
  const now = new Date()
  const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const fromStr = fromDate.toISOString().slice(0, 10)
  const toStr = toDate.toISOString().slice(0, 10)

  const res = await xeroFetch(
    `/Reports/ProfitAndLoss?fromDate=${fromStr}&toDate=${toStr}&periods=1&timeframe=MONTH`
  )
  const json = await res.json()
  const report = json.Reports?.[0]
  if (!report) return NextResponse.json({ error: 'No report', raw: json })

  // Extract period header (col 1 = the month, col 0 = row label)
  const headerRow: XeroRow | undefined = report.Rows?.find((r: XeroRow) => r.RowType === 'Header')
  const periodHeader = headerRow?.Cells?.[1]?.Value ?? '?'

  // Flatten all rows into a readable list: section > row name > value
  const rows: { section: string; rowType: string; name: string; value: string }[] = []

  for (const section of report.Rows ?? []) {
    if (section.RowType === 'Header') continue
    const sectionTitle = section.Title ?? '(no title)'
    if (section.RowType === 'Section') {
      for (const row of section.Rows ?? []) {
        const name = row.Cells?.[0]?.Value ?? ''
        const value = row.Cells?.[1]?.Value ?? ''
        rows.push({ section: sectionTitle, rowType: row.RowType, name, value })
      }
    } else {
      const name = section.Cells?.[0]?.Value ?? ''
      const value = section.Cells?.[1]?.Value ?? ''
      rows.push({ section: '(top level)', rowType: section.RowType, name, value })
    }
  }

  return NextResponse.json({
    period: periodHeader,
    dateRange: `${fromStr} to ${toStr}`,
    totalRows: rows.length,
    rows,
  })
}
