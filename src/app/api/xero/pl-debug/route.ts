import { NextResponse } from 'next/server'
import { xeroFetch } from '@/lib/xero'

export async function GET() {
  const now = new Date()
  const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const fromDate = new Date(now.getFullYear(), now.getMonth() - 10, 1)
  const fromStr = fromDate.toISOString().slice(0, 10)
  const toStr = toDate.toISOString().slice(0, 10)

  const res = await xeroFetch(
    `/Reports/ProfitAndLoss?fromDate=${fromStr}&toDate=${toStr}&periods=11&timeframe=MONTH`
  )
  const json = await res.json()

  // Return just the first few rows so we can see the structure without overwhelming output
  const report = json.Reports?.[0]
  return NextResponse.json({
    status: res.status,
    rowCount: report?.Rows?.length,
    firstFiveRows: report?.Rows?.slice(0, 5),
    reportKeys: report ? Object.keys(report) : null,
  })
}
