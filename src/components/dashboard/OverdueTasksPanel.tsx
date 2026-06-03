import Link from 'next/link'
import { CheckSquare, AlertCircle } from 'lucide-react'
import { formatDate, isOverdue } from '@/utils/date'

interface Task {
  id: string
  title: string
  due_date: string | null
  type: string
  priority: string
  lead_id: string | null
  leads: { name: string } | null
}

export function OverdueTasksPanel({ tasks }: { tasks: Task[] }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
          <h2 className="text-sm font-semibold text-[var(--primary)]">Tasks</h2>
          {tasks.length > 0 && (
            <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
              {tasks.length}
            </span>
          )}
        </div>
        <Link href="/tasks" className="text-xs text-[var(--primary)] hover:underline">View all →</Link>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No open tasks</p>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const over = task.due_date ? isOverdue(task.due_date) : false
            const isStock = task.type === 'stock'
            const href = isStock ? '/stock' : `/leads/${task.lead_id}`
            const subtitle = isStock ? 'Stock reorder' : (task.leads?.name ?? 'Unknown lead')
            return (
              <Link
                key={task.id}
                href={href}
                className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  over ? 'bg-red-400' : task.priority === 'high' ? 'bg-orange-400' : 'bg-gray-300'
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[var(--primary)]">{task.title}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    {subtitle}
                    {task.due_date && (
                      <span className={over ? 'text-red-400 flex items-center gap-0.5' : 'text-gray-400'}>
                        · {over && <AlertCircle className="w-3 h-3 inline" />} {formatDate(task.due_date)}
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
