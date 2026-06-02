'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { CheckSquare, Plus, AlertCircle, Pencil, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { isOverdue, formatDate } from '@/utils/date'
import { cn } from '@/lib/utils'
import { TASK_TYPE_LABELS } from '@/types'
import type { TaskType } from '@/types'

interface Task {
  id: string
  title: string
  notes: string | null
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
  const [taskType, setTaskType] = useState<TaskType>('whatsapp')
  const [dueDate, setDueDate] = useState('')
  const [dateTbc, setDateTbc] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ type: string; due_date: string; notes: string }>({ type: '', due_date: '', notes: '' })
  const router = useRouter()
  const supabase = createClient()

  async function createTask() {
    if (!dueDate && !dateTbc) { toast.error('Set a due date or check Date TBC'); return }
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: task, error } = await supabase.from('tasks').insert({
      lead_id: leadId,
      created_by: user!.id,
      assigned_to: user!.id,
      title: TASK_TYPE_LABELS[taskType],
      type: taskType,
      notes: notes.trim() || null,
      priority: 'normal',
      due_date: dateTbc ? null : new Date(dueDate).toISOString(),
    }).select('*, users!tasks_assigned_to_fkey(full_name)').single()

    if (error) {
      toast.error(error.message || 'Failed to create task')
    } else {
      await supabase.from('activities').insert({
        lead_id: leadId,
        created_by: user!.id,
        type: 'task_created',
        body: notes.trim() || TASK_TYPE_LABELS[taskType],
      })

      if (taskType === 'snagging') {
        await supabase.from('leads').update({ stage: 'snagging', pipeline: 'project' }).eq('id', leadId)
        await supabase.from('activities').insert({
          lead_id: leadId,
          created_by: user!.id,
          type: 'stage_change',
          body: 'Moved to Snagging',
        })
        toast.success('Task created — lead moved to Snagging')
      } else {
        toast.success('Task created')
      }

      setTasks(prev => [...prev, task])
      setTaskType('whatsapp')
      setDueDate('')
      setDateTbc(false)
      setNotes('')
      setAdding(false)
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

  function startEdit(task: Task) {
    setEditingId(task.id)
    setEditForm({
      type: task.type,
      due_date: task.due_date ? task.due_date.slice(0, 10) : '',
      notes: task.notes ?? '',
    })
  }

  async function saveEdit(taskId: string) {
    const title = TASK_TYPE_LABELS[editForm.type as TaskType] ?? editForm.type
    await supabase.from('tasks').update({
      type: editForm.type,
      title,
      notes: editForm.notes.trim() || null,
      due_date: editForm.due_date ? new Date(editForm.due_date).toISOString() : null,
    }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, type: editForm.type, title, notes: editForm.notes.trim() || null, due_date: editForm.due_date ? new Date(editForm.due_date).toISOString() : null } : t))
    setEditingId(null)
    toast.success('Task updated')
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return
    setTasks(prev => prev.filter(t => t.id !== taskId))
    await supabase.from('tasks').delete().eq('id', taskId)
    toast.success('Task deleted')
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
          <div className="flex gap-2">
            <Select value={taskType} onValueChange={v => v && setTaskType(v as TaskType)}>
              <SelectTrigger className="flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amend_quote">Amend Quote</SelectItem>
                <SelectItem value="amend_design">Amend Design</SelectItem>
                <SelectItem value="in_person_meeting">In Person Meeting</SelectItem>
                <SelectItem value="send_info">Send Info</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="snagging">Snagging</SelectItem>
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
            <Button size="sm" onClick={createTask} disabled={(!dueDate && !dateTbc) || saving} className="bg-[var(--primary)] hover:bg-[var(--primary)]/90">
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
            if (editingId === task.id) {
              return (
                <div key={task.id} className="p-3 bg-gray-50 rounded-lg space-y-2 border border-gray-100">
                  <div className="flex gap-2">
                    <Select value={editForm.type} onValueChange={v => v && setEditForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="flex-1 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amend_quote">Amend Quote</SelectItem>
                        <SelectItem value="amend_design">Amend Design</SelectItem>
                        <SelectItem value="in_person_meeting">In Person Meeting</SelectItem>
                        <SelectItem value="send_info">Send Info</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="snagging">Snagging</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex-1 flex flex-col gap-1">
                      <Input
                        type="date"
                        value={editForm.due_date}
                        onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                        disabled={editForm.due_date === ''}
                        className="text-xs disabled:opacity-40"
                      />
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.due_date === ''}
                          onChange={e => setEditForm(f => ({ ...f, due_date: e.target.checked ? '' : new Date().toISOString().slice(0, 10) }))}
                          className="w-3.5 h-3.5 rounded accent-[var(--primary)]"
                        />
                        <span className="text-[11px] text-gray-500">Date TBC</span>
                      </label>
                    </div>
                  </div>
                  <Textarea placeholder="Notes (optional)" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="text-xs" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(task.id)} className="bg-[var(--primary)] hover:bg-[var(--primary)]/90">
                      <Check className="w-3 h-3 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-3 h-3 mr-1" /> Cancel</Button>
                  </div>
                </div>
              )
            }
            return (
              <div key={task.id} className="flex items-start gap-2.5 group">
                <button
                  onClick={() => completeTask(task.id)}
                  className="mt-0.5 w-4 h-4 rounded border-2 border-gray-300 hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors shrink-0"
                  title="Mark complete"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">{task.title}</p>
                  {task.notes && (
                    <p className="text-xs text-gray-500 mt-0.5">{task.notes}</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.due_date ? (
                      <span className={cn(
                        'text-[10px] flex items-center gap-0.5',
                        overdue ? 'text-red-500 font-medium' : 'text-gray-400'
                      )}>
                        {overdue && <AlertCircle className="w-3 h-3" />}
                        {formatDate(task.due_date)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-300">Date TBC</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(task)} className="p-1 text-gray-400 hover:text-gray-600"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => deleteTask(task.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
