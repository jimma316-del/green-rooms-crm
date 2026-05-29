import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ClipboardCheck, MapPin } from 'lucide-react'
import { STAGE_CONFIG } from '@/types'

const ACTIVE_STAGES = [
  'doors_windows_ordered',
  'final_designs_confirmed',
  'design_book_created',
  'schedule_sent_to_client',
  'in_build',
  'snagging',
]

export default async function JobsPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, address, postcode, stage')
    .in('stage', ACTIVE_STAGES)
    .order('name')

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Current Jobs</h1>
      <p className="text-sm text-gray-500 mb-6">Tap a job to complete the sign-off sheet</p>

      {!leads?.length && (
        <div className="text-center py-16 text-gray-400 text-sm">No active jobs at the moment</div>
      )}

      <div className="space-y-3">
        {leads?.map(lead => {
          const cfg = STAGE_CONFIG[lead.stage]
          const address = [lead.address, lead.postcode].filter(Boolean).join(', ')
          return (
            <Link
              key={lead.id}
              href={`/jobs/${lead.id}/sign-off`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-green-400 hover:shadow-sm transition-all active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{lead.name}</p>
                  {address && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                      <p className="text-xs text-gray-500 truncate">{address}</p>
                    </div>
                  )}
                  <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${cfg?.color ?? 'bg-gray-100 text-gray-600'}`}>
                    {cfg?.label ?? lead.stage}
                  </span>
                </div>
                <div className="shrink-0 flex items-center gap-1.5 bg-green-700 text-white text-xs font-medium px-3 py-2 rounded-lg">
                  <ClipboardCheck className="w-4 h-4" />
                  Sign off
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
