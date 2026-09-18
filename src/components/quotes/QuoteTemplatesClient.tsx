'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { toast } from 'sonner'

interface TemplateSection {
  title: string
  sort_order: number
  sku_defaults: string[]
}

interface PaymentMilestone {
  milestone: string
  label: string
  percentage: number
}

interface TemplateConfig {
  sections: TemplateSection[]
  payment_schedule: PaymentMilestone[]
}

export interface QuoteTemplate {
  id: string
  name: string
  description: string | null
  is_active: boolean
  default_config: TemplateConfig
  created_at: string
}

interface Props { initialTemplates: QuoteTemplate[] }

// ─── Section Config Editor ────────────────────────────────────────────────────
function SectionConfigRow({ section, index, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  section: TemplateSection
  index: number
  onChange: (s: TemplateSection) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const [skuInput, setSkuInput] = useState('')

  function addSku() {
    const sku = skuInput.trim().toUpperCase()
    if (!sku) return
    if (section.sku_defaults.includes(sku)) { toast.error('SKU already added'); return }
    onChange({ ...section, sku_defaults: [...section.sku_defaults, sku] })
    setSkuInput('')
  }

  return (
    <div className="flex items-start gap-2 py-3 border-b border-gray-50 last:border-0">
      <div className="flex flex-col gap-0.5 pt-1 shrink-0">
        <button onClick={onMoveUp} disabled={isFirst} className="text-gray-300 hover:text-gray-500 disabled:opacity-0">
          <ChevronUp size={13} />
        </button>
        <GripVertical size={13} className="text-gray-300" />
        <button onClick={onMoveDown} disabled={isLast} className="text-gray-300 hover:text-gray-500 disabled:opacity-0">
          <ChevronDown size={13} />
        </button>
      </div>
      <div className="flex-1 space-y-2">
        <input
          value={section.title}
          onChange={e => onChange({ ...section, title: e.target.value })}
          placeholder="Section title"
          className="w-full text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:border-[var(--primary)]"
        />
        <div>
          <div className="flex items-center gap-1 flex-wrap mb-1">
            {section.sku_defaults.map(sku => (
              <span key={sku} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                {sku}
                <button onClick={() => onChange({ ...section, sku_defaults: section.sku_defaults.filter(s => s !== sku) })}
                  className="text-gray-400 hover:text-red-500">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              value={skuInput}
              onChange={e => setSkuInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSku() }}
              placeholder="Add SKU (e.g. WIN-001)"
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-[var(--primary)] font-mono"
            />
            <button onClick={addSku} className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600">Add</button>
          </div>
        </div>
      </div>
      <button onClick={onDelete} className="text-gray-300 hover:text-red-500 shrink-0 mt-1">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ─── Template Editor ──────────────────────────────────────────────────────────
function TemplateEditor({ template, onSaved, onClose }: {
  template?: QuoteTemplate
  onSaved: (t: QuoteTemplate) => void
  onClose: () => void
}) {
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [sections, setSections] = useState<TemplateSection[]>(
    template?.default_config?.sections ?? []
  )
  const [schedule, setSchedule] = useState<PaymentMilestone[]>(
    template?.default_config?.payment_schedule ?? [
      { milestone: 'deposit',    label: 'Deposit on booking',         percentage: 10 },
      { milestone: 'day_1',      label: 'Day 1 — materials delivery', percentage: 50 },
      { milestone: 'plastering', label: 'Plastering / second fix',    percentage: 30 },
      { milestone: 'completion', label: 'Balance on completion',      percentage: 10 },
    ]
  )
  const [saving, setSaving] = useState(false)

  function addSection() {
    setSections(ss => [...ss, { title: 'New Section', sort_order: ss.length + 1, sku_defaults: [] }])
  }

  function moveSection(i: number, direction: 'up' | 'down') {
    setSections(ss => {
      const arr = [...ss]
      const target = direction === 'up' ? i - 1 : i + 1
      if (target < 0 || target >= arr.length) return ss
      ;[arr[i], arr[target]] = [arr[target], arr[i]]
      return arr.map((s, idx) => ({ ...s, sort_order: idx + 1 }))
    })
  }

  const totalPercent = schedule.reduce((s, m) => s + m.percentage, 0)

  async function save() {
    if (!name.trim()) { toast.error('Name is required'); return }
    if (totalPercent !== 100) { toast.error('Payment schedule must total 100%'); return }
    setSaving(true)
    try {
      const url = template ? `/api/quote-templates/${template.id}` : '/api/quote-templates'
      const method = template ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description || null,
          default_config: { sections: sections.map((s, i) => ({ ...s, sort_order: i + 1 })), payment_schedule: schedule },
        }),
      })
      if (!res.ok) throw new Error()
      const { template: saved } = await res.json()
      onSaved(saved)
      toast.success(template ? 'Template updated' : 'Template created')
      onClose()
    } catch {
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <span className="font-semibold text-gray-800">{template ? 'Edit Template' : 'New Template'}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Basic info */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Template name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Standard Garden Room"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)] resize-y"
              />
            </div>
          </div>

          {/* Sections */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Default Sections</h3>
              <button onClick={addSection} className="flex items-center gap-1 text-xs text-[var(--primary)] hover:opacity-70">
                <Plus size={12} /> Add section
              </button>
            </div>
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              {sections.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-400">
                  No sections — add one to start
                </div>
              )}
              {sections.map((s, i) => (
                <SectionConfigRow
                  key={i}
                  section={s}
                  index={i}
                  isFirst={i === 0}
                  isLast={i === sections.length - 1}
                  onChange={updated => setSections(ss => ss.map((x, idx) => idx === i ? updated : x))}
                  onDelete={() => setSections(ss => ss.filter((_, idx) => idx !== i))}
                  onMoveUp={() => moveSection(i, 'up')}
                  onMoveDown={() => moveSection(i, 'down')}
                />
              ))}
            </div>
          </div>

          {/* Payment schedule */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Payment Schedule</h3>
              <span className={`text-xs font-medium ${totalPercent === 100 ? 'text-green-600' : 'text-red-500'}`}>
                {totalPercent}% {totalPercent !== 100 ? '(must equal 100%)' : '✓'}
              </span>
            </div>
            <div className="space-y-2">
              {schedule.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={m.label}
                    onChange={e => setSchedule(ss => ss.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))}
                    className="flex-1 text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:border-[var(--primary)]"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={m.percentage}
                      onChange={e => setSchedule(ss => ss.map((x, idx) => idx === i ? { ...x, percentage: parseInt(e.target.value) || 0 } : x))}
                      className="w-14 text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:border-[var(--primary)] text-right"
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5 border-t border-gray-100 pt-4 shrink-0">
          <button onClick={onClose} className="flex-1 text-sm text-gray-500 border border-gray-200 rounded-lg py-2.5 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 text-sm font-medium text-white bg-[var(--primary)] hover:opacity-90 rounded-lg py-2.5 disabled:opacity-50">
            {saving ? 'Saving…' : template ? 'Save changes' : 'Create template'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Template Card ────────────────────────────────────────────────────────────
function TemplateCard({ template, onEdit, onToggle, onDelete }: {
  template: QuoteTemplate
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const sectionCount = template.default_config.sections?.length ?? 0

  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3 ${!template.is_active ? 'opacity-60' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{template.name}</span>
          {!template.is_active && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">inactive</span>
          )}
        </div>
        {template.description && (
          <p className="text-sm text-gray-400 mt-0.5">{template.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {sectionCount} section{sectionCount !== 1 ? 's' : ''} ·&nbsp;
          {template.default_config.payment_schedule?.map(m => `${m.percentage}%`).join(' / ')}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-50">
          <Pencil size={13} />
        </button>
        <button
          onClick={onToggle}
          title={template.is_active ? 'Deactivate' : 'Activate'}
          className={`p-1.5 rounded hover:bg-gray-50 text-sm ${template.is_active ? 'text-green-500' : 'text-gray-400'}`}
        >
          <Check size={14} />
        </button>
        <button onClick={onDelete} className="p-1.5 text-gray-300 hover:text-red-500 rounded hover:bg-gray-50">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function QuoteTemplatesClient({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState<QuoteTemplate[]>(initialTemplates)
  const [showEditor, setShowEditor] = useState(false)
  const [editTemplate, setEditTemplate] = useState<QuoteTemplate | undefined>()

  async function toggleActive(t: QuoteTemplate) {
    try {
      const res = await fetch(`/api/quote-templates/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !t.is_active }),
      })
      if (!res.ok) throw new Error()
      const { template: updated } = await res.json()
      setTemplates(ts => ts.map(x => x.id === updated.id ? updated : x))
      toast.success(updated.is_active ? 'Template activated' : 'Template deactivated')
    } catch {
      toast.error('Failed to update')
    }
  }

  async function deleteTemplate(t: QuoteTemplate) {
    if (!confirm(`Deactivate template "${t.name}"?`)) return
    try {
      await fetch(`/api/quote-templates/${t.id}`, { method: 'DELETE' })
      setTemplates(ts => ts.map(x => x.id === t.id ? { ...x, is_active: false } : x))
      toast.success('Template deactivated')
    } catch {
      toast.error('Failed to deactivate')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Templates pre-populate quote sections when a new quote is created.</p>
        <button
          onClick={() => { setEditTemplate(undefined); setShowEditor(true) }}
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-[var(--primary)] hover:opacity-90 px-4 py-2 rounded-lg shrink-0"
        >
          <Plus size={14} /> New template
        </button>
      </div>

      <div className="space-y-3">
        {templates.map(t => (
          <TemplateCard
            key={t.id}
            template={t}
            onEdit={() => { setEditTemplate(t); setShowEditor(true) }}
            onToggle={() => toggleActive(t)}
            onDelete={() => deleteTemplate(t)}
          />
        ))}
        {templates.length === 0 && (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-sm">No templates yet</p>
            <button
              onClick={() => { setEditTemplate(undefined); setShowEditor(true) }}
              className="mt-2 text-[var(--primary)] text-sm font-medium hover:opacity-70"
            >
              Create first template →
            </button>
          </div>
        )}
      </div>

      {showEditor && (
        <TemplateEditor
          template={editTemplate}
          onClose={() => { setShowEditor(false); setEditTemplate(undefined) }}
          onSaved={saved => setTemplates(ts => {
            const exists = ts.find(t => t.id === saved.id)
            return exists ? ts.map(t => t.id === saved.id ? saved : t) : [...ts, saved]
          })}
        />
      )}
    </div>
  )
}
