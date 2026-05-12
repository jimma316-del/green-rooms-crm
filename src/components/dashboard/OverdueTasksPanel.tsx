import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from '@/utils/date'

interface Task {
  id: string
  title: string
  due_date: string | null
  type: string
  priority: string
  lead_id: string
  leads: { name: string } | null
}

export function OverdueTasksPanel({ tasks }: { tasks: Task[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <h2 className="text-sm font-semibold text-gray-700">Overdue Tasks</h2>
          {tasks.length > 0 && (
            <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
              {tasks.length}
            </span>
          )}
        </div>
        <Link href="/tasks?filter=overdue" className="text-xs text-[var(--primary)] hover:underline">View all →</Link>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">All caught up!</p>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <Link
              key={task.id}
              href={`/leads/${task.lead_id}`}
              className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[var(--primary)]">{task.title}</p>
                <p className="text-xs text-gray-500">
                  {task.leads?.name ?? 'Unknown lead'}
                  {task.due_date && (
                    <span className="text-red-400 ml-1">· {formatDistanceToNow(task.due_date)} overdue</span>
                  )}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
