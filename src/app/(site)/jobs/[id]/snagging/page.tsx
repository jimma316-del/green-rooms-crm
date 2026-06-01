import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SnaggingSignOff } from '@/components/site/SnaggingSignOff'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SnaggingPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: lead }, { data: photos }, { data: tasks }] = await Promise.all([
    supabase
      .from('leads')
      .select('id, name, address, postcode, snagging_signed_off_at')
      .eq('id', id)
      .single(),
    supabase
      .from('activities')
      .select('id, metadata')
      .eq('lead_id', id)
      .eq('type', 'snagging_photo')
      .order('created_at', { ascending: true }),
    supabase
      .from('tasks')
      .select('id, title, notes')
      .eq('lead_id', id)
      .eq('type', 'snagging')
      .is('completed_at', null)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  if (!lead) notFound()
  if (lead.snagging_signed_off_at) redirect('/jobs')

  const existingPhotos = (photos ?? [])
    .map(a => (a.metadata as { url?: string } | null)?.url)
    .filter((u): u is string => Boolean(u))

  const snaggingTask = tasks?.[0] ?? null

  return (
    <SnaggingSignOff
      leadId={id}
      name={lead.name}
      address={[lead.address, lead.postcode].filter(Boolean).join(', ')}
      existingPhotos={existingPhotos}
      task={snaggingTask}
    />
  )
}
