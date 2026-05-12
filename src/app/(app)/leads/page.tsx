import { createClient } from '@/lib/supabase/server'
import { LeadsTable } from '@/components/leads/LeadsTable'

interface Props {
  searchParams: Promise<{
    q?: string
    stage?: string
    pipeline?: string
    source?: string
    hot?: string
    page?: string
  }>
}

const PAGE_SIZE = 30

export default async function LeadsPage({ searchParams }: Props) {
  const params = await searchParams
  const page = parseInt(params.page ?? '1') - 1
  const supabase = await createClient()

  let query = supabase
    .from('leads')
    .select('id, name, mobile, email, postcode, stage, pipeline, project_type, is_hot, lead_source, updated_at, created_at, assigned_to, users(full_name)', { count: 'exact' })

  if (params.q) {
    query = query.or(`name.ilike.%${params.q}%,email.ilike.%${params.q}%,mobile.ilike.%${params.q}%,postcode.ilike.%${params.q}%`)
  }
  if (params.stage) query = query.eq('stage', params.stage)
  if (params.pipeline) query = query.eq('pipeline', params.pipeline)
  if (params.source) query = query.eq('lead_source', params.source)
  if (params.hot === 'true') query = query.eq('is_hot', true)

  const { data: leads, count } = await query
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  return (
    <div className="px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">{count ?? 0} total</p>
        </div>
      </div>
      <LeadsTable leads={leads ?? []} total={count ?? 0} page={page + 1} pageSize={PAGE_SIZE} />
    </div>
  )
}
