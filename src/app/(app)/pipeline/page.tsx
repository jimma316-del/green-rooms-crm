import { createClient } from '@/lib/supabase/server'
import { PipelineBoard } from '@/components/pipeline/PipelineBoard'
import type { Pipeline } from '@/types'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ view?: string }>
}

export default async function PipelinePage({ searchParams }: Props) {
  const { view } = await searchParams
  const pipeline: Pipeline = view === 'project' ? 'project' : 'sales'

  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, stage, pipeline, project_type, postcode, budget_min, budget_max, is_hot, tags, updated_at, assigned_to, job_date, users(full_name, avatar_url)')
    .eq('pipeline', pipeline)
    .order('updated_at', { ascending: false })

  return (
    <div className="px-4 md:px-6 py-6">
      <PipelineBoard leads={leads ?? []} pipeline={pipeline} key={pipeline} />
    </div>
  )
}
