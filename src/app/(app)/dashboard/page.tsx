export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { autoAdvanceSiteVisits } from '@/lib/autoAdvance'
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs'
import { HotLeadsPanel } from '@/components/dashboard/HotLeadsPanel'
import { OverdueTasksPanel } from '@/components/dashboard/OverdueTasksPanel'
import { RecentActivityPanel } from '@/components/dashboard/RecentActivityPanel'
import { PipelineSummary } from '@/components/dashboard/PipelineSummary'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Auto-advance any leads whose site visit has passed
  await autoAdvanceSiteVisits(supabase)

  // Fetch all dashboard data in parallel
  const [
    { data: newLeads },
    { data: todayTasks },
    { data: quotesWaiting },
    { data: depositsOut },
    { data: jobsInProgress },
    { data: hotLeads },
    { data: overdueTasks },
    { data: recentActivity },
    { data: stageCounts },
  ] = await Promise.all([
    // New leads this week
    supabase.from('leads').select('id', { count: 'exact' })
      .eq('stage', 'new_lead')
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),

    // Tasks due today (not completed)
    supabase.from('tasks').select('id', { count: 'exact' })
      .is('completed_at', null)
      .lte('due_date', new Date(new Date().setHours(23, 59, 59, 999)).toISOString()),

    // Leads in Quoting stage — quotes to prepare
    supabase.from('leads').select('id', { count: 'exact' })
      .eq('stage', 'quoting'),

    // Site surveys booked
    supabase.from('leads').select('id', { count: 'exact' })
      .eq('stage', 'site_survey_booked'),

    // Jobs booked (all pre-build and in-build project stages)
    supabase.from('leads').select('id', { count: 'exact' })
      .eq('pipeline', 'project')
      .in('stage', ['job_booked', 'doors_windows_ordered', 'final_designs_confirmed', 'design_book_created', 'schedule_sent_to_client', 'in_build']),

    // Hot leads: manually flagged with the flame icon
    supabase.from('leads')
      .select('id, name, stage, project_type, updated_at, postcode')
      .eq('is_hot', true)
      .eq('is_newsletter', false)
      .order('updated_at', { ascending: false })
      .limit(8),

    // All open tasks, soonest due first
    supabase.from('tasks')
      .select('id, title, due_date, type, priority, lead_id, leads(name)')
      .is('completed_at', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(15),

    // Recent activity
    supabase.from('activities')
      .select('id, type, body, created_at, lead_id, leads(name), users(full_name)')
      .order('created_at', { ascending: false })
      .limit(12),

    // Stage counts for pipeline summary
    supabase.from('leads')
      .select('stage, pipeline')
      .neq('pipeline', 'lost'),
  ])

  type TaskItem = { id: string; title: string; due_date: string | null; type: string; priority: string; lead_id: string; leads: { name: string } | null }
  const PRIORITY_ORDER: Record<string, number> = { high: 0, normal: 1, low: 2 }
  const sortedTasks = ((overdueTasks ?? []) as TaskItem[]).sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 1
    const pb = PRIORITY_ORDER[b.priority] ?? 1
    if (pa !== pb) return pa - pb
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })

  const kpis = {
    newLeads: newLeads?.length ?? 0,
    todayTasks: todayTasks?.length ?? 0,
    quotesWaiting: quotesWaiting?.length ?? 0,
    siteVisitsBooked: depositsOut?.length ?? 0,
    jobsInProgress: jobsInProgress?.length ?? 0,
  }

  return (
    <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      <DashboardKPIs kpis={kpis} />
      <PipelineSummary leads={stageCounts ?? []} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <HotLeadsPanel leads={hotLeads ?? []} />
        <OverdueTasksPanel tasks={sortedTasks} />
        <RecentActivityPanel activities={recentActivity ?? []} />
      </div>
    </div>
  )
}
