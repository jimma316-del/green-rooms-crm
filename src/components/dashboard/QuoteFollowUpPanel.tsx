'use client'

import { Clock } from 'lucide-react'

interface FollowUpQuote {
  quoteId: string
  leadId: string
  leadName: string
  quoteRef: string
  totalPence: number
  viewedAt: string
  daysSinceViewed: number
}

interface Props {
  quotes: FollowUpQuote[]
}

function fmt(pence: number) {
  return `£${(pence / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
}

export function QuoteFollowUpPanel({ quotes }: Props) {
  if (!quotes.length) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={15} className="text-amber-600" />
        <h3 className="text-sm font-semibold text-amber-800">
          {quotes.length} quote{quotes.length > 1 ? 's' : ''} viewed — no response yet
        </h3>
      </div>
      <div className="space-y-2">
        {quotes.map(q => (
          <a
            key={q.quoteId}
            href={`/leads/${q.leadId}/quotes/${q.quoteId}`}
            className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-amber-100 hover:border-amber-300 transition-colors group"
          >
            <div>
              <p className="text-sm font-medium text-gray-900 group-hover:text-amber-800">{q.leadName}</p>
              <p className="text-xs text-gray-400">{q.quoteRef} · viewed {q.daysSinceViewed}d ago</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">{fmt(q.totalPence)}</p>
              <p className="text-[10px] text-amber-600 font-medium">Follow up →</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
