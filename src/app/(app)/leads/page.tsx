import { createClient } from '@/lib/supabase/server'
import { LeadsTable } from '@/components/leads/LeadsTable'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{
    q?: string
    stage?: string
    pipeline?: string
    source?: string
    hot?: string
    marketing?: string
    page?: string
    sort?: string
    dir?: string
  }>
}

const PAGE_SIZE = 50

const SORT_COLUMN_MAP: Record<string, string> = {
  name:             'name',
  address:          'address',
  first_contact_at: 'created_at',
  stage:            'stage_order',
  distance_miles:   'distance_miles',
}

export default async function LeadsPage({ searchParams }: Props) {
  const params = await searchParams
  const page = parseInt(params.page ?? '1') - 1
  const sortCol = SORT_COLUMN_MAP[params.sort ?? ''] ?? 'created_at'
  const ascending = params.dir === 'asc'
  const supabase = await createClient()

  let query = supabase
    .from('leads')
    .select('id, name, mobile, email, address, address_line_2, city, postcode, stage, pipeline, is_hot, lead_source, updated_at, created_at, first_contact_at, assigned_to, marketing_consent, distance_miles, sms_sent_at, tasks(id, title, due_date, completed_at)', { count: 'exact' })

  if (params.q) {
    query = query.or(`name.ilike.%${params.q}%,email.ilike.%${params.q}%,mobile.ilike.%${params.q}%,postcode.ilike.%${params.q}%`)
  }
  if (params.stage) query = query.eq('stage', params.stage)
  if (params.pipeline) query = query.eq('pipeline', params.pipeline)
  if (params.source) query = query.eq('lead_source', params.source)
  if (params.hot === 'true') query = query.eq('is_hot', true)
  if (params.marketing === 'true') query = query.eq('marketing_consent', true)
  query = query.eq('is_newsletter', false)

  const { data: leads, count } = await query
    .order(sortCol, { ascending, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  // Find emails that appear more than once (duplicates)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emails = ((leads ?? []) as any[]).map((l: any) => l.email as string | null).filter(Boolean) as string[]
  const emailCounts: Record<string, number> = {}
  for (const e of emails) emailCounts[e] = (emailCounts[e] ?? 0) + 1
  const duplicateEmails = new Set(Object.keys(emailCounts).filter(e => emailCounts[e] > 1))

  return (
    <div className="px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">{count ?? 0} total</p>
        </div>
      </div>
      <LeadsTable leads={leads ?? []} total={count ?? 0} page={page + 1} pageSize={PAGE_SIZE} duplicateEmails={duplicateEmails} />
    </div>
  )
}
