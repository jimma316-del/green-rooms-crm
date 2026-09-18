import { TrendingUp, Send, CheckCircle, BarChart2 } from 'lucide-react'

interface Props {
  metrics: {
    totalSent: number
    accepted: number
    rejected: number
    pipelineValuePence: number
    avgAcceptedPence: number
  }
}

function fmt(pence: number) {
  if (pence >= 100000_00) return `£${(pence / 100_00 / 1000).toFixed(1)}m`
  if (pence >= 1000_00) return `£${(pence / 100_00).toFixed(0)}k`
  return `£${(pence / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
}

export function QuoteMetricsPanel({ metrics }: Props) {
  const { totalSent, accepted, rejected, pipelineValuePence, avgAcceptedPence } = metrics
  const responded = accepted + rejected
  const acceptanceRate = responded > 0 ? Math.round((accepted / responded) * 100) : null

  const tiles = [
    {
      icon: Send,
      label: 'Quotes sent',
      value: String(totalSent),
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      icon: CheckCircle,
      label: 'Acceptance rate',
      value: acceptanceRate !== null ? `${acceptanceRate}%` : '—',
      sub: responded > 0 ? `${accepted} of ${responded}` : undefined,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      icon: TrendingUp,
      label: 'Pipeline value',
      value: pipelineValuePence > 0 ? fmt(pipelineValuePence) : '—',
      sub: 'open quotes',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      icon: BarChart2,
      label: 'Avg accepted',
      value: avgAcceptedPence > 0 ? fmt(avgAcceptedPence) : '—',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Quoting</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-3">
            <div className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${bg} mb-2`}>
              <Icon size={14} className={color} />
            </div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
            {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
