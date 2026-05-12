import Link from 'next/link'
import { Activity } from 'lucide-react'
import { formatDistanceToNow } from '@/utils/date'
import { activityIcon, activityLabel } from '@/utils/activity'

interface ActivityRow {
  id: string
  type: string
  body: string | null
  created_at: string
  lead_id: string
  leads: { name: string } | null
  users: { full_name: string } | null
}

export function RecentActivityPanel({ activities }: { activities: ActivityRow[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-[var(--primary)]" />
          <h2 className="text-sm font-semibold text-gray-700">Recent Activity</h2>
        </div>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No activity yet</p>
      ) : (
        <div className="space-y-2">
          {activities.map(activity => (
            <Link
              key={activity.id}
              href={`/leads/${activity.lead_id}`}
              className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <span className="text-base leading-none mt-0.5 shrink-0">{activityIcon(activity.type)}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[var(--primary)]">
                  {activity.leads?.name ?? 'Unknown lead'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {activityLabel(activity.type)}{activity.body ? ` — ${activity.body}` : ''}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{formatDistanceToNow(activity.created_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
