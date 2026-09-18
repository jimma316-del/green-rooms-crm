'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'

interface CacheRow {
  period: string
  account_name: string
  account_type: string | null
  net_amount_pence: number
}

interface Connection {
  org_name: string
  last_sync_at: string | null
  last_sync_error: string | null
}

interface OutstandingInvoice {
  id: string
  contact: string
  invoiceNumber: string
  dueDate: string | null
  amountDuePence: number
  totalPence: number
  daysOverdue: number
}

interface SupplierSpend {
  contact: string
  totalPence: number
  count: number
}

interface Props {
  connection: Connection
  cacheRows: CacheRow[]
  outstanding: OutstandingInvoice[]
  supplierSpend: SupplierSpend[]
  avgInvoiceValuePence: number
  avgDaysToPay: number | null
  bankFeedsConnected: boolean
  bankByMonth: Record<string, number>
}

interface MonthData {
  period: string
  revenue: number
  costOfSales: number
  grossProfit: number
  opex: number
  netProfit: number
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NUMS = ['01','02','03','04','05','06','07','08','09','10','11','12']

const SUMMARY_NAMES = new Set(['Total Income', 'Total Cost of Sales', 'Gross Profit', 'Total Operating Expenses', 'Net Profit'])

function fmt(pence: number): string {
  const abs = Math.abs(pence / 100)
  const str = new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(abs)
  return pence < 0 ? `(${str})` : str
}

function fmtPct(numerator: number, denominator: number): string {
  if (!denominator) return '—'
  return `${((numerator / denominator) * 100).toFixed(1)}%`
}

function periodLabel(period: string): string {
  const [y, m] = period.split('-')
  return `${MONTHS[parseInt(m) - 1]} '${y.slice(2)}`
}

function periodFull(period: string): string {
  const [y, m] = period.split('-')
  return `${MONTHS[parseInt(m) - 1]} ${y}`
}

function getFYStartPeriod(): string {
  const now = new Date()
  const m = now.getMonth() + 1
  const y = now.getFullYear()
  return `${m >= 4 ? y : y - 1}-04`
}

function buildMonthData(rows: CacheRow[]): Map<string, MonthData> {
  const map = new Map<string, MonthData>()
  for (const row of rows) {
    if (!map.has(row.period)) {
      map.set(row.period, { period: row.period, revenue: 0, costOfSales: 0, grossProfit: 0, opex: 0, netProfit: 0 })
    }
    const m = map.get(row.period)!
    switch (row.account_name) {
      case 'Total Income':             m.revenue = row.net_amount_pence; break
      case 'Total Cost of Sales':      m.costOfSales = row.net_amount_pence; break
      case 'Gross Profit':             m.grossProfit = row.net_amount_pence; break
      case 'Total Operating Expenses': m.opex = row.net_amount_pence; break
      case 'Net Profit':               m.netProfit = row.net_amount_pence; break
    }
  }
  return map
}

function sum(months: MonthData[], key: keyof Omit<MonthData, 'period'>): number {
  return months.reduce((acc, m) => acc + m[key], 0)
}

// Section display order and labels
const SECTION_ORDER = ['Income', 'Cost of Sales', 'Operating Expenses']
const SECTION_LABELS: Record<string, string> = {
  'Income': 'Income',
  'Cost of Sales': 'Cost of Sales',
  'Operating Expenses': 'Operating Expenses',
}

// FY month order: Apr first, ending Mar
const FY_MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
const CAL_MONTH_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

function medianOf(vals: number[]): number {
  if (!vals.length) return 0
  const s = [...vals].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function buildYoY(monthData: Map<string, MonthData>, groupByFY: boolean, hideOutliers: boolean) {
  // Map each period to a year-label and month number
  const yearMap = new Map<string, Map<number, MonthData>>()

  for (const [period, data] of monthData) {
    if (data.revenue === 0 && data.netProfit === 0) continue
    const y = parseInt(period.slice(0, 4))
    const m = parseInt(period.slice(5, 7))
    const label = groupByFY
      ? `FY${m >= 4 ? y : y - 1}/${String(m >= 4 ? y + 1 : y).slice(2)}`
      : String(y)
    if (!yearMap.has(label)) yearMap.set(label, new Map())
    yearMap.get(label)!.set(m, data)
  }

  const years = Array.from(yearMap.keys()).sort()
  const monthOrder = groupByFY ? FY_MONTH_ORDER : CAL_MONTH_ORDER

  // Outlier thresholds: median revenue per year × 5
  const outlierThreshold = new Map<string, number>()
  if (hideOutliers) {
    for (const [yr, mMap] of yearMap) {
      const revs = Array.from(mMap.values()).map(d => d.revenue).filter(r => r > 0)
      outlierThreshold.set(yr, medianOf(revs) * 5)
    }
  }

  const rows = monthOrder.map(monthNum => {
    const byYear: Record<string, MonthData | null> = {}
    const isOutlier: Record<string, boolean> = {}
    for (const yr of years) {
      const d = yearMap.get(yr)?.get(monthNum) ?? null
      byYear[yr] = d
      isOutlier[yr] = hideOutliers && !!d && d.revenue > (outlierThreshold.get(yr) ?? Infinity)
    }
    return { monthNum, byYear, isOutlier }
  })

  // Annual totals — exclude outlier months
  const yearTotals: Record<string, { revenue: number; netProfit: number }> = {}
  for (const yr of years) {
    let rev = 0, net = 0
    for (const monthNum of monthOrder) {
      const d = yearMap.get(yr)?.get(monthNum)
      if (!d) continue
      const outlier = hideOutliers && d.revenue > (outlierThreshold.get(yr) ?? Infinity)
      if (!outlier) { rev += d.revenue; net += d.netProfit }
    }
    yearTotals[yr] = { revenue: rev, netProfit: net }
  }

  const outlierCount = hideOutliers
    ? rows.reduce((acc, r) => acc + years.filter(y => r.isOutlier[y]).length, 0)
    : 0

  return { years, rows, yearTotals, outlierCount }
}

function buildDetailSections(rows: CacheRow[], period: string) {
  const periodRows = rows.filter(r => r.period === period && !SUMMARY_NAMES.has(r.account_name))
  const bySection = new Map<string, CacheRow[]>()
  for (const row of periodRows) {
    const section = row.account_type ?? 'Other'
    if (!bySection.has(section)) bySection.set(section, [])
    bySection.get(section)!.push(row)
  }
  // Return in display order, then any remaining sections
  const ordered: Array<{ section: string; rows: CacheRow[] }> = []
  for (const s of SECTION_ORDER) {
    if (bySection.has(s)) ordered.push({ section: s, rows: bySection.get(s)! })
  }
  for (const [s, r] of bySection) {
    if (!SECTION_ORDER.includes(s)) ordered.push({ section: s, rows: r })
  }
  return ordered
}

const CHART_COLORS = [
  '#0d9488','#0891b2','#7c3aed','#db2777','#f97316',
  '#ca8a04','#16a34a','#2563eb','#9333ea','#475569',
]

interface Segment { label: string; valuePence: number; color: string }

function DonutChart({ segments }: { segments: Segment[] }) {
  const r = 36
  const C = 2 * Math.PI * r
  const total = segments.reduce((s, x) => s + Math.abs(x.valuePence), 0)
  if (!total) return <p className="text-xs text-gray-400 py-8 text-center">No data for this period</p>

  let acc = 0
  const slices = segments.map(seg => {
    const frac = Math.abs(seg.valuePence) / total
    const dash = frac * C
    const offset = -(acc / total) * C
    acc += Math.abs(seg.valuePence)
    return { ...seg, dash, offset, pct: (frac * 100).toFixed(1) }
  })

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="relative shrink-0" style={{ width: 150, height: 150 }}>
        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
          {slices.map((s, i) => (
            <circle key={i} cx="50" cy="50" r={r} fill="none"
              stroke={s.color} strokeWidth="20"
              strokeDasharray={`${s.dash} ${C - s.dash}`}
              strokeDashoffset={s.offset}
            />
          ))}
        </svg>
      </div>
      <div className="flex-1 space-y-1.5 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-gray-600 truncate flex-1">{s.label}</span>
            <span className="text-xs font-semibold text-gray-800 tabular-nums shrink-0">{fmt(s.valuePence)}</span>
            <span className="text-[10px] text-gray-400 tabular-nums shrink-0 w-9 text-right">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FinanceDashboard({ connection, cacheRows, outstanding, supplierSpend, avgInvoiceValuePence, avgDaysToPay, bankFeedsConnected, bankByMonth }: Props) {
  const router = useRouter()
  const [view, setView] = useState<'ytd' | 'last12' | 'yoy'>('ytd')
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null)
  const [fyMode, setFyMode] = useState(true)
  const [hideOutliers, setHideOutliers] = useState(true)
  const [chartType, setChartType] = useState<'bar' | 'pl' | 'opex' | 'cogs'>('bar')

  const allMonthMap = useMemo(() => buildMonthData(cacheRows), [cacheRows])

  const allMonths = useMemo(() => {
    return Array.from(allMonthMap.values()).sort((a, b) => a.period.localeCompare(b.period))
  }, [allMonthMap])

  const yoyData = useMemo(() => buildYoY(allMonthMap, fyMode, hideOutliers), [allMonthMap, fyMode, hideOutliers])

  const fyStart = getFYStartPeriod()

  const months = useMemo(() => {
    if (view === 'ytd') return allMonths.filter(m => m.period >= fyStart)
    if (view === 'last12') return allMonths.slice(-12)
    return allMonths
  }, [allMonths, view, fyStart])

  const totals = useMemo(() => ({
    revenue:     sum(months, 'revenue'),
    costOfSales: sum(months, 'costOfSales'),
    grossProfit: sum(months, 'grossProfit'),
    opex:        sum(months, 'opex'),
    netProfit:   sum(months, 'netProfit'),
  }), [months])

  const maxBar = useMemo(() => Math.max(...months.map(m => Math.max(m.revenue, Math.abs(m.netProfit))), 1), [months])

  // Chart segments
  const activePeriods = useMemo(() => new Set(months.map(m => m.period)), [months])

  function buildCategorySegments(sectionType: string): Segment[] {
    const map = new Map<string, number>()
    for (const row of cacheRows) {
      if (!activePeriods.has(row.period)) continue
      if (row.account_type !== sectionType) continue
      if (SUMMARY_NAMES.has(row.account_name)) continue
      if (row.net_amount_pence <= 0) continue
      map.set(row.account_name, (map.get(row.account_name) ?? 0) + row.net_amount_pence)
    }
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, 9)
    const other = sorted.slice(9).reduce((s, [, v]) => s + v, 0)
    const result: Segment[] = top.map(([label, valuePence], i) => ({ label, valuePence, color: CHART_COLORS[i] }))
    if (other > 0) result.push({ label: 'Other', valuePence: other, color: '#94a3b8' })
    return result
  }

  const plSegments = useMemo<Segment[]>(() => [
    { label: 'Cost of Sales', valuePence: totals.costOfSales, color: '#f97316' },
    { label: 'Operating Expenses', valuePence: totals.opex, color: '#db2777' },
    { label: totals.netProfit >= 0 ? 'Net Profit' : 'Net Loss', valuePence: Math.abs(totals.netProfit), color: totals.netProfit >= 0 ? '#0d9488' : '#dc2626' },
  ].filter(s => s.valuePence > 0), [totals])

  const opexSegments = useMemo(() => buildCategorySegments('Operating Expenses'), [cacheRows, activePeriods])
  const cogsSegments = useMemo(() => buildCategorySegments('Cost of Sales'), [cacheRows, activePeriods])

  async function handleSync() {
    setSyncing(true)
    setSyncError(null)
    const res = await fetch('/api/xero/sync', { method: 'POST' })
    const json = await res.json()
    setSyncing(false)
    if (!res.ok) {
      setSyncError(json.error ?? 'Sync failed')
    } else {
      router.refresh()
    }
  }

  function toggleMonth(period: string) {
    setExpandedMonth(prev => prev === period ? null : period)
  }

  const hasData = cacheRows.length > 0

  return (
    <div className="px-4 md:px-6 py-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {connection.org_name} ·{' '}
            {connection.last_sync_at
              ? `Last synced ${new Date(connection.last_sync_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
              : 'Never synced'}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : hasData ? 'Refresh' : 'Sync from Xero'}
        </button>
      </div>

      {syncError && (
        <div className="flex items-start gap-2 px-4 py-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {syncError}
        </div>
      )}

      {connection.last_sync_error && !syncError && (
        <div className="flex items-start gap-2 px-4 py-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          Last sync error: {connection.last_sync_error}
        </div>
      )}

      {!hasData ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">No financial data yet. Click &quot;Sync from Xero&quot; to pull your P&amp;L data.</p>
        </div>
      ) : (
        <>
          {/* Period selector */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {([
              { key: 'ytd', label: 'This financial year' },
              { key: 'last12', label: 'Last 12 months' },
              { key: 'yoy', label: 'Year on year' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  view === key
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {view !== 'yoy' && months.length > 0 && (
            <p className="text-xs text-gray-400 -mt-3 mb-5">
              {periodFull(months[0].period)} – {periodFull(months[months.length - 1].period)}
            </p>
          )}

          {/* Year on year view */}
          {view === 'yoy' && (
            <div className="mb-4">
              {/* YoY controls */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                  <button
                    onClick={() => setFyMode(true)}
                    className={`px-3 py-1.5 transition-colors ${fyMode ? 'bg-[var(--primary)] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  >Financial year</button>
                  <button
                    onClick={() => setFyMode(false)}
                    className={`px-3 py-1.5 transition-colors border-l border-gray-200 ${!fyMode ? 'bg-[var(--primary)] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  >Calendar year</button>
                </div>
                <button
                  onClick={() => setHideOutliers(h => !h)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    hideOutliers ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {hideOutliers ? `Anomalies hidden${yoyData.outlierCount ? ` (${yoyData.outlierCount})` : ''}` : 'Show anomalies'}
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-400">
                        <th className="py-3 px-5 text-left font-medium">Month</th>
                        {yoyData.years.map(y => (
                          <th key={y} colSpan={2} className="py-3 px-4 text-center font-medium border-l border-gray-100">{y}</th>
                        ))}
                        {yoyData.years.length >= 2 && (
                          <th className="py-3 px-4 text-right font-medium border-l border-gray-100">YoY</th>
                        )}
                      </tr>
                      <tr className="border-b border-gray-100 text-[10px] text-gray-300">
                        <th className="pb-2 px-5 text-left" />
                        {yoyData.years.map(y => (
                          <>
                            <th key={`${y}-rev`} className="pb-2 px-4 text-right border-l border-gray-100">Revenue</th>
                            <th key={`${y}-net`} className="pb-2 px-4 text-right">Net profit</th>
                          </>
                        ))}
                        {yoyData.years.length >= 2 && <th className="pb-2 px-4 text-right border-l border-gray-100">Revenue</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {yoyData.rows.map(({ monthNum, byYear, isOutlier }, rowIdx) => {
                        const hasAny = yoyData.years.some(y => byYear[y] !== null)
                        if (!hasAny) return null
                        const prevYear = yoyData.years.length >= 2 ? yoyData.years[yoyData.years.length - 2] : null
                        const thisYear = yoyData.years[yoyData.years.length - 1]
                        const prevRev = prevYear && !isOutlier[prevYear] ? (byYear[prevYear]?.revenue ?? 0) : 0
                        const thisRev = !isOutlier[thisYear] ? (byYear[thisYear]?.revenue ?? 0) : 0
                        const changePct = prevRev ? ((thisRev - prevRev) / Math.abs(prevRev)) * 100 : null
                        return (
                          <tr key={monthNum} className={`border-b border-gray-50 last:border-0 ${rowIdx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                            <td className="py-2.5 px-5 text-gray-600 font-medium">{MONTHS[monthNum - 1]}</td>
                            {yoyData.years.map(y => {
                              const m = byYear[y]
                              const outlier = isOutlier[y]
                              return (
                                <>
                                  <td key={`${y}-rev`} className="py-2.5 px-4 text-right border-l border-gray-100 tabular-nums">
                                    {outlier
                                      ? <span className="text-gray-300 text-xs italic">excl.</span>
                                      : m ? <span className="text-gray-700">{fmt(m.revenue)}</span> : <span className="text-gray-300">—</span>}
                                  </td>
                                  <td key={`${y}-net`} className="py-2.5 px-4 text-right tabular-nums">
                                    {outlier
                                      ? <span className="text-gray-300 text-xs italic">excl.</span>
                                      : m
                                        ? <span className={m.netProfit < 0 ? 'text-red-500' : 'text-emerald-600'}>{fmt(m.netProfit)}</span>
                                        : <span className="text-gray-300">—</span>}
                                  </td>
                                </>
                              )
                            })}
                            {yoyData.years.length >= 2 && (
                              <td className="py-2.5 px-4 text-right border-l border-gray-100 tabular-nums">
                                {changePct !== null && prevRev > 0 ? (
                                  <span className={`text-xs font-semibold ${changePct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {changePct >= 0 ? '+' : ''}{changePct.toFixed(0)}%
                                  </span>
                                ) : <span className="text-gray-300 text-xs">—</span>}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                      {/* Annual totals */}
                      <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-sm">
                        <td className="py-3 px-5 text-gray-700">Annual total</td>
                        {yoyData.years.map(y => {
                          const t = yoyData.yearTotals[y]
                          return (
                            <>
                              <td key={`${y}-rev`} className="py-3 px-4 text-right text-gray-900 border-l border-gray-100 tabular-nums">{fmt(t.revenue)}</td>
                              <td key={`${y}-net`} className={`py-3 px-4 text-right tabular-nums ${t.netProfit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{fmt(t.netProfit)}</td>
                            </>
                          )
                        })}
                        {yoyData.years.length >= 2 && (() => {
                          const prevY = yoyData.years[yoyData.years.length - 2]
                          const thisY = yoyData.years[yoyData.years.length - 1]
                          const prev = yoyData.yearTotals[prevY].revenue
                          const curr = yoyData.yearTotals[thisY].revenue
                          const pct = prev ? ((curr - prev) / Math.abs(prev)) * 100 : null
                          return (
                            <td className="py-3 px-4 text-right border-l border-gray-100">
                              {pct !== null && prev > 0 ? (
                                <span className={`text-sm font-bold ${pct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {pct >= 0 ? '+' : ''}{pct.toFixed(0)}%
                                </span>
                              ) : '—'}
                            </td>
                          )
                        })()}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* KPI cards + chart + table — hidden in YoY mode */}
          {view !== 'yoy' && <><div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Revenue', value: totals.revenue, sub: null },
              { label: 'Cost of Sales', value: totals.costOfSales, sub: fmtPct(totals.costOfSales, totals.revenue) },
              { label: 'Gross Profit', value: totals.grossProfit, sub: fmtPct(totals.grossProfit, totals.revenue) },
              { label: 'Operating Costs', value: totals.opex, sub: fmtPct(totals.opex, totals.revenue) },
              { label: 'Net Profit', value: totals.netProfit, sub: fmtPct(totals.netProfit, totals.revenue) },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className={`text-lg font-bold leading-tight ${value < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {fmt(value)}
                </p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub} of revenue</p>}
              </div>
            ))}
          </div>

          {/* Chart card */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-sm font-semibold text-gray-700">
                {chartType === 'bar' ? 'Monthly Overview' : chartType === 'pl' ? 'P&L Split' : chartType === 'opex' ? 'Operating Expenses' : 'Cost of Sales'}
              </p>
              <div className="flex text-xs font-medium rounded-lg border border-gray-200 overflow-hidden">
                {([
                  { key: 'bar', label: 'Monthly' },
                  { key: 'pl', label: 'P&L split' },
                  { key: 'opex', label: 'OpEx' },
                  { key: 'cogs', label: 'Cost of Sales' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setChartType(key)}
                    className={`px-3 py-1.5 border-l border-gray-200 first:border-0 transition-colors ${
                      chartType === key ? 'bg-[var(--primary)] text-white' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >{label}</button>
                ))}
              </div>
            </div>

            {chartType === 'bar' && (
              <>
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-teal-200 inline-block" />Revenue</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Net profit</span>
                </div>
                <div className="flex items-end gap-1" style={{ height: 140 }}>
                  {months.map(m => {
                    const revH = Math.max(2, (m.revenue / maxBar) * 120)
                    const netH = Math.max(2, (Math.abs(m.netProfit) / maxBar) * 120)
                    const netPositive = m.netProfit >= 0
                    return (
                      <div key={m.period} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                        <div className="w-full flex gap-0.5 items-end" style={{ height: 120 }}>
                          <div className="flex-1 bg-teal-100 rounded-t" style={{ height: revH }} title={`Revenue: ${fmt(m.revenue)}`} />
                          <div className={`flex-1 rounded-t ${netPositive ? 'bg-emerald-500' : 'bg-red-400'}`} style={{ height: netH }} title={`Net profit: ${fmt(m.netProfit)}`} />
                        </div>
                        <span className="text-[8px] text-gray-400 truncate w-full text-center">{periodLabel(m.period)}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {chartType === 'pl' && <DonutChart segments={plSegments} />}
            {chartType === 'opex' && <DonutChart segments={opexSegments} />}
            {chartType === 'cogs' && <DonutChart segments={cogsSegments} />}
          </div>

          {/* Monthly breakdown table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Monthly Breakdown</p>
              <p className="text-xs text-gray-400 mt-0.5">Click a row to see the breakdown</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400 text-right">
                    <th className="py-2.5 px-5 text-left font-medium">Month</th>
                    <th className="py-2.5 px-4 font-medium">Revenue</th>
                    <th className="py-2.5 px-4 font-medium">Cost of Sales</th>
                    <th className="py-2.5 px-4 font-medium">Gross Profit</th>
                    <th className="py-2.5 px-4 font-medium">Op. Costs</th>
                    <th className="py-2.5 px-5 font-medium">Net Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m, i) => {
                    const expanded = expandedMonth === m.period
                    const sections = expanded ? buildDetailSections(cacheRows, m.period) : []
                    return (
                      <>
                        <tr
                          key={m.period}
                          onClick={() => toggleMonth(m.period)}
                          className={`border-b border-gray-50 text-right cursor-pointer transition-colors ${
                            expanded ? 'bg-gray-50 border-gray-200' : i % 2 === 0 ? 'hover:bg-gray-50/60' : 'bg-gray-50/50 hover:bg-gray-100/50'
                          }`}
                        >
                          <td className="py-2.5 px-5 text-left text-gray-600 font-medium whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              {expanded
                                ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                : <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
                              {periodFull(m.period)}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-gray-700">{fmt(m.revenue)}</td>
                          <td className="py-2.5 px-4 text-gray-500">{fmt(m.costOfSales)}</td>
                          <td className="py-2.5 px-4 text-gray-700">{fmt(m.grossProfit)}</td>
                          <td className="py-2.5 px-4 text-gray-500">{fmt(m.opex)}</td>
                          <td className={`py-2.5 px-5 font-semibold ${m.netProfit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                            <span className="flex items-center justify-end gap-1">
                              {m.netProfit >= 0
                                ? <TrendingUp className="w-3 h-3" />
                                : <TrendingDown className="w-3 h-3" />}
                              {fmt(m.netProfit)}
                            </span>
                          </td>
                        </tr>

                        {/* Drill-down detail */}
                        {expanded && sections.length > 0 && (
                          <tr key={`${m.period}-detail`} className="border-b border-gray-200">
                            <td colSpan={6} className="px-5 py-4 bg-gray-50">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {sections.map(({ section, rows }) => (
                                  <div key={section}>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{SECTION_LABELS[section] ?? section}</p>
                                    <div className="space-y-1">
                                      {rows.map(row => (
                                        <div key={row.account_name} className="flex items-center justify-between gap-4">
                                          <span className="text-xs text-gray-500 truncate">{row.account_name}</span>
                                          <span className={`text-xs font-medium tabular-nums shrink-0 ${row.net_amount_pence < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                                            {fmt(row.net_amount_pence)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                  {/* Totals row */}
                  <tr className="border-t-2 border-gray-200 bg-gray-50 text-right font-semibold text-sm">
                    <td className="py-3 px-5 text-left text-gray-700">Total</td>
                    <td className="py-3 px-4 text-gray-900">{fmt(totals.revenue)}</td>
                    <td className="py-3 px-4 text-gray-700">{fmt(totals.costOfSales)}</td>
                    <td className="py-3 px-4 text-gray-900">{fmt(totals.grossProfit)}</td>
                    <td className="py-3 px-4 text-gray-700">{fmt(totals.opex)}</td>
                    <td className={`py-3 px-5 ${totals.netProfit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{fmt(totals.netProfit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          </>}

          {/* ── Live data sections (always visible) ── */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Metrics */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Invoice insights</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Avg invoice value (last 100 paid)</span>
                  <span className="text-sm font-semibold text-gray-800">{avgInvoiceValuePence ? fmt(avgInvoiceValuePence) : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Avg days to payment</span>
                  <span className="text-sm font-semibold text-gray-800">{avgDaysToPay !== null ? `${avgDaysToPay} days` : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Outstanding invoices</span>
                  <span className="text-sm font-semibold text-gray-800">{outstanding.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Total outstanding</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {outstanding.length ? fmt(outstanding.reduce((s, i) => s + i.amountDuePence, 0)) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Top supplier spend */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-1">Top supplier spend</p>
              <p className="text-xs text-gray-400 mb-4">Last 6 months</p>
              {supplierSpend.length === 0 ? (
                <p className="text-xs text-gray-400">No bill data available</p>
              ) : (
                <div className="space-y-2">
                  {supplierSpend.map(s => (
                    <div key={s.contact} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-gray-600 truncate">{s.contact}</span>
                          <span className="text-xs font-semibold text-gray-800 ml-2 shrink-0">{fmt(s.totalPence)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1">
                          <div
                            className="bg-[var(--primary)] h-1 rounded-full"
                            style={{ width: `${Math.round((s.totalPence / supplierSpend[0].totalPence) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Outstanding invoices */}
          {outstanding.length > 0 && (
            <div className="mt-4 bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Outstanding invoices</p>
                  <p className="text-xs text-gray-400 mt-0.5">{outstanding.length} unpaid · {fmt(outstanding.reduce((s, i) => s + i.amountDuePence, 0))} total</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400">
                      <th className="py-2.5 px-5 text-left font-medium">Customer</th>
                      <th className="py-2.5 px-4 text-left font-medium">Invoice</th>
                      <th className="py-2.5 px-4 text-right font-medium">Due</th>
                      <th className="py-2.5 px-4 text-right font-medium">Amount due</th>
                      <th className="py-2.5 px-5 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outstanding.map((inv, i) => (
                      <tr key={inv.id} className={`border-b border-gray-50 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                        <td className="py-2.5 px-5 text-gray-700 font-medium">{inv.contact}</td>
                        <td className="py-2.5 px-4 text-gray-400 text-xs">{inv.invoiceNumber}</td>
                        <td className="py-2.5 px-4 text-right text-xs text-gray-500 whitespace-nowrap">
                          {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold text-gray-800 tabular-nums">{fmt(inv.amountDuePence)}</td>
                        <td className="py-2.5 px-5 text-right">
                          {inv.daysOverdue > 0 ? (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${inv.daysOverdue > 30 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                              {inv.daysOverdue}d overdue
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                              {inv.dueDate ? `due ${Math.abs(inv.daysOverdue)}d` : 'no due date'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cash position */}
          {!bankFeedsConnected && (
            <div className="mt-4 bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-1">Cash position</p>
              <p className="text-xs text-gray-400">Connect your bank feed in Xero to see your actual cash balance over time here.</p>
            </div>
          )}
          {bankFeedsConnected && Object.keys(bankByMonth).length > 0 && (
            <div className="mt-4 bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Bank activity (recent transactions)</p>
              <div className="space-y-1.5">
                {Object.entries(bankByMonth).sort().slice(-6).map(([period, pence]) => {
                  const [y, m] = period.split('-')
                  return (
                    <div key={period} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{MONTHS[parseInt(m) - 1]} {y}</span>
                      <span className={`text-sm font-semibold tabular-nums ${pence < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{fmt(pence)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
