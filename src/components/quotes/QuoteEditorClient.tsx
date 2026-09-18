'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, ChevronUp, X, Check, Pencil, FileText, Briefcase } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineItem {
  id: string
  product_id: string | null
  name: string
  description: string | null
  quantity: number
  unit: string
  unit_price_pence: number
  line_total_pence: number
  is_optional: boolean
  is_included: boolean
  sort_order: number
  internal_notes: string | null
}

interface Section {
  id: string
  title: string
  sort_order: number
  show_subtotal: boolean
  notes: string | null
  quote_line_items: LineItem[]
}

interface PaymentMilestone {
  id: string
  milestone: string
  label: string
  amount_pence: number
  percentage: number | null
  due_trigger: string
  paid_at: string | null
  payment_ref: string | null
  xero_invoice_id: string | null
  xero_invoice_number: string | null
}

interface Version {
  id: string
  version_number: number
  status: string
  title: string | null
  total_pence: number
  is_current: boolean
  sent_at: string | null
  cover_letter: string | null
  internal_notes: string | null
  build_date: string | null
  expires_at: string | null
}

interface Product {
  id: string
  category: string
  sku: string | null
  name: string
  description: string | null
  unit: string
  base_price_pence: number
  vat_rate: number
}

interface Lead {
  id: string
  name: string
  email: string | null
  mobile: string | null
  address: string | null
  postcode: string | null
}

interface Assessment {
  width_m: number | null
  depth_m: number | null
  roof_type: string | null
}

interface Props {
  leadId: string
  lead: Lead
  quoteId: string
  quoteRef: string
  versions: Version[]
  currentVersion: Version
  initialSections: Section[]
  initialPaymentSchedule: PaymentMilestone[]
  productsGrouped: Record<string, Product[]>
  assessment?: Assessment | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function poundStr(pence: number) {
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const UNIT_LABELS: Record<string, string> = {
  item: 'item', each: 'each', m2: 'm²', linear_m: 'linear m', day: 'day',
}

const CATEGORY_LABELS: Record<string, string> = {
  room_shell: 'Room Shell', cladding: 'Cladding', window: 'Windows',
  bifold: 'Bi-fold / Sliding Doors', door: 'External Doors',
  internal_door: 'Internal Doors', ceiling: 'Ceiling', wall: 'Walls',
  floor: 'Flooring', electrics: 'Electrical', extras: 'Extras', delivery: 'Delivery',
}

// ─── Inline editable text ─────────────────────────────────────────────────────
function InlineEdit({ value, onSave, className = '' }: { value: string; onSave: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function commit() {
    setEditing(false)
    if (draft.trim() && draft.trim() !== value) onSave(draft.trim())
    else setDraft(value)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setDraft(value) } }}
        className={`bg-white border border-[var(--primary)] rounded px-2 py-0.5 text-sm outline-none w-full ${className}`}
      />
    )
  }
  return (
    <span
      className={`cursor-text hover:bg-gray-50 rounded px-1 -mx-1 group ${className}`}
      onClick={() => setEditing(true)}
    >
      {value}
      <Pencil size={11} className="inline ml-1 opacity-0 group-hover:opacity-40 transition-opacity" />
    </span>
  )
}

