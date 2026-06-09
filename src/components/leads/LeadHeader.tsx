'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { STAGE_CONFIG, SALES_STAGES, PROJECT_STAGES } from '@/types'
import type { Stage } from '@/types'
import { ChevronLeft, Flame, Phone, MessageCircle, Mail, Trash2, ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Lead {
  id: string
  name: string
  stage: string
  pipeline: string
  is_hot: boolean
  mobile: string | null
  email: string | null
}

export function LeadHeader({ lead }: { lead: Lead }) {
  const [stage, setStage] = useState(lead.stage)
  const [isHot, setIsHot] = useState(lead.is_hot)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const cfg = STAGE_CONFIG[stage as Stage]

  async function changeStage(newStage: string) {
    if (newStage === stage) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const newPipeline = STAGE_CONFIG[newStage as Stage]?.pipeline
    const clearHot = newPipeline === 'project' || newPipeline === 'lost' || newStage === 'job_booked'

    await Promise.all([
      supabase.from('leads').update({ stage: newStage, pipeline: newPipeline, ...(clearHot ? { is_hot: false } : {}) }).eq('id', lead.id),
      supabase.from('stage_history').insert({
        lead_id: lead.id,
        from_stage: stage,
        to_stage: newStage,
        changed_by: user!.id,
      }),
      supabase.from('activities').insert({
        lead_id: lead.id,
        created_by: user!.id,
        type: 'stage_change',
        body: `Moved from ${STAGE_CONFIG[stage as Stage]?.label} to ${STAGE_CONFIG[newStage as Stage]?.label}`,
      }),
    ])

    if (newStage === 'quoting') {
      const due = new Date(Date.now() + 2 * 86400000).toISOString()
      await supabase.from('tasks').insert({
        lead_id: lead.id,
        created_by: user!.id,
        assigned_to: user!.id,
        title: `Prepare quote`,
        type: 'quote',
        priority: 'high',
        due_date: due,
      })
      toast.success('Stage updated — quote task created')
    } else if (newStage === 'quote_sent') {
      const due = new Date(Date.now() + 2 * 86400000).toISOString()
      await Promise.all([
        supabase.from('tasks').insert({
          lead_id: lead.id,
          created_by: user!.id,
          assigned_to: user!.id,
          title: 'Quote follow up',
          type: 'whatsapp',
          priority: 'normal',
          due_date: due,
        }),
        supabase.from('tasks')
          .update({ completed_at: new Date().toISOString(), completed_by: user!.id })
          .eq('lead_id', lead.id)
          .in('title', [`${lead.name} Quote`, `${lead.name} Site Visit`, 'Prepare quote'])
          .is('completed_at', null),
      ])
      toast.success('Stage updated — follow-up task set for 48hrs')
    } else if (newStage === 'lost' || newStage === 'out_of_area') {
      await supabase.from('tasks')
        .update({ completed_at: new Date().toISOString(), completed_by: user!.id })
        .eq('lead_id', lead.id)
        .is('completed_at', null)
      toast.success('Stage updated — open tasks marked complete')
    } else {
      toast.success('Stage updated')
    }

    setStage(newStage)
    if (clearHot) setIsHot(false)
    setSaving(false)
    router.refresh()
  }

  async function deleteLead() {
    if (!confirm(`Delete ${lead.name}? This cannot be undone.`)) return
    await supabase.from('leads').delete().eq('id', lead.id)
    router.push('/leads')
    router.refresh()
  }

  async function toggleHot() {
    const newHot = !isHot
    setIsHot(newHot)
    await supabase.from('leads').update({ is_hot: newHot }).eq('id', lead.id)
  }

  function whatsappUrl() {
    const phone = lead.mobile?.replace(/\D/g, '').replace(/^0/, '44')
    return `https://wa.me/${phone}`
  }

  return (
    <div className="bg-white rounded-xl border border-border p-4">
      {/* Back + hot */}
      <div className="flex items-center justify-between mb-3">
        <Link href="/leads" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" /> All leads
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={deleteLead}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
          <button
          onClick={toggleHot}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
            isHot
              ? 'bg-orange-100 text-orange-600'
              : 'bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-orange-400'
          )}
        >
          <Flame className="w-3.5 h-3.5" />
          {isHot ? 'Hot lead' : 'Mark hot'}
          </button>
        </div>
      </div>

      {/* Name + stage */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{lead.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg?.color ?? 'bg-gray-100 text-gray-600'}`}>
              {cfg?.label ?? stage}
            </span>
            <span className="text-xs text-gray-400 capitalize">{lead.pipeline} pipeline</span>
          </div>
        </div>

        {/* Stage selector */}
        <div className="flex items-center gap-2">
          <Select value={stage} onValueChange={(v) => v && changeStage(v)} disabled={saving}>
            <SelectTrigger className="w-56 text-sm">
              <span>{STAGE_CONFIG[stage as Stage]?.label ?? stage}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel className="text-[10px] uppercase tracking-wide text-gray-400">Sales</SelectLabel>
                {SALES_STAGES.map(s => (
                  <SelectItem key={s} value={s}>{STAGE_CONFIG[s]?.label ?? s}</SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="text-[10px] uppercase tracking-wide text-gray-400">Project</SelectLabel>
                {PROJECT_STAGES.map(s => (
                  <SelectItem key={s} value={s}>{STAGE_CONFIG[s]?.label ?? s}</SelectItem>
                ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel className="text-[10px] uppercase tracking-wide text-gray-400">Other</SelectLabel>
                <SelectItem value="out_of_area">Out Of Area</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="flex gap-2 mt-4 flex-wrap">
        {lead.mobile && (
          <>
            <a href={`tel:${lead.mobile}`}>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <Phone className="w-3.5 h-3.5" /> Call
              </Button>
            </a>
            <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs text-green-700 border-green-200 hover:bg-green-50">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </Button>
            </a>
          </>
        )}
        {lead.email && (
          <a href={`mailto:${lead.email}`}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Mail className="w-3.5 h-3.5" /> Email
            </Button>
          </a>
        )}
        <Link href={`/leads/${lead.id}/sign-off`}>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs text-green-700 border-green-200 hover:bg-green-50">
            <ClipboardCheck className="w-3.5 h-3.5" /> Sign-off
          </Button>
        </Link>
      </div>
    </div>
  )
}
