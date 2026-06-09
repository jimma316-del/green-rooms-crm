import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SnaggingDetails } from '@/components/site/SnaggingDetails'
import { SnaggingArchive } from '@/components/site/SnaggingArchive'

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
    { data: adminTasks },
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

  const existingPhotos = (photos ?? [])
    .map(a => (a.metadata as { url?: string } | null)?.url)
    .filter((u): u is string => Boolean(u))

  const snaggingTask =
    (adminTasks ?? []).find(t => t.type === 'snagging' && !t.completed_at) ??
    (adminTasks ?? []).find(t => t.type === 'snagging') ??
    null

  if (lead.snagging_signed_off_at) {
    const { data: signOffActivity } = await admin
      .from('activities')
      .select('body')
      .eq('lead_id', id)
      .eq('type', 'stage_change')
      .ilike('body', 'Snagging confirmed complete%')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const rawBody = signOffActivity?.body ?? null
    const notesPrefix = 'Notes: '
    const signOffNotes = rawBody?.includes(notesPrefix)
      ? rawBody.slice(rawBody.indexOf(notesPrefix) + notesPrefix.length)
      : null

    return (
      <SnaggingArchive
        name={lead.name}
        address={[lead.address, lead.postcode].filter(Boolean).join(', ')}
        signedOffAt={lead.snagging_signed_off_at}
        taskNotes={snaggingTask?.notes ?? null}
        signOffNotes={signOffNotes}
        photos={existingPhotos}
      />
    )
  }

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
