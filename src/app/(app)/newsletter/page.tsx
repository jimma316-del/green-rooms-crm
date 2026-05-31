export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { NewsletterTable } from '@/components/newsletter/NewsletterTable'

export default async function NewsletterPage() {
  const supabase = await createClient()

  // Current newsletter subscribers
  const { data: subscribers, count } = await supabase
    .from('leads')
    .select('id, name, email, mobile, address, postcode, first_contact_at, created_at', { count: 'exact' })
    .eq('is_newsletter', true)
    .order('created_at', { ascending: false })

  // Eligible leads: marketing consent + SMS sent + no activity in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: smsActivities }, { data: recentActivities }] = await Promise.all([
    supabase.from('activities').select('lead_id').eq('type', 'sms'),
    supabase.from('activities').select('lead_id').gt('created_at', sevenDaysAgo),
  ])

  const smsLeadIds = new Set((smsActivities ?? []).map(a => a.lead_id))
  const recentLeadIds = new Set((recentActivities ?? []).map(a => a.lead_id))
  const eligibleIds = [...smsLeadIds].filter(id => !recentLeadIds.has(id))

  let eligible: typeof subscribers = []
  if (eligibleIds.length > 0) {
    const { data } = await supabase
      .from('leads')
      .select('id, name, email, mobile, address, postcode, first_contact_at, created_at')
      .in('id', eligibleIds)
      .eq('marketing_consent', true)
      .eq('is_newsletter', false)
      .neq('stage', 'lost')
      .order('created_at', { ascending: false })
    eligible = data ?? []
  }

  return (
    <div className="px-4 md:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Newsletter List</h1>
        <p className="text-sm text-gray-500 mt-0.5">{count ?? 0} subscriber{count !== 1 ? 's' : ''}</p>
      </div>
      <NewsletterTable subscribers={subscribers ?? []} eligible={eligible ?? []} />
    </div>
  )
}
