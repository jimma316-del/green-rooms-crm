import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { autoAdvanceSiteVisits, autoAdvanceToAwaitingPayment } from '@/lib/autoAdvance'
import { LeadHeader } from '@/components/leads/LeadHeader'
import { LeadContact } from '@/components/leads/LeadContact'
import { LeadProject } from '@/components/leads/LeadProject'
import { LeadDates } from '@/components/leads/LeadDates'
import { TasksList } from '@/components/tasks/TasksList'
import { ActivityFeed } from '@/components/leads/ActivityFeed'
import { LeadAnalytics } from '@/components/leads/LeadAnalytics'
import { MergeBanner } from '@/components/leads/MergeBanner'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LeadPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  await Promise.all([
    autoAdvanceSiteVisits(supabase),
    autoAdvanceToAwaitingPayment(supabase),
  ])

  const [
    { data: lead },
    { data: tasks },
    { data: activities },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('*, users(id, full_name, avatar_url)')
      .eq('id', id)
      .single(),
    supabase
      .from('tasks')
      .select('*, users!tasks_assigned_to_fkey(full_name)')
      .eq('lead_id', id)
      .is('completed_at', null)
      .order('due_date', { ascending: true }),
    supabase
      .from('activities')
      .select('id, type, body, created_at, users(full_name, avatar_url)')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (!lead) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedLead = lead as any

  // Check for duplicate leads with same email
  let duplicateLead: { id: string; name: string; created_at: string } | null = null
  if (typedLead.email) {
    const { data: dups } = await supabase
      .from('leads')
      .select('id, name, created_at')
      .eq('email', typedLead.email)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(1)
    if (dups && dups.length > 0) duplicateLead = dups[0] as { id: string; name: string; created_at: string }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
      <LeadHeader lead={lead} />

      {duplicateLead && (
        <MergeBanner leadId={id} duplicate={duplicateLead} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* Left column */}
        <div className="md:col-span-1 space-y-4">
          <LeadContact lead={lead} />
          <LeadDates lead={lead} />
          <LeadAnalytics calculatorData={typedLead.calculator_data as Record<string, unknown> | null} createdAt={typedLead.created_at} />
        </div>

        {/* Right column */}
        <div className="md:col-span-2 space-y-4">
          <LeadProject lead={lead} />
          <TasksList tasks={tasks ?? []} leadId={id} />
          <ActivityFeed activities={activities ?? []} leadId={id} />
        </div>
      </div>
    </div>
  )
}
