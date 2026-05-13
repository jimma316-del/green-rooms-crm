'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Ruler, PoundSterling, FileText, Home, MapPin, Pencil, Check, X } from 'lucide-react'
import { PROJECT_TYPE_LABELS } from '@/types'
import type { ProjectType } from '@/types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { formatBudget } from '@/utils/date'

interface Lead {
  id: string
  address: string | null
  postcode: string | null
  project_type: string | null
  budget_min: number | null
  budget_max: number | null
  approx_size_sqm: number | null
  notes: string | null
  calculator_data: Record<string, unknown> | null
}

export function LeadProject({ lead }: { lead: Lead }) {
  const router = useRouter()
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Budget is stored in pence — show/edit in £
  const [form, setForm] = useState({
    project_type: lead.project_type ?? '',
    budget_min: lead.budget_min ? (lead.budget_min / 100).toString() : '',
    budget_max: lead.budget_max ? (lead.budget_max / 100).toString() : '',
    approx_size_sqm: lead.approx_size_sqm?.toString() ?? '',
    notes: lead.notes ?? '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('leads').update({
      project_type: form.project_type || null,
      budget_min: form.budget_min ? Math.round(parseFloat(form.budget_min) * 100) : null,
      budget_max: form.budget_max ? Math.round(parseFloat(form.budget_max) * 100) : null,
      approx_size_sqm: form.approx_size_sqm ? parseFloat(form.approx_size_sqm) : null,
      notes: form.notes || null,
    }).eq('id', lead.id)

    if (error) {
      toast.error('Failed to save')
    } else {
      toast.success('Project details saved')
      setEditing(false)
      router.refresh()
    }
    setSaving(false)
  }

  function cancel() {
    setForm({
      project_type: lead.project_type ?? '',
      budget_min: lead.budget_min ? (lead.budget_min / 100).toString() : '',
      budget_max: lead.budget_max ? (lead.budget_max / 100).toString() : '',
      approx_size_sqm: lead.approx_size_sqm?.toString() ?? '',
      notes: lead.notes ?? '',
    })
    setEditing(false)
  }

  const hasData = lead.address || lead.postcode || lead.project_type || lead.budget_min || lead.approx_size_sqm || lead.notes

  if (editing) {
    return (
      <div className="bg-white rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold text-[var(--primary)] mb-3">Project Details</h2>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Project Type</p>
            <Select value={form.project_type} onValueChange={v => v && set('project_type', v)}>
              <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Budget Min (£)</p>
              <Input
                type="number"
                step="500"
                min="0"
                value={form.budget_min}
                onChange={e => set('budget_min', e.target.value)}
                placeholder="15000"
              />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Budget Max (£)</p>
              <Input
                type="number"
                step="500"
                min="0"
                value={form.budget_max}
                onChange={e => set('budget_max', e.target.value)}
                placeholder="25000"
              />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Approx Size (m²)</p>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={form.approx_size_sqm}
              onChange={e => set('approx_size_sqm', e.target.value)}
              placeholder="20"
            />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Notes</p>
            <Textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Project requirements, access notes, etc."
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={cancel}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--primary)]">Project Details</h2>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
      </div>

      {!hasData && !lead.calculator_data ? (
        <button onClick={() => setEditing(true)} className="text-sm text-gray-400 underline hover:text-gray-600">
          Add project details
        </button>
      ) : (
        <div className="space-y-2.5">
          {(lead.address || lead.postcode) && (
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                {lead.address && <p>{lead.address}</p>}
                {lead.postcode && <p className="font-mono">{lead.postcode}</p>}
              </div>
            </div>
          )}

          {lead.project_type && (
            <div className="flex items-center gap-2.5">
              <Home className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700">
                {PROJECT_TYPE_LABELS[lead.project_type as ProjectType] ?? lead.project_type}
              </span>
            </div>
          )}

          {(lead.budget_min || lead.budget_max) && (
            <div className="flex items-center gap-2.5">
              <PoundSterling className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700">
                {lead.budget_min && lead.budget_max
                  ? `${formatBudget(lead.budget_min)} – ${formatBudget(lead.budget_max)}`
                  : formatBudget(lead.budget_min ?? lead.budget_max)}
              </span>
            </div>
          )}

          {lead.approx_size_sqm && (
            <div className="flex items-center gap-2.5">
              <Ruler className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700">{lead.approx_size_sqm} m²</span>
            </div>
          )}

          {lead.notes && (
            <div className="flex items-start gap-2.5 mt-1">
              <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {lead.calculator_data && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Calculator Submission</p>
              <div className="space-y-1">
                {Object.entries(lead.calculator_data).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="text-gray-700 font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
