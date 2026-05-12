import { createClient } from '@/lib/supabase/server'
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs'
import { HotLeadsPanel } from '@/components/dashboard/HotLeadsPanel'
import { OverdueTasksPanel } from '@/components/dashboard/OverdueTasksPanel'
import { RecentActivityPanel } from '@/components/dashboard/RecentActivityPanel'
import { PipelineSummary } from '@/components/dashboard/PipelineSummary'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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

    // Quotes sent > 48 hours ago, no response
    supabase.from('leads').select('id', { count: 'exact' })
      .eq('stage', 'quote_sent')
      .lte('updated_at', new Date(Date.now() - 2 * 86400000).toISOString()),

    // Deposits outstanding
    supabase.from('leads').select('id', { count: 'exact' })
      .eq('stage', 'deposit_requested'),

    // Jobs in progress
    supabase.from('leads').select('id', { count: 'exact' })
      .eq('pipeline', 'project')
      .in('stage', ['job_booked', 'in_build']),

    // Hot leads
    supabase.from('leads')
      .select('id, name, stage, project_type, updated_at, postcode, is_hot')
      .eq('is_hot', true)
      .neq('pipeline', 'lost')
      .order('updated_at', { ascending: false })
      .limit(5),

    // Overdue tasks
    supabase.from('tasks')
      .select('id, title, due_date, type, priority, lead_id, leads(name)')
      .is('completed_at', null)
      .lt('due_date', new Date().toISOString())
      .order('due_date', { ascending: true })
      .limit(8),

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

  const kpis = {
    newLeads: newLeads?.length ?? 0,
    todayTasks: todayTasks?.length ?? 0,
    quotesWaiting: quotesWaiting?.length ?? 0,
    depositsOut: depositsOut?.length ?? 0,
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
        <OverdueTasksPanel tasks={overdueTasks ?? []} />
        <RecentActivityPanel activities={recentActivity ?? []} />
      </div>
    </div>
  )
}
