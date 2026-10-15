import { BarChart2, Globe, MousePointer, Calendar, ExternalLink, Eye, TrendingUp, Clock } from 'lucide-react'

interface HubSpotData {
  visits: number
  pageViews: number
  lastVisit: string | null
  firstVisit: string | null
  source: string | null
  lastUrl: string | null
}

interface Props {
  calculatorData: Record<string, unknown> | null
  createdAt: string
  hubspot?: HubSpotData | null
}

function extractCalculatorAnalytics(data: Record<string, unknown> | null) {
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

function formatSource(src: string): string {
  const map: Record<string, string> = {
    ORGANIC_SEARCH: 'Organic Search',
    DIRECT_TRAFFIC: 'Direct',
    REFERRALS: 'Referral',
    SOCIAL_MEDIA: 'Social Media',
    EMAIL_MARKETING: 'Email',
    PAID_SEARCH: 'Paid Search',
    OTHER_CAMPAIGNS: 'Campaign',
  }
  return map[src] ?? src.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())
}

function formatDate(ts: string | null): string {
  if (!ts) return '—'
  const d = new Date(Number(ts))
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatUrl(url: string | null): string {
  if (!url) return '—'
  try {
    const u = new URL(url)
    return u.pathname === '/' ? 'Homepage' : u.pathname
  } catch {
    return url
  }
}

export function LeadAnalytics({ calculatorData, createdAt, hubspot }: Props) {
  const calc = extractCalculatorAnalytics(calculatorData)

  // HubSpot data takes priority if available
  if (hubspot && (hubspot.visits > 0 || hubspot.pageViews > 0)) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">Visit Analytics</h2>
          </div>
          <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">HubSpot</span>
        </div>

        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Visits</p>
              <p className="text-xl font-bold text-gray-800 mt-0.5">{hubspot.visits}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Page Views</p>
              <p className="text-xl font-bold text-gray-800 mt-0.5">{hubspot.pageViews}</p>
            </div>
          </div>

          {hubspot.source && (
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Traffic Source</p>
                <p className="text-sm text-gray-700">{formatSource(hubspot.source)}</p>
              </div>
            </div>
          )}

          {hubspot.lastUrl && (
            <div className="flex items-start gap-2.5">
              <ExternalLink className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Last Page</p>
                <p className="text-sm text-gray-700 truncate" title={hubspot.lastUrl}>{formatUrl(hubspot.lastUrl)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {hubspot.firstVisit && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">First Visit</p>
                  <p className="text-xs text-gray-700">{formatDate(hubspot.firstVisit)}</p>
                </div>
              </div>
            )}
            {hubspot.lastVisit && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Last Visit</p>
                  <p className="text-xs text-gray-700">{formatDate(hubspot.lastVisit)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Fall back to calculator data
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <BarChart2 className="w-4 h-4 text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-700">Visit Analytics</h2>
      </div>

      {!calc ? (
        <p className="text-sm text-gray-400">No analytics data — HubSpot tracks identified contacts once they submit a form or click an email link.</p>
      ) : (
        <div className="space-y-2.5">
          {calc.firstPage && (
            <div className="flex items-start gap-2.5">
              <ExternalLink className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">First Page Seen</p>
                <p className="text-sm text-gray-700 truncate" title={calc.firstPage}>{calc.firstPage}</p>
              </div>
            </div>
          )}

          {calc.referrer && (
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Traffic Source</p>
                <p className="text-sm text-gray-700">{formatReferrer(calc.referrer)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            {calc.visitCount && (
              <div className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Visits</p>
                <p className="text-xl font-bold text-gray-800 mt-0.5">{calc.visitCount}</p>
              </div>
            )}
            {calc.pageViews && (
              <div className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Page Views</p>
                <p className="text-xl font-bold text-gray-800 mt-0.5">{calc.pageViews}</p>
              </div>
            )}
          </div>

          {calc.firstVisit && (
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">First Visit</p>
                <p className="text-sm text-gray-700">
                  {new Date(calc.firstVisit).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
