export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import ReportsClient from '@/components/reports/ReportsClient'

interface HubSpotContact {
  id: string
  properties: {
    firstname?: string
    lastname?: string
    email?: string
    phone?: string
    hs_analytics_source?: string
    hs_analytics_source_data_1?: string
    hs_analytics_last_url?: string
    hs_analytics_num_page_views?: string
    hs_analytics_num_visits?: string
    hs_analytics_last_visit_timestamp?: string
    hs_analytics_first_visit_timestamp?: string
    hs_latest_source?: string
    hs_latest_source_data_1?: string
    createdate?: string
    lastmodifieddate?: string
  }
}

async function fetchHubSpotContacts(): Promise<HubSpotContact[]> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN
  if (!token) return []

  const CONTACT_PROPERTIES = [
    'firstname', 'lastname', 'email', 'phone',
    'hs_analytics_source', 'hs_analytics_source_data_1',
    'hs_analytics_last_url', 'hs_analytics_num_page_views',
    'hs_analytics_num_visits', 'hs_analytics_last_visit_timestamp',
    'hs_analytics_first_visit_timestamp', 'hs_latest_source',
    'hs_latest_source_data_1', 'createdate', 'lastmodifieddate',
  ].join(',')

  try {
    const res = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=${CONTACT_PROPERTIES}&sort=-lastmodifieddate`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 300 },
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.results ?? []
  } catch {
    return []
  }
}

export default async function ReportsPage() {
  const admin = createAdminClient()

  const [contacts, { data: leads }] = await Promise.all([
    fetchHubSpotContacts(),
    admin
      .from('leads')
      .select('id, name, email, stage')
      .not('email', 'is', null),
  ])

  // Build email → lead lookup for cross-referencing
  const leadsByEmail: Record<string, { id: string; name: string; stage: string }> = {}
  for (const lead of leads ?? []) {
    if (lead.email) leadsByEmail[lead.email.toLowerCase()] = lead
  }

  // Enrich contacts with CRM match
  const enriched = contacts.map(c => ({
    ...c,
    crmLead: c.properties.email
      ? (leadsByEmail[c.properties.email.toLowerCase()] ?? null)
      : null,
  }))

  // Source breakdown
  const sourceCounts: Record<string, number> = {}
  for (const c of contacts) {
    const src = c.properties.hs_latest_source ?? c.properties.hs_analytics_source ?? 'Unknown'
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1
  }
  const sources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({ source, count }))

  return (
    <ReportsClient
      contacts={enriched}
      sources={sources}
      totalContacts={contacts.length}
    />
  )
}
