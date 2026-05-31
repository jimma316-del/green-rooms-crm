'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { STAGE_CONFIG, SALES_STAGES } from '@/types'
import type { Pipeline, Stage } from '@/types'
import { Flame, MapPin, Building2 } from 'lucide-react'
import { formatDistanceToNow } from '@/utils/date'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Lead {
  id: string
  name: string
  stage: string
  pipeline: string
  project_type: string | null
  postcode: string | null
  is_hot: boolean
  updated_at: string
  job_date: string | null
  users: { full_name: string; avatar_url: string | null } | null
}

interface ColumnConfig {
  id: string
  label: string
  stages: string[]
  dropStage: string
  color: string
}

interface Props {
  leads: Lead[]
  pipeline: Pipeline
}

// Job Booked column aggregates all pre-build stages so cards show sub-stage labels
const PROJECT_COLUMNS: ColumnConfig[] = [
  {
    id: 'job_booked_group',
    label: 'Job Booked',
    stages: ['job_booked', 'doors_windows_ordered', 'final_designs_confirmed', 'design_book_created', 'schedule_sent_to_client'],
    dropStage: 'job_booked',
    color: STAGE_CONFIG.job_booked.color,
  },
  {
    id: 'in_build',
    label: 'In Build',
    stages: ['in_build'],
    dropStage: 'in_build',
    color: STAGE_CONFIG.in_build.color,
  },
  {
    id: 'awaiting_payment',
    label: 'Awaiting Payment',
    stages: ['awaiting_payment'],
    dropStage: 'awaiting_payment',
    color: STAGE_CONFIG.awaiting_payment.color,
  },
  {
    id: 'paid_closed',
    label: 'Paid / Closed',
    stages: ['paid_closed'],
    dropStage: 'paid_closed',
    color: STAGE_CONFIG.paid_closed.color,
  },
  {
    id: 'snagging',
    label: 'Snagging',
    stages: ['snagging'],
    dropStage: 'snagging',
    color: STAGE_CONFIG.snagging.color,
  },
]

