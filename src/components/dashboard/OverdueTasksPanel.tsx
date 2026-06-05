'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckSquare, AlertCircle, Plus, Flag } from 'lucide-react'
import { formatDate, isOverdue } from '@/utils/date'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  title: string
  due_date: string | null
  type: string
  priority: string
  lead_id: string | null
  leads: { name: string } | null
}

const TASK_TYPES = [
  { value: 'whatsapp',          label: 'WhatsApp' },
  { value: 'email',             label: 'Email' },
  { value: 'call',              label: 'Call' },
  { value: 'in_person_meeting', label: 'In Person Meeting' },
  { value: 'send_info',         label: 'Send Info' },
  { value: 'note',              label: 'General / Note' },
]

export function OverdueTasksPanel({ tasks: initial }: { tasks: Task[] }) {
  const [tasks, setTasks] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [taskType, setTaskType] = useState('whatsapp')
  const [dueDate, setDueDate] = useState('')
  const [dateTbc, setDateTbc] = useState(false)
  const [notes, setNotes] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  async function createTask() {
    if (!title.trim()) { toast.error('Enter a task title'); return }
    if (!dueDate && !dateTbc) { toast.error('Set a due date or check Date TBC'); return }
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data: task, error } = await supabase.from('tasks').insert({
      title: title.trim(),
      type: taskType,
      priority: urgent ? 'high' : 'normal',
      lead_id: null as unknown as string,
      created_by: user.id,
      assigned_to: user.id,
      notes: notes.trim() || null,
      due_date: dateTbc ? null : new Date(dueDate).toISOString(),
    }).select('id, title, due_date, type, priority, lead_id, leads(name)').single()

    if (error) {
      toast.error('Failed to create task')
    } else {
      setTasks(prev => [task as Task, ...prev])
      setTitle('')
      setTaskType('whatsapp')
      setDueDate('')
      setDateTbc(false)
      setNotes('')
      setUrgent(false)
      setAdding(false)
      toast.success('Task created')
    }
    setSaving(false)
  }

  async function toggleUrgent(task: Task) {
    const newPriority = task.priority === 'high' ? 'normal' : 'high'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, priority: newPriority } : t))
    await supabase.from('tasks').update({ priority: newPriority }).eq('id', task.id)
  }

  async function completeTask(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('tasks').update({
      completed_at: new Date().toISOString(),
      completed_by: user?.id,
    }).eq('id', taskId)
    toast.success('Task completed')
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAdding(a => !a)}
            className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Add task
          </button>
          <Link href="/tasks" className="text-xs text-[var(--primary)] hover:underline">View all →</Link>
        </div>
      </div>

      {adding && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2 border border-gray-100">
          <Input
            placeholder="Task title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="text-xs"
          />
          <div className="flex gap-2">
            <Select value={taskType} onValueChange={v => v && setTaskType(v)}>
              <SelectTrigger className="flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1 flex flex-col gap-1">
              <Input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                disabled={dateTbc}
                className="text-xs disabled:opacity-40"
              />
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dateTbc}
                  onChange={e => { setDateTbc(e.target.checked); if (e.target.checked) setDueDate('') }}
                  className="w-3.5 h-3.5 rounded accent-[var(--primary)]"
                />
                <span className="text-[11px] text-gray-500">Date TBC</span>
              </label>
            </div>
          </div>
          <Textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="text-xs"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={urgent}
                onChange={e => setUrgent(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-orange-500"
              />
              <Flag className="w-3 h-3 text-orange-500" />
              <span className="text-[11px] text-gray-600 font-medium">Mark as urgent</span>
            </label>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={createTask}
                disabled={!title.trim() || (!dueDate && !dateTbc) || saving}
                className="bg-[var(--primary)] hover:bg-[var(--primary)]/90"
              >
                {saving ? 'Saving…' : 'Create'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No open tasks</p>
      ) : (
        <div className="space-y-1">
          {tasks.map(task => {
            const over = task.due_date ? isOverdue(task.due_date) : false
            const isUrgent = task.priority === 'high'
            const isStock = task.type === 'stock'
            const href = isStock ? '/stock' : task.lead_id ? `/leads/${task.lead_id}` : '/tasks'
            const subtitle = isStock ? 'Stock reorder' : (task.leads?.name ?? (task.lead_id ? 'Unknown lead' : 'General'))
            return (
              <div key={task.id} className="flex items-center gap-1.5 group rounded-lg hover:bg-gray-50 transition-colors pr-1">
                <button
                  onClick={() => completeTask(task.id)}
                  title="Mark complete"
                  className="w-4 h-4 rounded border-2 border-gray-300 hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors shrink-0 ml-1"
                />
                <button
                  onClick={() => toggleUrgent(task)}
                  title={isUrgent ? 'Remove urgent' : 'Mark as urgent'}
                  className={cn('p-1.5 rounded shrink-0 transition-colors', isUrgent ? 'text-orange-500' : 'text-gray-200 hover:text-orange-300')}
                >
                  <Flag className="w-3.5 h-3.5" fill={isUrgent ? 'currentColor' : 'none'} />
                </button>
                <Link href={href} className="flex-1 min-w-0 flex items-center gap-2 py-2">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${over ? 'bg-red-400' : isUrgent ? 'bg-orange-400' : 'bg-gray-300'}`} />
                  <div className="min-w-0">
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
