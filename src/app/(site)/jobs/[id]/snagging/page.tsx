import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SnaggingDetails } from '@/components/site/SnaggingDetails'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SnaggingPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const [
    { data: lead },
    { data: photos },
    { data: adminTasks, error: adminTasksError },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('id, name, address, postcode, snagging_signed_off_at')
      .eq('id', id)
      .single(),
    admin
      .from('activities')
      .select('id, metadata')
      .eq('lead_id', id)
      .eq('type', 'snagging_photo')
      .order('created_at', { ascending: true }),
    admin
      .from('tasks')
      .select('id, title, notes, type, completed_at')
      .eq('lead_id', id),
  ])

  if (!lead) notFound()
  if (lead.snagging_signed_off_at) redirect('/jobs')

  const existingPhotos = (photos ?? [])
    .map(a => (a.metadata as { url?: string } | null)?.url)
    .filter((u): u is string => Boolean(u))

  const snaggingTask =
    (adminTasks ?? []).find(t => t.type === 'snagging' && !t.completed_at) ??
    (adminTasks ?? []).find(t => t.type === 'snagging') ??
    null

  return (
    <SnaggingDetails
      leadId={id}
      name={lead.name}
      address={[lead.address, lead.postcode].filter(Boolean).join(', ')}
      existingPhotos={existingPhotos}
      task={snaggingTask}
    />
  )
}
