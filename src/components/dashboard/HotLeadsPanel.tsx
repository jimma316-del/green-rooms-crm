import Link from 'next/link'
import { Flame } from 'lucide-react'
import { STAGE_CONFIG } from '@/types'
import type { Stage } from '@/types'
import { formatDistanceToNow } from '@/utils/date'

interface Lead {
  id: string
  name: string
  stage: string
  project_type: string | null
  updated_at: string
  postcode: string | null
}

export function HotLeadsPanel({ leads }: { leads: Lead[] }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-500" />
          <h2 className="text-sm font-semibold text-[var(--primary)]">Hot Leads</h2>
        </div>
        <Link href="/leads?hot=true" className="text-xs text-[var(--primary)] hover:underline">View all →</Link>
      </div>

      {leads.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No hot leads right now</p>
      ) : (
        <div className="space-y-2">
          {leads.map(lead => {
            const cfg = STAGE_CONFIG[lead.stage as Stage]
            return (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[var(--primary)]">{lead.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {lead.postcode ?? ''}{lead.postcode && lead.project_type ? ' · ' : ''}{lead.project_type ?? ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg?.color ?? 'bg-gray-100 text-gray-600'}`}>
                    {cfg?.label ?? lead.stage}
                  </span>
                  <span className="text-[10px] text-gray-400">{formatDistanceToNow(lead.updated_at)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
