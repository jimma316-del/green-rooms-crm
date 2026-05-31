import { createClient } from '@/lib/supabase/server'
import { STAGE_CONFIG } from '@/types'
import { JobsClient } from '@/components/site/JobsClient'

export default async function JobsPage() {
  const supabase = await createClient()

  const [{ data: leads }, { data: snaggingLeads }, { data: archivedLeads }] = await Promise.all([
    // Active jobs (not snagging, not paid/closed, has job date)
    supabase
      .from('leads')
      .select('id, name, address, postcode, stage, job_date, job_end_date, signed_off_at')
      .not('job_date', 'is', null)
      .neq('stage', 'paid_closed')
      .neq('stage', 'snagging')
      .neq('pipeline', 'lost')
      .order('job_date', { ascending: true, nullsFirst: false }),

    // Active snagging (not yet signed off)
    supabase
      .from('leads')
      .select('id, name, address, postcode, stage, job_date, job_end_date, snagging_signed_off_at')
      .eq('stage', 'snagging')
      .is('snagging_signed_off_at', null),

    // Archived snagging (signed off)
    supabase
      .from('leads')
      .select('id, name, address, postcode, stage, job_date, job_end_date, snagging_signed_off_at')
      .not('snagging_signed_off_at', 'is', null)
      .order('snagging_signed_off_at', { ascending: false }),
  ])

  function mapJob(l: NonNullable<typeof leads>[0]) {
    return {
      id: l.id,
      name: l.name,
      address: [l.address, l.postcode].filter(Boolean).join(', '),
      stage: l.stage as string,
      stageLabel: STAGE_CONFIG[l.stage]?.label ?? l.stage,
      stageColor: STAGE_CONFIG[l.stage]?.color ?? 'bg-gray-100 text-gray-600',
      jobDate: l.job_date ?? null,
      jobEndDate: l.job_end_date ?? null,
      signedOffAt: (l as { signed_off_at?: string | null }).signed_off_at ?? null,
    }
  }

  const jobs = (leads ?? []).map(mapJob)

  const snagging = (snaggingLeads ?? []).map(l => ({
    id: l.id,
    name: l.name,
    address: [l.address, l.postcode].filter(Boolean).join(', '),
    jobDate: l.job_date ?? null,
    jobEndDate: l.job_end_date ?? null,
  }))

  const archive = (archivedLeads ?? []).map(l => ({
    id: l.id,
    name: l.name,
    address: [l.address, l.postcode].filter(Boolean).join(', '),
    jobDate: l.job_date ?? null,
    signedOffAt: l.snagging_signed_off_at ?? null,
  }))

  return <JobsClient jobs={jobs} snagging={snagging} archive={archive} />
}
