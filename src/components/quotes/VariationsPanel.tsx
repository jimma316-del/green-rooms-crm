'use client'

import { useState } from 'react'
import { Plus, Trash2, Send, Check, ChevronDown, ChevronUp, X, Pencil } from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface VariationLineItem {
  id: string
  name: string
  description?: string | null
  quantity: number
  unit: string
  unit_price_pence: number
  line_total_pence: number
}

export interface Variation {
  id: string
  quote_id: string
  variation_number: number
  variation_ref: string
  title: string
  description: string | null
  status: 'draft' | 'sent' | 'approved' | 'rejected'
  total_pence: number
  line_items: VariationLineItem[]
  created_at: string
  sent_at: string | null
  approved_at: string | null
  approved_by: string | null
}

interface Props {
  quoteId: string
  leadEmail: string | null
  leadName: string
  initialVariations: Variation[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function poundStr(pence: number) {
  const sign = pence < 0 ? '-' : ''
  return `${sign}£${(Math.abs(pence) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const UNITS = ['item', 'each', 'm2', 'linear_m', 'day']
const UNIT_LABELS: Record<string, string> = { item: 'item', each: 'each', m2: 'm²', linear_m: 'linear m', day: 'day' }

// ─── Send Variation Modal ─────────────────────────────────────────────────────
function SendVariationModal({ quoteId, variation, leadEmail, leadName, onClose, onSent }: {
  quoteId: string
  variation: Variation
  leadEmail: string | null
  leadName: string
  onClose: () => void
  onSent: () => void
}) {
  const [email, setEmail] = useState(leadEmail ?? '')
  const [name, setName] = useState(leadName)
  const [subject, setSubject] = useState(`Variation Order — ${variation.variation_ref}`)
  const [bodyText, setBodyText] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    if (!email.trim()) { toast.error('Email address required'); return }
    setSending(true)
    try {
      const res = await fetch(`/api/quotes/${quoteId}/variations/${variation.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: email.trim(), recipientName: name, subject, bodyText: bodyText || undefined }),
      })
      if (!res.ok) throw new Error('Send failed')
      toast.success(`Variation sent to ${email}`)
      onSent()
      onClose()
    } catch {
      toast.error('Failed to send')
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-800">Send Variation Order</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Ref</label>
            <div className="text-sm font-medium text-gray-800">{variation.variation_ref} — {variation.title}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Recipient Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Personal message (optional)</label>
            <textarea value={bodyText} onChange={e => setBodyText(e.target.value)} rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)] resize-y placeholder:text-gray-300"
              placeholder="Add a personal note…" />
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 text-sm text-gray-500 border border-gray-200 rounded-lg py-2.5 hover:bg-gray-50">Cancel</button>
          <button onClick={send} disabled={sending}
            className="flex-1 text-sm font-medium text-white bg-[var(--primary)] hover:opacity-90 rounded-lg py-2.5 disabled:opacity-50">
            {sending ? 'Sending…' : 'Send →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Line Item Row ────────────────────────────────────────────────────────────
function LineItemRow({ item, onChange, onDelete }: {
  item: VariationLineItem
  onChange: (updated: VariationLineItem) => void
  onDelete: () => void
}) {
  function update(field: keyof VariationLineItem, value: string | number) {
    const updated = { ...item, [field]: value }
    if (field === 'quantity' || field === 'unit_price_pence') {
      updated.line_total_pence = Math.round(Number(updated.quantity) * Number(updated.unit_price_pence))
    }
    onChange(updated)
  }

  const priceStr = (item.unit_price_pence / 100).toFixed(2)

  return (
    <div className="grid grid-cols-[1fr_80px_80px_80px_28px] gap-2 items-start py-2 border-b border-gray-50 last:border-0">
      <div>
        <input
          value={item.name}
          onChange={e => update('name', e.target.value)}
          placeholder="Item description"
          className="w-full text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:border-[var(--primary)]"
        />
        <input
          value={item.description ?? ''}
          onChange={e => update('description', e.target.value)}
          placeholder="Detail (optional)"
          className="w-full text-xs text-gray-400 border-0 px-2 py-0.5 outline-none mt-0.5"
        />
      </div>
      <div className="flex flex-col gap-1">
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.quantity}
          onChange={e => update('quantity', parseFloat(e.target.value) || 0)}
          className="w-full text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-[var(--primary)] text-right"
        />
        <select
          value={item.unit}
          onChange={e => update('unit', e.target.value)}
          className="w-full text-xs border border-gray-200 rounded px-1 py-1 outline-none focus:border-[var(--primary)]"
        >
          {UNITS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
        </select>
      </div>
      <input
        type="number"
        min="0"
        step="0.01"
        value={priceStr}
        onChange={e => update('unit_price_pence', Math.round(parseFloat(e.target.value || '0') * 100))}
        className="w-full text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-[var(--primary)] text-right"
        placeholder="0.00"
      />
      <div className="text-xs font-semibold text-gray-800 text-right pt-1.5">
        {poundStr(item.line_total_pence)}
      </div>
      <button onClick={onDelete} className="text-gray-300 hover:text-red-400 transition-colors pt-1.5">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ─── Single Variation Card ────────────────────────────────────────────────────
function VariationCard({ variation, quoteId, leadEmail, leadName, onUpdate, onDelete }: {
  variation: Variation
  quoteId: string
  leadEmail: string | null
  leadName: string
  onUpdate: (updated: Variation) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(variation.status === 'draft')
  const [saving, setSaving] = useState(false)
  const [showSend, setShowSend] = useState(false)
  const [localItems, setLocalItems] = useState<VariationLineItem[]>(variation.line_items)
  const [title, setTitle] = useState(variation.title)
  const [description, setDescription] = useState(variation.description ?? '')
  const [editingTitle, setEditingTitle] = useState(false)

  const localTotal = localItems.reduce((s, i) => s + i.line_total_pence, 0)
  const isDirty = JSON.stringify(localItems) !== JSON.stringify(variation.line_items)
    || title !== variation.title
    || description !== (variation.description ?? '')

  function addItem() {
    setLocalItems(items => [...items, {
      id: crypto.randomUUID(),
      name: '',
      description: null,
      quantity: 1,
      unit: 'item',
      unit_price_pence: 0,
      line_total_pence: 0,
    }])
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/quotes/${quoteId}/variations/${variation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: description || null, line_items: localItems }),
      })
      if (!res.ok) throw new Error()
      const { variation: updated } = await res.json()
      onUpdate(updated)
      toast.success('Variation saved')
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function markApproved() {
    try {
      const res = await fetch(`/api/quotes/${quoteId}/variations/${variation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', approved_by: 'client' }),
      })
      if (!res.ok) throw new Error()
      const { variation: updated } = await res.json()
      onUpdate(updated)
      toast.success('Marked as approved')
    } catch {
      toast.error('Failed to update status')
    }
  }

  async function deleteVariation() {
    if (!confirm(`Delete ${variation.variation_ref}? This cannot be undone.`)) return
    try {
      await fetch(`/api/quotes/${quoteId}/variations/${variation.id}`, { method: 'DELETE' })
      onDelete()
      toast.success('Variation deleted')
    } catch {
      toast.error('Delete failed')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 select-none"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? <ChevronUp size={14} className="text-gray-400 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 shrink-0" />}
          <span className="text-xs font-mono text-gray-400 shrink-0">{variation.variation_ref}</span>
          <span className="text-sm font-medium text-gray-800 truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[variation.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {variation.status}
          </span>
          <span className="text-sm font-semibold text-gray-900">{poundStr(variation.total_pence)}</span>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Title edit */}
          <div className="flex items-center gap-2">
            {editingTitle ? (
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false) }}
                className="flex-1 text-sm font-semibold border border-[var(--primary)] rounded px-2 py-1 outline-none"
              />
            ) : (
              <button
                onClick={() => setEditingTitle(true)}
                className="flex items-center gap-1 text-sm font-semibold text-gray-800 hover:text-[var(--primary)] group"
              >
                {title}
                <Pencil size={11} className="opacity-0 group-hover:opacity-40 transition-opacity" />
              </button>
            )}
          </div>

          {/* Description */}
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description / scope of work (optional)…"
            rows={2}
            className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)] resize-y placeholder:text-gray-300"
          />

          {/* Line items */}
          <div>
            <div className="grid grid-cols-[1fr_80px_80px_80px_28px] gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Description</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Qty / Unit</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Unit £</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Total</span>
              <span />
            </div>
            {localItems.map((item, i) => (
              <LineItemRow
                key={item.id}
                item={item}
                onChange={updated => setLocalItems(items => items.map((it, idx) => idx === i ? updated : it))}
                onDelete={() => setLocalItems(items => items.filter((_, idx) => idx !== i))}
              />
            ))}
            <button
              onClick={addItem}
              className="mt-2 text-xs text-[var(--primary)] hover:opacity-80 flex items-center gap-1"
            >
              <Plus size={12} /> Add line item
            </button>
          </div>

          {/* Totals */}
          {localItems.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-sm text-gray-500">Total inc. VAT</span>
              <span className="text-base font-bold text-gray-900">{poundStr(localTotal)}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 flex-wrap">
            {isDirty && (
              <button
                onClick={save}
                disabled={saving}
                className="text-sm font-medium text-white bg-[var(--primary)] hover:opacity-90 px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            )}
            {!isDirty && variation.status === 'draft' && (
              <button
                onClick={() => setShowSend(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-white bg-[var(--primary)] hover:opacity-90 px-4 py-2 rounded-lg"
              >
                <Send size={13} /> Send to Client
              </button>
            )}
            {variation.status === 'sent' && (
              <button
                onClick={markApproved}
                className="flex items-center gap-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
              >
                <Check size={13} /> Mark Approved
              </button>
            )}
            {variation.status === 'draft' && (
              <button
                onClick={() => setShowSend(true)}
                className="flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-2 rounded-lg"
              >
                <Send size={13} /> Send
              </button>
            )}
            <button
              onClick={deleteVariation}
              className="text-sm text-gray-400 hover:text-red-500 flex items-center gap-1 ml-auto"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
      )}

      {showSend && (
        <SendVariationModal
          quoteId={quoteId}
          variation={variation}
          leadEmail={leadEmail}
          leadName={leadName}
          onClose={() => setShowSend(false)}
          onSent={() => {
            onUpdate({ ...variation, status: 'sent', sent_at: new Date().toISOString() })
            setShowSend(false)
          }}
        />
      )}
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export function VariationsPanel({ quoteId, leadEmail, leadName, initialVariations }: Props) {
  const [variations, setVariations] = useState<Variation[]>(initialVariations)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [showNew, setShowNew] = useState(false)

  async function createVariation() {
    if (!newTitle.trim()) { toast.error('Title required'); return }
    setCreating(true)
    try {
      const res = await fetch(`/api/quotes/${quoteId}/variations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      })
      if (!res.ok) throw new Error()
      const { variation } = await res.json()
      setVariations(v => [...v, variation])
      setNewTitle('')
      setShowNew(false)
      toast.success(`${variation.variation_ref} created`)
    } catch {
      toast.error('Failed to create variation')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--primary)]">Variation Orders</h3>
        <button
          onClick={() => setShowNew(o => !o)}
          className="text-xs flex items-center gap-1 text-[var(--primary)] hover:opacity-70"
        >
          <Plus size={13} /> New variation
        </button>
      </div>

      {showNew && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Title</label>
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createVariation(); if (e.key === 'Escape') setShowNew(false) }}
              placeholder="e.g. Upgrade to composite cladding"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={createVariation}
              disabled={creating || !newTitle.trim()}
              className="text-sm font-medium text-white bg-[var(--primary)] hover:opacity-90 px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => { setShowNew(false); setNewTitle('') }}
              className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {variations.length === 0 && !showNew && (
        <div className="text-center py-8 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          No variation orders yet.<br />
          <button onClick={() => setShowNew(true)} className="text-[var(--primary)] hover:opacity-70 mt-1 font-medium">
            Create first variation →
          </button>
        </div>
      )}

      {variations.map(v => (
        <VariationCard
          key={v.id}
          variation={v}
          quoteId={quoteId}
          leadEmail={leadEmail}
          leadName={leadName}
          onUpdate={updated => setVariations(vs => vs.map(x => x.id === updated.id ? updated : x))}
          onDelete={() => setVariations(vs => vs.filter(x => x.id !== v.id))}
        />
      ))}
    </div>
  )
}
