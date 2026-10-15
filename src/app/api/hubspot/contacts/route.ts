import { NextResponse } from 'next/server'

const HUBSPOT_BASE = 'https://api.hubapi.com'

const CONTACT_PROPERTIES = [
  'firstname',
  'lastname',
  'email',
  'phone',
  'hs_analytics_source',
  'hs_analytics_source_data_1',
  'hs_analytics_source_data_2',
  'hs_analytics_last_url',
  'hs_analytics_num_page_views',
  'hs_analytics_num_visits',
  'hs_analytics_last_visit_timestamp',
  'hs_analytics_first_visit_timestamp',
  'hs_latest_source',
  'hs_latest_source_data_1',
  'createdate',
  'lastmodifieddate',
].join(',')

export async function GET() {
  const token = process.env.HUBSPOT_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'HUBSPOT_ACCESS_TOKEN not set' }, { status: 500 })

  const url = `${HUBSPOT_BASE}/crm/v3/objects/contacts?limit=100&properties=${CONTACT_PROPERTIES}&sort=-lastmodifieddate`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ error: text }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
