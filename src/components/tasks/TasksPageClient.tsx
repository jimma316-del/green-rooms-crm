'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isOverdue, formatDate } from '@/utils/date'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { STAGE_CONFIG } from '@/types'
import type { Stage } from '@/types'

interface Task {
  id: string
  title: string
  due_date: string | null
  type: string
  priority: string
  lead_id: string
  leads: { name: string; stage: string } | null
  users: { full_name: string } | null
}

export function TasksPageClient({ tasks: initial }: { tasks: Task[] }) {
  const [tasks, setTasks] = useState(initial)
  const [completing, setCompleting] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const overdue = tasks.filter(t => isOverdue(t.due_date))
  const upcoming = tasks.filter(t => !isOverdue(t.due_date))

  async function complete(taskId: string, leadId: string, title: string) {
    setCompleting(taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))

    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('tasks').update({
      completed_at: new Date().toISOString(),
      completed_by: user!.id,
    }).eq('id', taskId)

    await supabase.from('activities').insert({
      lead_id: leadId,
      created_by: user!.id,
      type: 'task_completed',
      body: title,
    })

    toast.success('Task done!')
    setCompleting(null)
    router.refresh()
  }

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">All caught up!</p>
        <p className="text-sm text-gray-400 mt-1">No open tasks</p>
      </div>
    )
  }

  function TaskRow({ task }: { task: Task }) {
    const over = isOverdue(task.due_date)
    const stageCfg = task.leads ? STAGE_CONFIG[task.leads.stage as Stage] : null

    return (
      <div className={cn(
        'flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group',
        completing === task.id && 'opacity-40'
      )}>
        <button
          onClick={() => complete(task.id, task.lead_id, task.title)}
          className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors shrink-0 flex items-center justify-center"
        >
          {completing === task.id && <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800">{task.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {task.leads && (
              <Link href={`/leads/${task.lead_id}`} className="text-xs text-[var(--primary)] hover:underline">
                {task.leads.name}
              </Link>
            )}
            {stageCfg && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${stageCfg.color}`}>{stageCfg.label}</span>
            )}
            <span className="text-[10px] text-gray-400 capitalize">{task.type}</span>
          </div>
        </div>
        {task.due_date && (
          <div className={cn('flex items-center gap-1 text-[11px] shrink-0', over ? 'text-red-500 font-semibold' : 'text-gray-400')}>
            {over && <AlertCircle className="w-3 h-3" />}
            {formatDate(task.due_date)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {overdue.length > 0 && (
        <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
          <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700">Overdue ({overdue.length})</span>
          </div>
          <div className="p-2 divide-y divide-gray-50">
            {overdue.map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">Upcoming ({upcoming.length})</span>
          </div>
          <div className="p-2 divide-y divide-gray-50">
            {upcoming.map(t => <TaskRow key={t.id} task={t} />)}
          </div>
        </div>
      )}
    </div>
  )
}
