'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckSquare, AlertCircle, Plus } from 'lucide-react'
import { formatDate, isOverdue } from '@/utils/date'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

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
  const [saving, setSaving] = useState(false)

  async function createTask() {
    if (!title.trim()) { toast.error('Enter a task title'); return }
    if (!dueDate && !dateTbc) { toast.error('Set a due date or check Date TBC'); return }
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data: task, error } = await supabase.from('tasks').insert({
      title: title.trim(),
      type: taskType,
      priority: 'normal',
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
      setAdding(false)
      toast.success('Task created')
    }
    setSaving(false)
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
      )}

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
