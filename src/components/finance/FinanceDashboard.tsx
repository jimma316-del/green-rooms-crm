'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

interface CacheRow {
  period: string
  account_name: string
  net_amount_pence: number
}

interface Connection {
  org_name: string
  last_sync_at: string | null
  last_sync_error: string | null
}

interface Props {
  connection: Connection
  cacheRows: CacheRow[]
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
      case 'Total Income':           m.revenue = row.net_amount_pence; break
      case 'Total Cost of Sales':    m.costOfSales = row.net_amount_pence; break
      case 'Gross Profit':           m.grossProfit = row.net_amount_pence; break
      case 'Total Operating Expenses': m.opex = row.net_amount_pence; break
      case 'Net Profit':             m.netProfit = row.net_amount_pence; break
    }
  }
  return map
}

function sum(months: MonthData[], key: keyof Omit<MonthData, 'period'>): number {
  return months.reduce((acc, m) => acc + m[key], 0)
}

export function FinanceDashboard({ connection, cacheRows }: Props) {
  const router = useRouter()
  const [view, setView] = useState<'ytd' | 'last12'>('ytd')
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const allMonths = useMemo(() => {
    const map = buildMonthData(cacheRows)
    return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period))
  }, [cacheRows])

  const fyStart = getFYStartPeriod()

  const months = useMemo(() => {
    if (view === 'ytd') return allMonths.filter(m => m.period >= fyStart)
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
              ? `Last synced ${new Date(connection.last_sync_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · Cash basis`
              : 'Never synced · Cash basis'}
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
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setView('ytd')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                view === 'ytd'
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              This financial year
            </button>
            <button
              onClick={() => setView('last12')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                view === 'last12'
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Last 12 months
            </button>
          </div>
          {months.length > 0 && (
            <p className="text-xs text-gray-400 -mt-3 mb-5">
              {periodFull(months[0].period)} – {periodFull(months[months.length - 1].period)}
            </p>
          )}

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
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

          {/* Bar chart */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
            <div className="flex items-center gap-4 mb-4">
              <p className="text-sm font-semibold text-gray-700">Monthly Overview</p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-teal-200 inline-block" />Revenue</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Net profit</span>
              </div>
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
                      <div
                        className={`flex-1 rounded-t ${netPositive ? 'bg-emerald-500' : 'bg-red-400'}`}
                        style={{ height: netH }}
                        title={`Net profit: ${fmt(m.netProfit)}`}
                      />
                    </div>
                    <span className="text-[8px] text-gray-400 truncate w-full text-center">{periodLabel(m.period)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Monthly breakdown table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Monthly Breakdown</p>
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
                  {months.map((m, i) => (
                    <tr key={m.period} className={`border-b border-gray-50 last:border-0 text-right ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className="py-2.5 px-5 text-left text-gray-600 font-medium whitespace-nowrap">{periodFull(m.period)}</td>
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
                  ))}
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
        </>
      )}
    </div>
  )
}