export function PipelineBoard({ leads: initialLeads, pipeline }: Props) {
  const [leads, setLeads] = useState(initialLeads)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const columns: ColumnConfig[] = pipeline === 'sales'
    ? SALES_STAGES.map(stage => ({
        id: stage,
        label: STAGE_CONFIG[stage as Stage].label,
        stages: [stage],
        dropStage: stage,
        color: STAGE_CONFIG[stage as Stage].color,
      }))
    : PROJECT_COLUMNS

  function leadsByColumn(col: ColumnConfig) {
    const filtered = leads.filter(l => col.stages.includes(l.stage))
    if (col.id === 'job_booked_group') {
      return filtered.sort((a, b) => {
        if (!a.job_date) return 1
        if (!b.job_date) return -1
        return a.job_date < b.job_date ? -1 : 1
      })
    }
    return filtered
  }

  function handleDragStart(e: React.DragEvent, leadId: string) {
    setDragging(leadId)
    e.dataTransfer.effectAllowed = 'move'
  }

  async function handleDrop(e: React.DragEvent, col: ColumnConfig) {
    e.preventDefault()
    if (!dragging) { setDragging(null); setDragOver(null); return }

    const lead = leads.find(l => l.id === dragging)
    if (!lead || col.stages.includes(lead.stage)) { setDragging(null); setDragOver(null); return }

    const toStage = col.dropStage

    setLeads(prev => prev.map(l => l.id === dragging ? { ...l, stage: toStage } : l))
    setDragging(null)
    setDragOver(null)

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('leads').update({ stage: toStage }).eq('id', dragging)
    if (error) {
      toast.error('Failed to move lead')
      setLeads(initialLeads)
      return
    }

    await Promise.all([
      supabase.from('stage_history').insert({
        lead_id: dragging,
        from_stage: lead.stage,
        to_stage: toStage,
        changed_by: user!.id,
      }),
      supabase.from('activities').insert({
        lead_id: dragging,
        created_by: user!.id,
        type: 'stage_change',
        body: `Moved from ${STAGE_CONFIG[lead.stage as Stage]?.label} to ${STAGE_CONFIG[toStage as Stage]?.label}`,
      }),
    ])

    if (toStage === 'quoting') {
      await supabase.from('tasks').insert({
        lead_id: dragging,
        created_by: user!.id,
        assigned_to: user!.id,
        title: 'Prepare quote',
        type: 'quote',
        priority: 'high',
        due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
      })
      toast.success('Stage updated — quote task created')
    } else if (toStage === 'quote_sent') {
      await supabase.from('tasks').insert({
        lead_id: dragging,
        created_by: user!.id,
        assigned_to: user!.id,
        title: 'Quote follow up',
        type: 'whatsapp',
        priority: 'normal',
        due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
      })
      toast.success('Stage updated — follow-up task created for 48hrs')
    } else {
      toast.success('Stage updated')
    }

    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {pipeline === 'sales' ? 'Sales Pipeline' : 'Project Pipeline'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{leads.length} leads</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/pipeline"
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              pipeline === 'sales'
                ? 'bg-[var(--primary)] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            )}
          >
            Sales
          </Link>
          <Link
            href="/pipeline?view=project"
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              pipeline === 'project'
                ? 'bg-[var(--primary)] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            )}
          >
            Project
          </Link>
        </div>
      </div>

      <div className="pipeline-board">
        {columns.map(col => {
          const colLeads = leadsByColumn(col)
          const isOver = dragOver === col.id

          return (
            <div
              key={col.id}
              className="pipeline-column"
              onDragOver={e => { e.preventDefault(); setDragOver(col.id) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, col)}
            >
              <div className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b',
                isOver ? 'bg-[var(--primary)]/5 border-[var(--primary)]/20' : 'bg-gray-50 border-gray-100'
              )}>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${col.color}`}>
                    {col.label}
                  </span>
                </div>
                <span className="text-xs font-semibold text-gray-500">{colLeads.length}</span>
              </div>

              <div className={cn(
                'bg-gray-50/50 border border-gray-100 border-t-0 rounded-b-xl min-h-[400px] p-2 space-y-2',
                isOver && 'bg-[var(--primary)]/3 border-[var(--primary)]/20'
              )}>
                {colLeads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    isDragging={dragging === lead.id}
                    onDragStart={handleDragStart}
                    showSubStage={col.stages.length > 1 && lead.stage !== col.dropStage}
                  />
                ))}
                {colLeads.length === 0 && (
                  <div className={cn(
                    'flex items-center justify-center h-20 rounded-lg border-2 border-dashed text-xs text-gray-400',
                    isOver ? 'border-[var(--primary)]/40 text-[var(--primary)]' : 'border-gray-200'
                  )}>
                    {isOver ? 'Drop here' : 'Empty'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LeadCard({
  lead,
  isDragging,
  onDragStart,
  showSubStage,
}: {
  lead: Lead
  isDragging: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
  showSubStage?: boolean
}) {
  const subStageCfg = showSubStage ? STAGE_CONFIG[lead.stage as Stage] : null

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead.id)}
      className={cn(
        'bg-white rounded-lg border border-gray-100 p-3 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md',
        isDragging && 'opacity-50 scale-95'
      )}
    >
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <Link
          href={`/leads/${lead.id}`}
          className="text-sm font-semibold text-gray-900 hover:text-[var(--primary)] leading-snug line-clamp-1"
          onClick={e => e.stopPropagation()}
        >
          {lead.name}
        </Link>
        {lead.is_hot && <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />}
      </div>

      {subStageCfg && (
        <div className="mb-1.5">
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${subStageCfg.color}`}>
            {subStageCfg.label}
          </span>
        </div>
      )}

      <div className="space-y-1">
        {lead.project_type && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <Building2 className="w-3 h-3 shrink-0" />
            <span className="capitalize">{lead.project_type.replace('_', ' ')}</span>
          </div>
        )}
        {lead.postcode && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <MapPin className="w-3 h-3 shrink-0" />
            {lead.postcode}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-50">
        {lead.users ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[9px] font-bold text-[var(--primary)] uppercase">
              {lead.users.full_name.charAt(0)}
            </div>
            <span className="text-[10px] text-gray-400">{lead.users.full_name.split(' ')[0]}</span>
          </div>
        ) : <span />}
        <span className="text-[10px] text-gray-400">{formatDistanceToNow(lead.updated_at)}</span>
      </div>
    </div>
  )
}
