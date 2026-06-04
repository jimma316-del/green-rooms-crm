'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { CheckSquare, AlertCircle, Plus } from 'lucide-react'
import { formatDate, isOverdue } from '@/utils/date'
import { createClient } from '@/lib/supabase/client'

interface Task {
  id: string
  title: string
  due_date: string | null
  type: string
  priority: string
  lead_id: string | null
  leads: { name: string } | null
}

export function OverdueTasksPanel({ tasks: initial }: { tasks: Task[] }) {
  const [tasks, setTasks] = useState(initial)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function addTask() {
    const title = text.trim()
    if (!title) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data: task } = await supabase.from('tasks').insert({
      title,
      type: 'note',
      priority: 'normal',
      lead_id: null,
      created_by: user.id,
      assigned_to: user.id,
    }).select('id, title, due_date, type, priority, lead_id, leads(name)').single()

    if (task) setTasks(prev => [task as Task, ...prev])
    setText('')
    setSaving(false)
    inputRef.current?.focus()
  }

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

      <div className="flex items-center gap-1.5 mb-3">
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="Add a task…"
          disabled={saving}
          className="flex-1 text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent placeholder:text-gray-400 disabled:opacity-50"
        />
        <button
          onClick={addTask}
          disabled={saving || !text.trim()}
          className="p-1.5 rounded-lg bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
          title="Add task"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No open tasks</p>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const over = task.due_date ? isOverdue(task.due_date) : false
            const isStock = task.type === 'stock'
            const href = isStock ? '/stock' : task.lead_id ? `/leads/${task.lead_id}` : '/tasks'
            const subtitle = isStock ? 'Stock reorder' : (task.leads?.name ?? (task.lead_id ? 'Unknown lead' : 'General'))
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