// ─── Product Picker Modal ─────────────────────────────────────────────────────
function ProductPicker({ productsGrouped, onSelect, onClose }: {
  productsGrouped: Record<string, Product[]>
  onSelect: (p: Product) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const q = search.toLowerCase()

  const filtered = Object.entries(productsGrouped).reduce<Record<string, Product[]>>((acc, [cat, prods]) => {
    const matches = prods.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.sku ?? '').toLowerCase().includes(q)
    )
    if (matches.length) acc[cat] = matches
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[80vh] flex flex-col shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-semibold text-sm text-gray-800">Add from catalogue</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-4 py-2 border-b border-gray-100">
          <input
            autoFocus
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]"
          />
        </div>
        <div className="overflow-y-auto flex-1 pb-4">
          {Object.entries(filtered).map(([cat, prods]) => (
            <div key={cat}>
              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide sticky top-0 bg-gray-50">
                {CATEGORY_LABELS[cat] ?? cat}
              </div>
              {prods.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onSelect(p); onClose() }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{p.name}</div>
                      {p.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.description}</div>}
                    </div>
                    <div className="text-sm font-medium text-gray-700 shrink-0">
                      {p.base_price_pence > 0 ? poundStr(p.base_price_pence) : '—'}
                      <span className="text-xs text-gray-400 ml-1">/{UNIT_LABELS[p.unit] ?? p.unit}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))}
          {Object.keys(filtered).length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No products match "{search}"</div>
          )}
        </div>
        {/* Custom item option */}
        <div className="border-t border-gray-100 p-3">
          <button
            onClick={() => { onSelect({ id: '', category: '', sku: null, name: 'Custom item', description: null, unit: 'item', base_price_pence: 0, vat_rate: 0.2 }); onClose() }}
            className="w-full text-sm text-[var(--primary)] font-medium py-2 hover:bg-gray-50 rounded-lg transition-colors"
          >
            + Add custom item
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Line Item Row ────────────────────────────────────────────────────────────
function LineItemRow({ item, quoteId, versionId, sectionId, onUpdate, onDelete }: {
  item: LineItem
  quoteId: string
  versionId: string
  sectionId: string
  onUpdate: (updated: LineItem) => void
  onDelete: () => void
}) {
  const [saving, setSaving] = useState(false)

  async function patchItem(patch: Partial<LineItem>) {
    setSaving(true)
    try {
      const res = await fetch(
        `/api/quotes/${quoteId}/versions/${versionId}/sections/${sectionId}/items/${item.id}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }
      )
      if (!res.ok) throw new Error('Save failed')
      const { item: updated } = await res.json()
      onUpdate(updated)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem() {
    if (!confirm('Remove this item?')) return
    setSaving(true)
    try {
      await fetch(
        `/api/quotes/${quoteId}/versions/${versionId}/sections/${sectionId}/items/${item.id}`,
        { method: 'DELETE' }
      )
      onDelete()
    } catch {
      toast.error('Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`group grid grid-cols-[1fr_auto] gap-2 px-3 py-2 border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${saving ? 'opacity-60' : ''}`}>
      <div className="min-w-0">
        {/* Name */}
        <InlineEdit
          value={item.name}
          onSave={v => patchItem({ name: v })}
          className="text-sm font-medium text-gray-900"
        />
        {/* Description */}
        {item.description !== null && (
          <InlineEdit
            value={item.description || ''}
            onSave={v => patchItem({ description: v })}
            className="text-xs text-gray-400 mt-0.5 block w-full"
          />
        )}
        {/* Qty × price row */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <input
              type="number"
              value={item.quantity}
              min={0}
              step="0.001"
              onChange={e => patchItem({ quantity: parseFloat(e.target.value) || 0 })}
              className="w-16 border border-gray-200 rounded px-1.5 py-0.5 text-center text-xs outline-none focus:border-[var(--primary)]"
            />
            <select
              value={item.unit}
              onChange={e => patchItem({ unit: e.target.value })}
              className="border border-gray-200 rounded px-1 py-0.5 text-xs outline-none focus:border-[var(--primary)] bg-white"
            >
              {Object.entries(UNIT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <span className="text-gray-300">×</span>
            <span className="text-gray-500">£</span>
            <input
              type="number"
              value={(item.unit_price_pence / 100).toFixed(2)}
              min={0}
              step="0.01"
              onChange={e => patchItem({ unit_price_pence: Math.round(parseFloat(e.target.value) * 100) || 0 })}
              className="w-20 border border-gray-200 rounded px-1.5 py-0.5 text-xs outline-none focus:border-[var(--primary)]"
            />
          </div>
          {item.is_optional && (
            <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={item.is_included}
                onChange={e => patchItem({ is_included: e.target.checked })}
                className="rounded"
              />
              Include
            </label>
          )}
        </div>
      </div>
      {/* Right: total + actions */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`text-sm font-semibold ${item.is_optional && !item.is_included ? 'text-gray-300 line-through' : 'text-gray-900'}`}>
          {poundStr(item.line_total_pence)}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => patchItem({ is_optional: !item.is_optional })}
            title={item.is_optional ? 'Make required' : 'Mark optional'}
            className="text-xs text-gray-400 hover:text-gray-600 px-1"
          >
            {item.is_optional ? 'req.' : 'opt.'}
          </button>
          <button onClick={deleteItem} className="text-red-400 hover:text-red-600 p-0.5">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Section Block ────────────────────────────────────────────────────────────
function SectionBlock({ section, quoteId, versionId, productsGrouped, onUpdate, onDelete, onTotalChange }: {
  section: Section
  quoteId: string
  versionId: string
  productsGrouped: Record<string, Product[]>
  onUpdate: (s: Section) => void
  onDelete: () => void
  onTotalChange: () => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [addingCustom, setAddingCustom] = useState(false)
  const [customName, setCustomName] = useState('')

  const subtotal = section.quote_line_items
    .filter(i => !i.is_optional || i.is_included)
    .reduce((s, i) => s + i.line_total_pence, 0)

  async function renameSection(title: string) {
    await fetch(`/api/quotes/${quoteId}/versions/${versionId}/sections/${section.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    onUpdate({ ...section, title })
  }

  async function deleteSection() {
    if (!confirm(`Delete section "${section.title}" and all its items?`)) return
    await fetch(`/api/quotes/${quoteId}/versions/${versionId}/sections/${section.id}`, { method: 'DELETE' })
    onDelete()
    onTotalChange()
  }

  async function addItemFromProduct(product: Product) {
    if (!product.id) {
      // Custom item
      setAddingCustom(true)
      return
    }
    const res = await fetch(
      `/api/quotes/${quoteId}/versions/${versionId}/sections/${section.id}/items`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          name: product.name,
          description: product.description,
          quantity: 1,
          unit: product.unit,
          unit_price_pence: product.base_price_pence,
          sort_order: section.quote_line_items.length,
        }),
      }
    )
    if (!res.ok) { toast.error('Failed to add item'); return }
    const { item } = await res.json()
    onUpdate({ ...section, quote_line_items: [...section.quote_line_items, item] })
    onTotalChange()
  }

  async function addCustomItem() {
    if (!customName.trim()) return
    const res = await fetch(
      `/api/quotes/${quoteId}/versions/${versionId}/sections/${section.id}/items`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: customName.trim(), quantity: 1, unit: 'item', unit_price_pence: 0, sort_order: section.quote_line_items.length }),
      }
    )
    if (!res.ok) { toast.error('Failed to add item'); return }
    const { item } = await res.json()
    onUpdate({ ...section, quote_line_items: [...section.quote_line_items, item] })
    onTotalChange()
    setCustomName('')
    setAddingCustom(false)
  }

  function handleItemUpdate(updated: LineItem) {
    onUpdate({ ...section, quote_line_items: section.quote_line_items.map(i => i.id === updated.id ? updated : i) })
    onTotalChange()
  }

  function handleItemDelete(itemId: string) {
    onUpdate({ ...section, quote_line_items: section.quote_line_items.filter(i => i.id !== itemId) })
    onTotalChange()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <button onClick={() => setCollapsed(c => !c)} className="text-gray-400 hover:text-gray-600 shrink-0">
          {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
        <InlineEdit
          value={section.title}
          onSave={renameSection}
          className="text-sm font-semibold text-gray-800 flex-1"
        />
        <span className="text-xs font-medium text-gray-500 shrink-0">{poundStr(subtotal)}</span>
        <button onClick={deleteSection} className="text-gray-300 hover:text-red-400 transition-colors shrink-0 ml-1">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Items */}
      {!collapsed && (
        <>
          {section.quote_line_items.length === 0 ? (
            <div className="px-4 py-4 text-xs text-gray-400 text-center">No items yet</div>
          ) : (
            section.quote_line_items.map(item => (
              <LineItemRow
                key={item.id}
                item={item}
                quoteId={quoteId}
                versionId={versionId}
                sectionId={section.id}
                onUpdate={handleItemUpdate}
                onDelete={() => handleItemDelete(item.id)}
              />
            ))
          )}

          {/* Add item */}
          <div className="px-3 py-2 border-t border-gray-50">
            {addingCustom ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  placeholder="Item name…"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCustomItem(); if (e.key === 'Escape') { setAddingCustom(false); setCustomName('') } }}
                  className="flex-1 text-sm border border-[var(--primary)] rounded-lg px-3 py-1.5 outline-none"
                />
                <button onClick={addCustomItem} className="text-[var(--primary)] hover:opacity-80"><Check size={16} /></button>
                <button onClick={() => setAddingCustom(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowPicker(true)}
                  className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:opacity-80 font-medium"
                >
                  <Plus size={13} /> From catalogue
                </button>
                <span className="text-gray-200">|</span>
                <button
                  onClick={() => setAddingCustom(true)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  + Custom item
                </button>
                <span className="text-gray-200">|</span>
                <button
                  onClick={async () => {
                    const label = window.prompt('Discount description:', 'Discount')
                    if (!label) return
                    const amountStr = window.prompt('Discount amount (£):')
                    if (!amountStr) return
                    const amountPounds = parseFloat(amountStr)
                    if (isNaN(amountPounds) || amountPounds <= 0) return
                    const res = await fetch(
                      `/api/quotes/${quoteId}/versions/${versionId}/sections/${section.id}/items`,
                      { method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: label, quantity: 1, unit: 'item',
                          unit_price_pence: -Math.round(amountPounds * 100),
                          sort_order: section.quote_line_items.length }) }
                    )
                    if (!res.ok) { toast.error('Failed to add discount'); return }
                    const { item } = await res.json()
                    onUpdate({ ...section, quote_line_items: [...section.quote_line_items, item] })
                    onTotalChange()
                  }}
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                >
                  − Discount
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {showPicker && (
        <ProductPicker
          productsGrouped={productsGrouped}
          onSelect={addItemFromProduct}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}

// ─── Payment Schedule (editable) ─────────────────────────────────────────────
function PaymentScheduleBlock({
  schedule: initialSchedule,
  totalPence,
  quoteId,
  versionId,
}: {
  schedule: PaymentMilestone[]
  totalPence: number
  quoteId: string
  versionId: string
}) {
  const [schedule, setSchedule] = useState<PaymentMilestone[]>(initialSchedule)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const [paymentRef, setPaymentRef] = useState('')
  const [pushingXero, setPushingXero] = useState<string | null>(null)

  if (!schedule.length) return null

  async function saveMilestone(id: string, updates: Record<string, unknown>) {
    try {
      const res = await fetch(
        `/api/quotes/${quoteId}/versions/${versionId}/payment-schedule/${id}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) }
      )
      if (!res.ok) throw new Error()
      const { milestone } = await res.json()
      setSchedule(s => s.map(m => m.id === id ? milestone : m))
      return milestone
    } catch {
      toast.error('Save failed')
    }
  }

  async function markPaid(m: PaymentMilestone) {
    await saveMilestone(m.id, {
      paid_at: new Date().toISOString(),
      payment_ref: paymentRef || null,
    })
    toast.success(`${m.label} marked as paid`)
    setMarkingPaid(null)
    setPaymentRef('')
  }

  async function markUnpaid(m: PaymentMilestone) {
    await saveMilestone(m.id, { paid_at: null, payment_ref: null })
    toast.success('Marked as unpaid')
  }

  async function pushToXero(m: PaymentMilestone) {
    if (m.xero_invoice_id) { toast.error('Invoice already exists in Xero'); return }
    setPushingXero(m.id)
    try {
      const res = await fetch(
        `/api/quotes/${quoteId}/versions/${versionId}/payment-schedule/${m.id}/xero`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }
      )
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error ?? 'Xero push failed')
        return
      }
      const { milestone } = await res.json()
      setSchedule(s => s.map(x => x.id === m.id ? milestone : x))
      toast.success(`Invoice created in Xero`)
    } catch {
      toast.error('Xero push failed')
    } finally {
      setPushingXero(null)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-[var(--primary)] mb-3">Payment Schedule</h3>
      <div className="space-y-2">
        {schedule.map(m => {
          const amount = totalPence > 0 && m.percentage
            ? Math.round(totalPence * m.percentage / 100)
            : m.amount_pence
          return (
            <div key={m.id} className="py-1.5 border-b border-gray-50 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{m.label}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                    <span>{m.due_trigger.replace(/_/g, ' ')}</span>
                    {m.xero_invoice_number && (
                      <span className="text-blue-500">#{m.xero_invoice_number}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-gray-900">{poundStr(amount)}</div>
                  {m.percentage && <div className="text-xs text-gray-400">{m.percentage}%</div>}
                </div>
              </div>

              {/* Status + actions */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {m.paid_at ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <Check size={10} /> Paid {new Date(m.paid_at).toLocaleDateString('en-GB')}
                    </span>
                    {m.payment_ref && <span className="text-xs text-gray-400">· {m.payment_ref}</span>}
                    <button onClick={() => markUnpaid(m)} className="text-xs text-gray-400 hover:text-red-500 ml-auto">undo</button>
                  </div>
                ) : markingPaid === m.id ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      autoFocus
                      value={paymentRef}
                      onChange={e => setPaymentRef(e.target.value)}
                      placeholder="Ref (optional)"
                      className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-[var(--primary)]"
                    />
                    <button
                      onClick={() => markPaid(m)}
                      className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-2 py-1 rounded"
                    >
                      Confirm
                    </button>
                    <button onClick={() => { setMarkingPaid(null); setPaymentRef('') }} className="text-xs text-gray-400">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setMarkingPaid(m.id)}
                      className="text-xs text-gray-500 hover:text-green-600 border border-gray-200 hover:border-green-300 px-2 py-0.5 rounded transition-colors"
                    >
                      Mark paid
                    </button>
                    {!m.xero_invoice_id && (
                      <button
                        onClick={() => pushToXero(m)}
                        disabled={pushingXero === m.id}
                        className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 hover:border-blue-300 px-2 py-0.5 rounded transition-colors disabled:opacity-40 flex items-center gap-1"
                      >
                        <FileText size={10} />
                        {pushingXero === m.id ? 'Pushing…' : 'Xero invoice'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {totalPence > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 mt-2">
            <span className="text-sm font-semibold text-gray-700">Total (inc VAT)</span>
            <span className="text-base font-bold text-gray-900">{poundStr(totalPence)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Share Link Button ────────────────────────────────────────────────────────
function ShareLinkButton({ quoteId, versionId }: { quoteId: string; versionId: string }) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function getLink() {
    setLoading(true)
    try {
      const res = await fetch(`/api/quotes/${quoteId}/token`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      })
      const { url } = await res.json()
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Client link copied to clipboard')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.error('Failed to generate link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={getLink}
      disabled={loading}
      className="w-full text-sm text-gray-500 border border-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {copied ? <><Check size={13} /> Link copied!</> : loading ? 'Generating…' : 'Copy client link'}
    </button>
  )
}

// ─── Send Quote Modal ─────────────────────────────────────────────────────────
function SendQuoteModal({ lead, quoteId, versionId, quoteRef, onClose, onSent }: {
  lead: Lead
  quoteId: string
  versionId: string
  quoteRef: string
  onClose: () => void
  onSent: () => void
}) {
  const [email, setEmail] = useState(lead.email ?? '')
  const [name, setName]   = useState(lead.name)
  const [subject, setSubject] = useState(`Your Garden Room Proposal — The Green Rooms (${quoteRef})`)
  const [bodyText, setBodyText] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    if (!email.trim()) { toast.error('Email address required'); return }
    setSending(true)
    try {
      const res = await fetch(`/api/quotes/${quoteId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId, recipientEmail: email.trim(), recipientName: name, subject, bodyText: bodyText || undefined }),
      })
      if (!res.ok) throw new Error('Send failed')
      toast.success(`Quote sent to ${email}`)
      onSent()
      onClose()
    } catch {
      toast.error('Failed to send — check your email settings')
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-800">Send Quote to Client</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Recipient Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Personal message (optional — replaces default intro)</label>
            <textarea value={bodyText} onChange={e => setBodyText(e.target.value)} rows={4}
              placeholder={`Hi ${lead.name.split(' ')[0]},\n\nGreat meeting you today…`}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)] resize-y placeholder:text-gray-300" />
          </div>
          <p className="text-xs text-gray-400">The PDF proposal will be attached automatically. A copy will be CC'd to info@thegreenrooms.com.</p>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 text-sm text-gray-500 border border-gray-200 rounded-lg py-2.5 hover:bg-gray-50">Cancel</button>
          <button onClick={send} disabled={sending}
            className="flex-1 text-sm font-medium text-white bg-[var(--primary)] hover:opacity-90 rounded-lg py-2.5 disabled:opacity-50">
            {sending ? 'Sending…' : 'Send Quote →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function QuoteEditorClient({
  leadId, lead, quoteId, quoteRef, versions, currentVersion,
  initialSections, initialPaymentSchedule, productsGrouped, assessment,
}: Props) {
  const router = useRouter()
  const [sections, setSections] = useState<Section[]>(initialSections)
  const [versionTotal, setVersionTotal] = useState(currentVersion.total_pence)
  const [coverLetter, setCoverLetter] = useState(currentVersion.cover_letter ?? '')
  const [savingCover, setSavingCover] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [buildDate, setBuildDate] = useState(currentVersion.build_date ?? '')
  const [expiresAt, setExpiresAt] = useState(currentVersion.expires_at ?? '')
  const coverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function autoSaveDates(field: 'build_date' | 'expires_at', value: string) {
    if (dateTimer.current) clearTimeout(dateTimer.current)
    dateTimer.current = setTimeout(async () => {
      await fetch(`/api/quotes/${quoteId}/versions/${currentVersion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value || null }),
      })
    }, 1000)
  }

  // Refresh total from server (called after any mutation)
  const refreshTotal = useCallback(async () => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}`)
      if (res.ok) {
        const data = await res.json()
        setVersionTotal(data.currentVersion?.total_pence ?? versionTotal)
      }
    } catch { /* ignore */ }
  }, [quoteId, versionTotal])

  async function addSection() {
    const res = await fetch(
      `/api/quotes/${quoteId}/versions/${currentVersion.id}/sections`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Section', sort_order: sections.length + 1 }),
      }
    )
    if (!res.ok) { toast.error('Failed to add section'); return }
    const { section } = await res.json()
    setSections(s => [...s, section])
  }

  function autoSaveCoverLetter(value: string) {
    setCoverLetter(value)
    if (coverTimer.current) clearTimeout(coverTimer.current)
    coverTimer.current = setTimeout(async () => {
      setSavingCover(true)
      try {
        await fetch(`/api/quotes/${quoteId}/versions/${currentVersion.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cover_letter: value }),
        })
      } finally {
        setSavingCover(false)
      }
    }, 1200)
  }

  async function createNewVersion() {
    const res = await fetch(
      `/api/quotes/${quoteId}/versions/${currentVersion.id}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }
    )
    if (!res.ok) { toast.error('Failed to create new version'); return }
    toast.success('New version created')
    router.refresh()
  }

  async function convertToJob() {
    if (!confirm('Convert this lead to a booked job? This will advance the stage to "Job Booked".')) return
    const res = await fetch(`/api/leads/${leadId}/convert-to-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteRef }),
    })
    if (!res.ok) { toast.error('Failed to convert to job'); return }
    toast.success('Lead advanced to Job Booked')
    router.push(`/leads/${leadId}`)
  }

  // VAT breakdown (assume 20% VAT on everything)
  const netPence = Math.round(versionTotal / 1.2)
  const vatPence = versionTotal - netPence

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 max-w-5xl mx-auto w-full">
      {/* ── Main editor column ── */}
      <div className="flex-1 space-y-4 min-w-0">
        {/* Cover letter */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[var(--primary)]">Cover Letter / Introduction</h3>
            {savingCover && <span className="text-xs text-gray-400">Saving…</span>}
          </div>
          <textarea
            value={coverLetter}
            onChange={e => autoSaveCoverLetter(e.target.value)}
            placeholder={`Dear ${lead.name.split(' ')[0]},\n\nThank you for your time during our site visit…`}
            rows={4}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)] resize-y placeholder:text-gray-300"
          />
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {sections.map(section => (
            <SectionBlock
              key={section.id}
              section={section}
              quoteId={quoteId}
              versionId={currentVersion.id}
              productsGrouped={productsGrouped}
              onUpdate={updated => setSections(ss => ss.map(s => s.id === updated.id ? updated : s))}
              onDelete={() => setSections(ss => ss.filter(s => s.id !== section.id))}
              onTotalChange={refreshTotal}
            />
          ))}
        </div>

        {/* Add section */}
        <button
          onClick={addSection}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={15} /> Add section
        </button>
      </div>

      {/* ── Right sidebar ── */}
      <div className="lg:w-72 space-y-4 shrink-0">
        {/* Quote summary */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-[var(--primary)] mb-3">Quote Summary</h3>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Quote ref</span>
              <span className="font-medium text-gray-800">{quoteRef}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Customer</span>
              <span className="font-medium text-gray-800">{lead.name}</span>
            </div>
            {lead.address && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Site</span>
                <span className="font-medium text-gray-800 text-right max-w-[140px]">{lead.address}</span>
              </div>
            )}
            {assessment?.width_m && assessment?.depth_m && (
              <div className="flex justify-between text-xs text-gray-500">
                <span>Size</span>
                <span className="font-semibold text-[var(--primary)]">{assessment.width_m}m × {assessment.depth_m}m · {(assessment.width_m * assessment.depth_m).toFixed(1)}m²</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-gray-500">
              <span>Version</span>
              <span className="font-medium text-gray-800">v{currentVersion.version_number}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Net</span>
              <span>{poundStr(netPence)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>VAT (20%)</span>
              <span>{poundStr(vatPence)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-100">
              <span>Total inc VAT</span>
              <span className="text-[var(--primary)]">{poundStr(versionTotal)}</span>
            </div>
          </div>

          {/* Build date + expiry */}
          <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Est. build date</label>
              <input
                type="month"
                value={buildDate}
                onChange={e => { setBuildDate(e.target.value); autoSaveDates('build_date', e.target.value) }}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-[var(--primary)]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Quote expires</label>
              <input
                type="date"
                value={expiresAt}
                onChange={e => { setExpiresAt(e.target.value); autoSaveDates('expires_at', e.target.value) }}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>
        </div>

        {/* Payment schedule */}
        <PaymentScheduleBlock
          schedule={initialPaymentSchedule}
          totalPence={versionTotal}
          quoteId={quoteId}
          versionId={currentVersion.id}
        />

        {/* Version history */}
        {versions.length > 1 && (
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-[var(--primary)] mb-2">Versions</h3>
            <div className="space-y-1">
              {[...versions].sort((a, b) => b.version_number - a.version_number).map(v => (
                <div key={v.id} className={`flex items-center justify-between py-1.5 text-xs ${v.is_current ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                  <span>v{v.version_number} {v.title ? `— ${v.title}` : ''}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    v.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    v.status === 'sent'     ? 'bg-blue-100 text-blue-700' :
                    v.status === 'draft'    ? 'bg-gray-100 text-gray-500' :
                                              'bg-gray-100 text-gray-400'
                  }`}>{v.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-[var(--primary)] mb-1">Actions</h3>
          <button
            onClick={() => setShowSendModal(true)}
            className="block w-full text-center text-sm font-medium text-white bg-[var(--primary)] hover:opacity-90 px-4 py-2.5 rounded-lg transition-opacity"
          >
            Send to Client →
          </button>
          <a
            href={`/api/quotes/${quoteId}/pdf`}
            target="_blank"
            className="block w-full text-center text-sm font-medium text-[var(--primary)] border border-[var(--primary)] px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Preview PDF
          </a>
          <ShareLinkButton quoteId={quoteId} versionId={currentVersion.id} />
          {currentVersion.status === 'accepted' && (
            <button
              onClick={convertToJob}
              className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-lg transition-colors"
            >
              <Briefcase size={14} /> Convert to Job
            </button>
          )}
          <button
            onClick={createNewVersion}
            className="w-full text-sm text-gray-500 border border-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            New revision
          </button>
          <a
            href={`/leads/${leadId}`}
            className="block w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1"
          >
            ← Back to lead
          </a>
        </div>
      </div>

      {showSendModal && (
        <SendQuoteModal
          lead={lead}
          quoteId={quoteId}
          versionId={currentVersion.id}
          quoteRef={quoteRef}
          onClose={() => setShowSendModal(false)}
          onSent={() => router.refresh()}
        />
      )}
    </div>
  )
}
