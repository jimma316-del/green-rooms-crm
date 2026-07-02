'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, Printer, Save, GripVertical } from 'lucide-react'
import type { LeadQuote, QuoteTier, QuoteLineItem, SiteAssessment } from '@/types/assessment'
import { CLADDING_LABELS, tierTotal, poundStr, TIER_DEFAULTS } from '@/types/assessment'

const TIER_COLOURS = {
  good:   { bg: 'bg-slate-50',  border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700',  active: 'border-slate-400' },
  better: { bg: 'bg-blue-50',   border: 'border-blue-200',  badge: 'bg-blue-100 text-blue-700',    active: 'border-blue-500' },
  best:   { bg: 'bg-amber-50',  border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700',  active: 'border-amber-500' },
}

function buildDefaultItems(a: SiteAssessment, tierKey: 'good' | 'better' | 'best'): QuoteLineItem[] {
  const items: QuoteLineItem[] = []
  const cladding = a.tiers_enabled
    ? (tierKey === 'good' ? a.cladding_good : tierKey === 'better' ? a.cladding_better : a.cladding_best) ?? 'box_profile'
    : (a.single_cladding ?? 'box_profile')

  const sqm = a.width_m && a.depth_m ? a.width_m * a.depth_m : 0
  const claddingLabel = CLADDING_LABELS[cladding] ?? cladding

  items.push({
    id: crypto.randomUUID(), category: 'room', vat: true,
    description: `Garden Room ${a.width_m ?? '?'}m × ${a.depth_m ?? '?'}m — ${claddingLabel} cladding`,
    amount_pence: 0,
  })

  if (a.cable_run_m) {
    items.push({
      id: crypto.randomUUID(), category: 'electrics', vat: true,
      description: a.has_consumer_unit
        ? `Consumer unit connection & first fix (${a.cable_run_m}m cable run)`
        : `Mains supply connection (${a.cable_run_m}m armoured cable run)`,
      amount_pence: 0,
    })
  }

  if (a.downlight_count > 0 || a.double_socket_count > 0) {
    items.push({
      id: crypto.randomUUID(), category: 'electrics', vat: true,
      description: `Electrics — ${a.downlight_count} LED downlights, ${a.double_socket_count} double sockets${a.usb_socket_count > 0 ? `, ${a.usb_socket_count} USB sockets` : ''}, EIC certificate`,
      amount_pence: 0,
    })
  }

  if (a.electricals?.includes('cat6')) {
    items.push({ id: crypto.randomUUID(), category: 'electrics', vat: true, description: 'WiFi via Cat6a data cable', amount_pence: 0 })
  }

  const hasAc = a.climate === 'ac_2_5kw' || a.climate === 'ac_5kw'
  if (hasAc) {
    const acLabel = a.climate === 'ac_5kw' ? '5kW' : '2.5kW'
    items.push({
      id: crypto.randomUUID(), category: 'extras', vat: true,
      description: `Air conditioning — ${acLabel} unit (heat & cool)`,
      amount_pence: 0,
    })
  }

  if (a.climate === 'wall_heater') {
    items.push({ id: crypto.randomUUID(), category: 'extras', vat: true, description: 'Electric panel heater', amount_pence: 0 })
  }

  if (a.has_decking) {
    const deckSqm = a.deck_w && a.deck_d ? ` (approx ${(a.deck_w * a.deck_d).toFixed(1)}m²)` : ''
    items.push({
      id: crypto.randomUUID(), category: 'decking', vat: true,
      description: `Composite decking${deckSqm}`,
      amount_pence: 0,
    })
  }

  if (a.planning_type === 'full_planning' || a.planning_type === 'conservation_area' || a.planning_type === 'listed_building') {
    items.push({ id: crypto.randomUUID(), category: 'extras', vat: false, description: 'Planning application fee (exempt from VAT)', amount_pence: 0 })
  }

  if (sqm > 0) {
    items.push({ id: crypto.randomUUID(), category: 'other', vat: false, description: 'Ground screws (permitted development / no concrete)', amount_pence: 0 })
  }

  return items
}

function buildDefaultTiers(assessment: SiteAssessment | null): QuoteTier[] {
  if (!assessment) return TIER_DEFAULTS.map(t => ({ ...t, line_items: [] }))

  const tiers = TIER_DEFAULTS.map(t => ({
    ...t,
    cladding: assessment.tiers_enabled
      ? (t.key === 'good' ? assessment.cladding_good : t.key === 'better' ? assessment.cladding_better : assessment.cladding_best) ?? t.cladding
      : (assessment.single_cladding ?? t.cladding),
    included: !assessment.tiers_enabled ? t.key === 'good' : true,
    line_items: buildDefaultItems(assessment, t.key),
  }))

  if (!assessment.tiers_enabled) {
    return tiers.filter(t => t.key === 'good').map(t => ({ ...t, label: 'Your Quote' }))
  }

  return tiers
}

function PoundInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [raw, setRaw] = useState(() => (value / 100).toFixed(2))

  function handleBlur() {
    const num = parseFloat(raw.replace(/[^0-9.]/g, ''))
    if (!isNaN(num)) {
      onChange(Math.round(num * 100))
      setRaw(num.toFixed(2))
    }
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={e => setRaw(e.target.value)}
        onFocus={e => e.target.select()}
        onBlur={handleBlur}
        className="w-28 pl-6 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
      />
    </div>
  )
}

function TierPanel({
  tier,
  onChange,
}: {
  tier: QuoteTier
  onChange: (t: QuoteTier) => void
}) {
  const c = TIER_COLOURS[tier.key]
  const { exVat, vat, incVat } = tierTotal(tier.line_items)

  function addItem() {
    onChange({
      ...tier,
      line_items: [...tier.line_items, {
        id: crypto.randomUUID(), category: 'other', description: '', amount_pence: 0, vat: true,
      }],
    })
  }

  function updateItem(idx: number, changes: Partial<QuoteLineItem>) {
    onChange({
      ...tier,
      line_items: tier.line_items.map((li, i) => i === idx ? { ...li, ...changes } : li),
    })
  }

  function removeItem(idx: number) {
    onChange({ ...tier, line_items: tier.line_items.filter((_, i) => i !== idx) })
  }

  return (
    <div className={`rounded-xl border-2 ${tier.included ? c.active : 'border-gray-200 opacity-60'} overflow-hidden`}>
      {/* Header */}
      <div className={`${c.bg} px-4 py-3 flex items-center gap-3`}>
        <button
          type="button"
          onClick={() => onChange({ ...tier, included: !tier.included })}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
            tier.included ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-gray-300 bg-white'
          }`}
        >
          {tier.included && <svg viewBox="0 0 10 8" className="w-3 h-3 text-white fill-white"><path d="M1 4l2.5 2.5L9 1"/></svg>}
        </button>
        <div className="flex-1">
          <input
            type="text"
            value={tier.label}
            onChange={e => onChange({ ...tier, label: e.target.value })}
            className={`font-bold text-base bg-transparent border-none focus:outline-none w-full ${c.badge.split(' ').pop()}`}
          />
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>
          {CLADDING_LABELS[tier.cladding] ?? tier.cladding}
        </span>
      </div>

      {/* Cladding override */}
      <div className="px-4 py-2 bg-white border-b border-gray-100">
        <select
          value={tier.cladding}
          onChange={e => onChange({ ...tier, cladding: e.target.value })}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white"
        >
          {Object.entries(CLADDING_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Line items */}
      <div className="bg-white divide-y divide-gray-50">
        {tier.line_items.map((li, i) => (
          <div key={li.id} className="flex items-center gap-2 px-4 py-2.5 group">
            <GripVertical className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
            <input
              type="text"
              value={li.description}
              onChange={e => updateItem(i, { description: e.target.value })}
              placeholder="Line item description"
              className="flex-1 text-sm border-none focus:outline-none bg-transparent text-gray-800"
            />
            <button
              onClick={() => updateItem(i, { vat: !li.vat })}
              title={li.vat ? 'VAT: 20%' : 'No VAT'}
              className={`text-xs px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${li.vat ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'}`}
            >
              {li.vat ? '20%' : '0%'}
            </button>
            <PoundInput value={li.amount_pence} onChange={v => updateItem(i, { amount_pence: v })} />
            <button onClick={() => removeItem(i)}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 p-1 flex-shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        <button onClick={addItem}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-400 hover:text-[var(--primary)] hover:bg-gray-50">
          <Plus className="w-3.5 h-3.5" /> Add line item
        </button>
      </div>

      {/* Totals */}
      <div className={`${c.bg} px-4 py-3 space-y-1 text-sm border-t ${c.border}`}>
        <div className="flex justify-between text-gray-500">
          <span>Subtotal (ex VAT)</span>
          <span className="font-mono">{poundStr(exVat)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>VAT (20%)</span>
          <span className="font-mono">{poundStr(vat)}</span>
        </div>
        <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-200">
          <span>Total (inc VAT)</span>
          <span className="font-mono">{poundStr(incVat)}</span>
        </div>
      </div>
    </div>
  )
}

export function QuoteBuilder({
  leadId,
  leadName,
  assessment,
  existingQuote,
}: {
  leadId: string
  leadName: string
  assessment: SiteAssessment | null
  existingQuote: LeadQuote | null
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [tiers, setTiers] = useState<QuoteTier[]>(() =>
    existingQuote?.tiers?.length
      ? existingQuote.tiers
      : buildDefaultTiers(assessment)
  )

  const [coverNote, setCoverNote] = useState(
    existingQuote?.cover_note ??
    `Hi ${leadName.split(' ')[0]},\n\nThank you so much for meeting with me today. It was great to see your garden and discuss your project in more detail — I'm really excited about what we can create for you.\n\nPlease find your personalised quote below. I've put together${tiers.filter(t => t.included).length > 1 ? ' a few options at different price points' : ' a detailed quote'} based on everything we discussed.\n\nAs always, I'm happy to talk through any questions. Just drop me a message or give me a call.\n\nBest regards,\nJames Austin\nThe Green Rooms`
  )

  const [buildDate, setBuildDate] = useState(existingQuote?.earliest_build_date ?? '')

  const updateTier = useCallback((idx: number, t: QuoteTier) => {
    setTiers(prev => prev.map((x, i) => i === idx ? t : x))
  }, [])

  async function save() {
    setSaving(true)
    const url = existingQuote
      ? `/api/leads/${leadId}/quotes/${existingQuote.id}`
      : `/api/leads/${leadId}/quotes`
    const method = existingQuote ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tiers,
        cover_note: coverNote,
        earliest_build_date: buildDate || null,
        assessment_id: assessment?.id ?? null,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error ?? 'Failed to save quote')
      setSaving(false)
      return
    }
    toast.success('Quote saved')
    setSaving(false)
    if (!existingQuote) {
      router.replace(`/leads/${leadId}/quote/${json.quote.id}`)
    } else {
      router.refresh()
    }
  }

  const includedTiers = tiers.filter(t => t.included)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Quote Builder</h2>
          <p className="text-sm text-gray-500">{leadName}</p>
        </div>
        <div className="flex gap-2">
          {existingQuote && (
            <a
              href={`/leads/${leadId}/quote/${existingQuote.id}/print`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <Printer className="w-4 h-4" /> Preview Proposal
            </a>
          )}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Quote'}
          </button>
        </div>
      </div>

      {/* Assessment context banner */}
      {assessment && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600">
          <span className="font-medium text-gray-800">From assessment: </span>
          {assessment.width_m}m × {assessment.depth_m}m
          {assessment.roof_type && ` · ${assessment.roof_type.replace(/_/g, ' ')} roof`}
          {assessment.has_canopy && ` · canopy`}
          {assessment.doors?.length > 0 && ` · ${assessment.doors.length} door set${assessment.doors.length > 1 ? 's' : ''}`}
          {(assessment.climate === 'ac_2_5kw' || assessment.climate === 'ac_5kw') && ` · AC`}
          {assessment.has_decking && ` · decking`}
        </div>
      )}

      {/* Tier panels */}
      <div className="space-y-4">
        {tiers.map((tier, i) => (
          <TierPanel key={tier.key} tier={tier} onChange={t => updateTier(i, t)} />
        ))}
      </div>

      {/* Price comparison summary */}
      {includedTiers.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Price Comparison</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${includedTiers.length}, 1fr)` }}>
            {includedTiers.map(t => {
              const { incVat } = tierTotal(t.line_items)
              return (
                <div key={t.key} className="text-center">
                  <p className="text-xs text-gray-500 mb-1">{t.label}</p>
                  <p className="text-xl font-bold text-gray-900">{poundStr(incVat)}</p>
                  <p className="text-xs text-gray-400">inc VAT</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cover note */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Personalised Intro (printed in proposal)</p>
        <textarea
          value={coverNote}
          onChange={e => setCoverNote(e.target.value)}
          rows={8}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 font-sans leading-relaxed"
        />
      </div>

      {/* Build date */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Earliest Build Date</p>
        <input type="date" value={buildDate} onChange={e => setBuildDate(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
        <p className="text-xs text-gray-400 mt-1">Shown on payment terms page of the proposal</p>
      </div>

      {/* Save */}
      <div className="flex justify-end gap-3">
        {existingQuote && (
          <a href={`/leads/${leadId}/quote/${existingQuote.id}/print`} target="_blank"
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Printer className="w-4 h-4" /> Preview Proposal
          </a>
        )}
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Quote'}
        </button>
      </div>
    </div>
  )
}
