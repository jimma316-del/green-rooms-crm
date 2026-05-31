import { createClient } from '@/lib/supabase/server'
import { STAGE_CONFIG, PROJECT_STAGES } from '@/types'
import { JobsClient } from '@/components/site/JobsClient'

export default async function JobsPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, address, postcode, stage, job_date, job_end_date, signed_off_at')
    .in('stage', PROJECT_STAGES)
    .order('job_date', { ascending: true, nullsFirst: false })

  const jobs = (leads ?? []).map(l => ({
    id: l.id,
    name: l.name,
    address: [l.address, l.postcode].filter(Boolean).join(', '),
    stage: l.stage as string,
    stageLabel: STAGE_CONFIG[l.stage]?.label ?? l.stage,
    stageColor: STAGE_CONFIG[l.stage]?.color ?? 'bg-gray-100 text-gray-600',
    jobDate: l.job_date ?? null,
    jobEndDate: l.job_end_date ?? null,
    signedOffAt: l.signed_off_at ?? null,
  }))

  return <JobsClient jobs={jobs} />
}
