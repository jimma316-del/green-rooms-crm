export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { TasksPageClient } from '@/components/tasks/TasksPageClient'

interface Props {
  searchParams: Promise<{ filter?: string; assigned?: string }>
}

export default async function TasksPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('tasks')
    .select('*, leads(name, stage), users!tasks_assigned_to_fkey(full_name)')
    .is('completed_at', null)

  if (params.filter === 'overdue') {
    query = query.lt('due_date', new Date().toISOString())
  }
  if (params.filter === 'mine' || !params.assigned) {
    query = query.eq('assigned_to', user!.id)
  }

  const { data: tasks } = await query.order('due_date', { ascending: true, nullsFirst: false })

  return (
    <div className="px-4 md:px-6 py-6 max-w-3xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <p className="text-sm text-gray-500 mt-0.5">{tasks?.length ?? 0} open tasks</p>
      </div>
      <TasksPageClient tasks={tasks ?? []} />
    </div>
  )
}
