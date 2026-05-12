import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LeadHeader } from '@/components/leads/LeadHeader'
import { LeadContact } from '@/components/leads/LeadContact'
import { LeadProject } from '@/components/leads/LeadProject'
import { ActivityFeed } from '@/components/leads/ActivityFeed'
import { TasksList } from '@/components/tasks/TasksList'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LeadPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: lead },
    { data: activities },
    { data: tasks },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('*, users(id, full_name, avatar_url)')
      .eq('id', id)
      .single(),
    supabase
      .from('activities')
      .select('*, users(full_name, avatar_url)')
      .eq('lead_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('*, users!tasks_assigned_to_fkey(full_name)')
      .eq('lead_id', id)
      .is('completed_at', null)
      .order('due_date', { ascending: true }),
  ])

  if (!lead) notFound()

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
      <LeadHeader lead={lead} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* Left column */}
        <div className="md:col-span-1 space-y-4">
          <LeadContact lead={lead} />
          <LeadProject lead={lead} />
        </div>

        {/* Right column */}
        <div className="md:col-span-2 space-y-4">
          <TasksList tasks={tasks ?? []} leadId={id} />
          <ActivityFeed activities={activities ?? []} leadId={id} />
        </div>
      </div>
    </div>
  )
}
