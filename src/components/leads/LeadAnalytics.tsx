import { BarChart2, Globe, MousePointer, Calendar, ExternalLink } from 'lucide-react'

interface Props {
  calculatorData: Record<string, unknown> | null
  createdAt: string
}

function extractAnalytics(data: Record<string, unknown> | null) {
  if (!data) return null
  const fields = (data?.payload as Record<string, unknown>)?.data ?? data
  const f = fields as Record<string, unknown>

  const firstPage = f['tgr_first_page'] as string | undefined
  const firstVisit = f['tgr_first_visit'] as string | undefined
  const visitCount = f['tgr_visit_count'] as string | undefined
  const pageViews = f['tgr_page_views'] as string | undefined
  const referrer = f['tgr_referrer'] as string | undefined

  if (!firstPage && !referrer && !visitCount) return null

  return { firstPage, firstVisit, visitCount, pageViews, referrer }
}

function formatReferrer(ref: string): string {
  if (!ref || ref === 'direct') return 'Direct'
  try {
    return new URL(ref).hostname.replace('www.', '')
  } catch {
    return ref
  }
}

export function LeadAnalytics({ calculatorData, createdAt }: Props) {
  const analytics = extractAnalytics(calculatorData)

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <BarChart2 className="w-4 h-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-700">Visit Analytics</h2>
      </div>

      {!analytics ? (
        <p className="text-sm text-gray-400">No analytics data — only captured for calculator leads submitted after the tracking snippet is installed.</p>
      ) : (
        <div className="space-y-2.5">
          {analytics.firstPage && (
            <div className="flex items-start gap-2.5">
              <ExternalLink className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">First Page Seen</p>
                <p className="text-sm text-gray-700 truncate" title={analytics.firstPage}>{analytics.firstPage}</p>
              </div>
            </div>
          )}

          {analytics.referrer && (
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Traffic Source</p>
                <p className="text-sm text-gray-700">{formatReferrer(analytics.referrer)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            {analytics.visitCount && (
              <div className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Visits</p>
                <p className="text-xl font-bold text-gray-800 mt-0.5">{analytics.visitCount}</p>
              </div>
            )}
            {analytics.pageViews && (
              <div className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Page Views</p>
                <p className="text-xl font-bold text-gray-800 mt-0.5">{analytics.pageViews}</p>
              </div>
            )}
          </div>

          {analytics.firstVisit && (
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">First Visit</p>
                <p className="text-sm text-gray-700">
                  {new Date(analytics.firstVisit).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
