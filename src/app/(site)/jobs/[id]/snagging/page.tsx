import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SnaggingSignOff } from '@/components/site/SnaggingSignOff'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SnaggingPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const admin = createAdminClient()

  const [{ data: lead }, { data: photos }, { data: tasks }] = await Promise.all([
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
      .eq('lead_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!lead) notFound()
  if (lead.snagging_signed_off_at) redirect('/jobs')

  const existingPhotos = (photos ?? [])
    .map(a => (a.metadata as { url?: string } | null)?.url)
    .filter((u): u is string => Boolean(u))

  // Prefer an open snagging task; fall back to any snagging task; fall back to any task with notes
  const snaggingTask =
    tasks?.find(t => t.type === 'snagging' && !t.completed_at) ??
    tasks?.find(t => t.type === 'snagging') ??
    null

  return (
    <>
      {process.env.NODE_ENV !== 'production' || true ? (
        <pre className="text-[10px] bg-gray-100 p-2 overflow-auto max-h-32 text-gray-500">
          tasks: {JSON.stringify(tasks?.map(t => ({ id: t.id, type: t.type, notes: t.notes, completed: !!t.completed_at })), null, 2)}
        </pre>
      ) : null}
      <SnaggingSignOff
        leadId={id}
        name={lead.name}
        address={[lead.address, lead.postcode].filter(Boolean).join(', ')}
        existingPhotos={existingPhotos}
        task={snaggingTask}
      />
    </>
  )
}
