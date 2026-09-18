'use client'

import { useState, useMemo } from 'react'
import { Check, Clock, Eye, X, FileText, TrendingUp, DollarSign, BarChart2 } from 'lucide-react'

interface Lead {
  id: string
  name: string
  email: string | null
  address: string | null
  postcode: string | null
}

interface QuoteVersion {
  id: string
  version_number: number
  status: string
  total_pence: number
  is_current: boolean
  created_at: string
  sent_at: string | null
  viewed_at: string | null
  responded_at: string | null
  client_token: string | null
}

interface Quote {
  id: string
  quote_ref: string
  created_at: string
  leads: Lead
  currentVersion: QuoteVersion | null
}

interface Props { quotes: Quote[] }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function poundStr(pence: number) {
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function daysAgo(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  draft:    { label: 'Draft',    icon: <FileText size={12} />,  bg: 'bg-gray-100',   text: 'text-gray-600' },
  sent:     { label: 'Sent',     icon: <Clock size={12} />,     bg: 'bg-blue-100',   text: 'text-blue-700' },
  viewed:   { label: 'Viewed',   icon: <Eye size={12} />,       bg: 'bg-yellow-100', text: 'text-yellow-700' },
  accepted: { label: 'Accepted', icon: <Check size={12} />,     bg: 'bg-green-100',  text: 'text-green-700' },
  rejected: { label: 'Rejected', icon: <X size={12} />,         bg: 'bg-red-100',    text: 'text-red-600' },
  superseded: { label: 'Superseded', icon: <FileText size={12} />, bg: 'bg-gray-100', text: 'text-gray-400' },
}

const STATUSES = ['all', 'draft', 'sent', 'viewed', 'accepted', 'rejected']

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</span>
        <span className="text-[var(--primary)] opacity-60">{icon}</span>
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

// ─── Quote Row ────────────────────────────────────────────────────────────────
function QuoteRow({ quote }: { quote: Quote }) {
  const v = quote.currentVersion
  const lead = quote.leads
  const status = v?.status ?? 'draft'
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft

  const lastActivity = v?.responded_at ?? v?.viewed_at ?? v?.sent_at ?? quote.created_at

  return (
    <a
      href={`/leads/${lead.id}/quotes/${quote.id}`}
      className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors -mx-4 px-4 rounded-lg group"
    >
      {/* Ref + lead */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-semibold text-[var(--primary)]">{quote.quote_ref}</span>
          {v && v.version_number > 1 && (
            <span className="text-xs text-gray-400">v{v.version_number}</span>
          )}
          <span className="text-sm font-medium text-gray-900">{lead.name}</span>
        </div>
        {lead.address && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {[lead.address, lead.postcode].filter(Boolean).join(', ')}
          </p>
        )}
      </div>

      {/* Status */}
      <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full shrink-0 ${cfg.bg} ${cfg.text}`}>
        {cfg.icon}
        {cfg.label}
      </div>

      {/* Total */}
      <div className="text-sm font-semibold text-gray-900 shrink-0 w-20 text-right">
        {v ? poundStr(v.total_pence) : '—'}
      </div>

      {/* Last activity */}
      <div className="text-xs text-gray-400 shrink-0 w-20 text-right">
        {daysAgo(lastActivity)}
      </div>
    </a>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function QuotesDashboardClient({ quotes }: Props) {
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return quotes.filter(quote => {
      const status = quote.currentVersion?.status ?? 'draft'
      if (filterStatus !== 'all' && status !== filterStatus) return false
      if (q) {
        const haystack = [quote.quote_ref, quote.leads.name, quote.leads.email ?? '', quote.leads.postcode ?? ''].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [quotes, filterStatus, search])

  // Stats
  const stats = useMemo(() => {
    const sent = quotes.filter(q => ['sent', 'viewed', 'accepted'].includes(q.currentVersion?.status ?? ''))
    const accepted = quotes.filter(q => q.currentVersion?.status === 'accepted')
    const totalValue = accepted.reduce((s, q) => s + (q.currentVersion?.total_pence ?? 0), 0)
    const pipeline = quotes
      .filter(q => ['draft', 'sent', 'viewed'].includes(q.currentVersion?.status ?? ''))
      .reduce((s, q) => s + (q.currentVersion?.total_pence ?? 0), 0)

    const winRate = sent.length > 0
      ? Math.round((accepted.length / sent.length) * 100)
      : 0

    return { totalValue, pipeline, winRate, total: quotes.length, accepted: accepted.length }
  }, [quotes])

  const countsByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: quotes.length }
    for (const q of quotes) {
      const s = q.currentVersion?.status ?? 'draft'
      counts[s] = (counts[s] ?? 0) + 1
    }
    return counts
  }, [quotes])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Total quotes"
          value={stats.total.toString()}
          icon={<FileText size={16} />}
        />
        <StatCard
          label="Pipeline value"
          value={poundStr(stats.pipeline)}
          sub="draft + sent + viewed"
          icon={<TrendingUp size={16} />}
        />
        <StatCard
          label="Won value"
          value={poundStr(stats.totalValue)}
          sub={`${stats.accepted} accepted`}
          icon={<DollarSign size={16} />}
        />
        <StatCard
          label="Win rate"
          value={`${stats.winRate}%`}
          sub="of sent quotes"
          icon={<BarChart2 size={16} />}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search quotes, clients…"
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)] flex-1 min-w-48"
        />
        <div className="flex gap-1 flex-wrap">
          {STATUSES.map(s => {
            const count = countsByStatus[s] ?? 0
            const isActive = filterStatus === s
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-2 rounded-lg border transition-colors capitalize ${
                  isActive
                    ? 'border-[var(--primary)] bg-green-50 text-[var(--primary)] font-medium'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {s === 'all' ? 'All' : s} {count > 0 && <span className="ml-0.5 opacity-60">({count})</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 px-4">
        {/* Column headers */}
        <div className="flex items-center gap-4 py-2 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
          <span className="flex-1">Quote / Client</span>
          <span className="w-24 text-center">Status</span>
          <span className="w-20 text-right">Total</span>
          <span className="w-20 text-right">Activity</span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No quotes found</p>
            {search && <button onClick={() => setSearch('')} className="mt-1 text-[var(--primary)] text-sm hover:opacity-70">Clear search</button>}
          </div>
        ) : (
          filtered.map(q => <QuoteRow key={q.id} quote={q} />)
        )}
      </div>
    </div>
  )
}
