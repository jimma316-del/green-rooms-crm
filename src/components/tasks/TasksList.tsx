'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { CheckSquare, Plus, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { isOverdue, formatDate } from '@/utils/date'
import { cn } from '@/lib/utils'
import type { TaskType, TaskPriority } from '@/types'

interface Task {
  id: string
  title: string
  due_date: string | null
  type: string
  priority: string
  users: { full_name: string } | null
}

interface Props {
  tasks: Task[]
  leadId: string
}

export function TasksList({ tasks: initialTasks, leadId }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [taskType, setTaskType] = useState<TaskType>('followup')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function createTask() {
    if (!title.trim()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: task, error } = await supabase.from('tasks').insert({
      lead_id: leadId,
      created_by: user!.id,
      assigned_to: user!.id,
      title: title.trim(),
      type: taskType,
      priority: 'normal',
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    }).select('*, users!tasks_assigned_to_fkey(full_name)').single()

    if (error) {
      toast.error('Failed to create task')
    } else {
      await supabase.from('activities').insert({
        lead_id: leadId,
        created_by: user!.id,
        type: 'task_created',
        body: title.trim(),
      })
      setTasks(prev => [...prev, task])
      setTitle('')
      setDueDate('')
      setAdding(false)
      toast.success('Task created')
      router.refresh()
    }
    setSaving(false)
  }

  async function completeTask(taskId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    setTasks(prev => prev.filter(t => t.id !== taskId))

    await supabase.from('tasks').update({
      completed_at: new Date().toISOString(),
      completed_by: user!.id,
    }).eq('id', taskId)

    await supabase.from('activities').insert({
      lead_id: leadId,
      created_by: user!.id,
      type: 'task_completed',
      body: tasks.find(t => t.id === taskId)?.title ?? '',
    })

    toast.success('Task completed')
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <CheckSquare className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Tasks</h2>
          {tasks.length > 0 && (
            <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
              {tasks.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> Add task
        </button>
      </div>

      {/* Add task form */}
      {adding && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2 border border-gray-100">
          <Input
            placeholder="Task title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && createTask()}
          />
          <div className="flex gap-2">
            <Select value={taskType} onValueChange={v => setTaskType(v as TaskType)}>
              <SelectTrigger className="flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">📞 Call</SelectItem>
                <SelectItem value="email">✉️ Email</SelectItem>
                <SelectItem value="followup">🔄 Follow-up</SelectItem>
                <SelectItem value="site_survey">📍 Site Survey</SelectItem>
                <SelectItem value="other">• Other</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="flex-1 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={createTask} disabled={!title.trim() || saving} className="bg-[var(--primary)] hover:bg-[var(--primary)]/90">
              {saving ? 'Saving…' : 'Create'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Task list */}
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400">No open tasks</p>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const overdue = isOverdue(task.due_date)
            return (
              <div key={task.id} className="flex items-start gap-2.5 group">
                <button
                  onClick={() => completeTask(task.id)}
                  className="mt-0.5 w-4 h-4 rounded border-2 border-gray-300 hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors shrink-0"
                  title="Mark complete"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.due_date && (
                      <span className={cn(
                        'text-[10px] flex items-center gap-0.5',
                        overdue ? 'text-red-500 font-medium' : 'text-gray-400'
                      )}>
                        {overdue && <AlertCircle className="w-3 h-3" />}
                        {formatDate(task.due_date)}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 capitalize">{task.type}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
