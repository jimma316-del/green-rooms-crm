'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import type { SiteAssessment, WindowSpec } from '@/types/assessment'
import { CLADDING_OPTIONS } from '@/types/assessment'

const STEPS = [
  { id: 'dimensions', label: 'Dimensions' },
  { id: 'cladding',   label: 'Cladding' },
  { id: 'doors',      label: 'Doors & Windows' },
  { id: 'electrics',  label: 'Electrics' },
  { id: 'extras',     label: 'Extras' },
  { id: 'site',       label: 'Site Notes' },
]

type Draft = Omit<SiteAssessment, 'id' | 'lead_id' | 'created_by' | 'created_at' | 'updated_at'>

function newWindow(): WindowSpec {
  return { id: crypto.randomUUID(), type: 'fixed', width_mm: 1200, height_mm: 900, position: 'left', count: 1 }
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-left"
    >
      <div className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[var(--primary)]' : 'bg-gray-300'}`}>
        <div className={`w-5 h-5 bg-white rounded-full shadow m-0.5 transition-transform ${checked ? 'translate-x-6' : ''}`} />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </button>
  )
}

function NumStepper({ value, onChange, min = 0, max = 999, step = 1, label }: {
  value: number; onChange: (v: number) => void
  min?: number; max?: number; step?: number; label?: string
}) {
  return (
    <div>
      {label && <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>}
      <div className="flex items-center gap-0">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))}
          className="w-11 h-11 rounded-l-lg border border-gray-200 text-lg font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 flex-shrink-0">−</button>
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={min} max={max}
          className="w-16 h-11 text-center border-t border-b border-gray-200 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 bg-white"
        />
        <button type="button" onClick={() => onChange(Math.min(max, value + step))}
          className="w-11 h-11 rounded-r-lg border border-gray-200 text-lg font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 flex-shrink-0">+</button>
      </div>
    </div>
  )
}

function BigOption({ value, selected, onClick, label, sub }: {
  value: string; selected: boolean; onClick: () => void; label: string; sub?: string
}) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
        selected ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}>
      <div className="font-medium text-sm text-gray-900">{label}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </button>
  )
}

const DEFAULT: Draft = {
  width_m: null, depth_m: null, height_eaves_m: null,
  roof_type: 'flat', has_canopy: false, canopy_depth_m: null,
  tiers_enabled: true,
  cladding_good: 'box_profile', cladding_better: 'thermo_ayous', cladding_best: 'charred_spruce',
  single_cladding: null,
  door_type: 'bifold', door_panels: 4, door_colour: 'Anthracite Grey',
  windows: [],
  has_consumer_unit: false, cable_run_m: null,
  downlight_count: 6, double_socket_count: 4, usb_socket_count: 2,
  has_wifi: true, has_ac: false, ac_units: 0, has_ufh: false,
  has_decking: false, decking_sqm: null, decking_tier: 'better',
  has_blinds: false, blinds_tier: 'better',
  has_acoustic_panels: false, needs_planning: false,
  ground_type: 'grass', access_notes: null, site_notes: null, photo_urls: [],
}

export function AssessmentForm({ leadId, initial }: { leadId: string; initial: SiteAssessment | null }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Draft>(initial ? {
    width_m: initial.width_m, depth_m: initial.depth_m, height_eaves_m: initial.height_eaves_m,
    roof_type: initial.roof_type, has_canopy: initial.has_canopy, canopy_depth_m: initial.canopy_depth_m,
    tiers_enabled: initial.tiers_enabled,
    cladding_good: initial.cladding_good, cladding_better: initial.cladding_better,
    cladding_best: initial.cladding_best, single_cladding: initial.single_cladding,
    door_type: initial.door_type, door_panels: initial.door_panels, door_colour: initial.door_colour,
    windows: initial.windows,
    has_consumer_unit: initial.has_consumer_unit, cable_run_m: initial.cable_run_m,
    downlight_count: initial.downlight_count, double_socket_count: initial.double_socket_count,
    usb_socket_count: initial.usb_socket_count,
    has_wifi: initial.has_wifi, has_ac: initial.has_ac, ac_units: initial.ac_units, has_ufh: initial.has_ufh,
    has_decking: initial.has_decking, decking_sqm: initial.decking_sqm, decking_tier: initial.decking_tier,
    has_blinds: initial.has_blinds, blinds_tier: initial.blinds_tier,
    has_acoustic_panels: initial.has_acoustic_panels, needs_planning: initial.needs_planning,
    ground_type: initial.ground_type, access_notes: initial.access_notes, site_notes: initial.site_notes,
    photo_urls: initial.photo_urls,
  } : DEFAULT)

  const set = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft(d => ({ ...d, [key]: value }))
  }, [])

  async function save(andGo?: 'quote') {
    setSaving(true)
    const res = await fetch(`/api/leads/${leadId}/assessment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    if (!res.ok) {
      toast.error('Failed to save assessment')
      setSaving(false)
      return
    }
    toast.success('Assessment saved')
    setSaving(false)
    if (andGo === 'quote') {
      router.push(`/leads/${leadId}/quote`)
    } else {
      router.refresh()
    }
  }

  function addWindow() {
    set('windows', [...draft.windows, newWindow()])
  }
  function updateWindow(idx: number, changes: Partial<WindowSpec>) {
    set('windows', draft.windows.map((w, i) => i === idx ? { ...w, ...changes } : w))
  }
  function removeWindow(idx: number) {
    set('windows', draft.windows.filter((_, i) => i !== idx))
  }

  const isLast = step === STEPS.length - 1

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Step bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-sm font-semibold text-gray-900">Site Assessment</h1>
            <button onClick={() => save()} disabled={saving}
              className="text-xs px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <button key={s.id} onClick={() => setStep(i)}
                className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? 'bg-[var(--primary)]' : 'bg-gray-200'}`}
                title={s.label} />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">{STEPS[step].label} ({step + 1}/{STEPS.length})</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">

        {/* STEP 0: Dimensions */}
        {step === 0 && (
          <div className="space-y-6">
            <Section title="Room Size">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Width (m)</p>
                  <input type="number" step="0.1" min="0"
                    value={draft.width_m ?? ''}
                    onChange={e => set('width_m', e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g. 5.5"
                    className="w-full text-2xl font-bold border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--primary)]" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Depth (m)</p>
                  <input type="number" step="0.1" min="0"
                    value={draft.depth_m ?? ''}
                    onChange={e => set('depth_m', e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g. 3.0"
                    className="w-full text-2xl font-bold border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--primary)]" />
                </div>
              </div>
              {draft.width_m && draft.depth_m && (
                <p className="text-sm text-gray-500 mt-2">
                  {(draft.width_m * draft.depth_m).toFixed(1)} m² total floor area
                </p>
              )}
            </Section>

            <Section title="Roof">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: 'flat', l: 'Flat', s: 'EPDM rubber' },
                  { v: 'apex', l: 'Apex', s: 'A-frame ridge' },
                  { v: 'mono_pitch', l: 'Mono Pitch', s: 'Single slope' },
                ].map(o => (
                  <BigOption key={o.v} value={o.v} selected={draft.roof_type === o.v}
                    onClick={() => set('roof_type', o.v as Draft['roof_type'])}
                    label={o.l} sub={o.s} />
                ))}
              </div>
            </Section>

            <Section title="Eaves Height (optional)">
              <input type="number" step="0.1" min="0"
                value={draft.height_eaves_m ?? ''}
                onChange={e => set('height_eaves_m', e.target.value ? Number(e.target.value) : null)}
                placeholder="e.g. 2.4"
                className="w-40 text-xl font-bold border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--primary)]" />
              <p className="text-xs text-gray-400 mt-1">Standard is 2.4m at eaves</p>
            </Section>

            <Section title="Canopy">
              <Toggle checked={draft.has_canopy} onChange={v => set('has_canopy', v)} label="Includes canopy / covered outdoor area" />
              {draft.has_canopy && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-1">Canopy depth (m)</p>
                  <input type="number" step="0.1" min="0"
                    value={draft.canopy_depth_m ?? ''}
                    onChange={e => set('canopy_depth_m', e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g. 1.5"
                    className="w-32 border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-semibold focus:outline-none focus:border-[var(--primary)]" />
                </div>
              )}
            </Section>
          </div>
        )}

        {/* STEP 1: Cladding */}
        {step === 1 && (
          <div className="space-y-6">
            <Section title="Quote Options">
              <Toggle checked={draft.tiers_enabled}
                onChange={v => set('tiers_enabled', v)}
                label="Offer Good / Better / Best options (recommended)" />
            </Section>

            {draft.tiers_enabled ? (
              <>
                <Section title="Good Option — Entry Level">
                  <div className="grid grid-cols-1 gap-2">
                    {CLADDING_OPTIONS.map(o => (
                      <BigOption key={o.value} value={o.value}
                        selected={draft.cladding_good === o.value}
                        onClick={() => set('cladding_good', o.value)}
                        label={o.label} />
                    ))}
                  </div>
                </Section>
                <Section title="Better Option — Mid Range">
                  <div className="grid grid-cols-1 gap-2">
                    {CLADDING_OPTIONS.map(o => (
                      <BigOption key={o.value} value={o.value}
                        selected={draft.cladding_better === o.value}
                        onClick={() => set('cladding_better', o.value)}
                        label={o.label} />
                    ))}
                  </div>
                </Section>
                <Section title="Best Option — Premium">
                  <div className="grid grid-cols-1 gap-2">
                    {CLADDING_OPTIONS.map(o => (
                      <BigOption key={o.value} value={o.value}
                        selected={draft.cladding_best === o.value}
                        onClick={() => set('cladding_best', o.value)}
                        label={o.label} />
                    ))}
                  </div>
                </Section>
              </>
            ) : (
              <Section title="Cladding">
                <div className="grid grid-cols-1 gap-2">
                  {CLADDING_OPTIONS.map(o => (
                    <BigOption key={o.value} value={o.value}
                      selected={draft.single_cladding === o.value}
                      onClick={() => set('single_cladding', o.value)}
                      label={o.label} />
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {/* STEP 2: Doors & Windows */}
        {step === 2 && (
          <div className="space-y-6">
            <Section title="Main Door Type">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: 'bifold',  l: 'Bi-fold',   s: 'Aluminium, folds back' },
                  { v: 'sliding', l: 'Sliding',    s: 'Aluminium, slides open' },
                  { v: 'french',  l: 'French',     s: 'Double outward swing' },
                  { v: 'single',  l: 'Single',     s: 'Single door' },
                ].map(o => (
                  <BigOption key={o.v} value={o.v} selected={draft.door_type === o.v}
                    onClick={() => set('door_type', o.v as Draft['door_type'])}
                    label={o.l} sub={o.s} />
                ))}
              </div>
            </Section>

            {draft.door_type === 'bifold' && (
              <Section title="Number of Panels">
                <NumStepper value={draft.door_panels ?? 2} min={2} max={8}
                  onChange={v => set('door_panels', v)} />
              </Section>
            )}

            <Section title="Door Colour">
              <div className="grid grid-cols-2 gap-2">
                {['Anthracite Grey', 'Black', 'White', 'Other'].map(c => (
                  <BigOption key={c} value={c} selected={draft.door_colour === c}
                    onClick={() => set('door_colour', c)} label={c} />
                ))}
              </div>
              {draft.door_colour === 'Other' && (
                <input type="text" placeholder="Specify colour / RAL code"
                  className="mt-2 w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--primary)]" />
              )}
            </Section>

            <Section title="Windows">
              <div className="space-y-3">
                {draft.windows.map((w, i) => (
                  <div key={w.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm text-gray-700">Window {i + 1}</span>
                      <button onClick={() => removeWindow(i)} className="text-gray-400 hover:text-red-500 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Type</p>
                        <select value={w.type} onChange={e => updateWindow(i, { type: e.target.value as WindowSpec['type'] })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                          <option value="fixed">Fixed</option>
                          <option value="casement">Casement (opening)</option>
                          <option value="velux">Velux / Roof light</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Position</p>
                        <select value={w.position} onChange={e => updateWindow(i, { position: e.target.value as WindowSpec['position'] })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                          <option value="front">Front</option>
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                          <option value="rear">Rear</option>
                          <option value="roof">Roof</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Width (mm)</p>
                        <input type="number" value={w.width_mm}
                          onChange={e => updateWindow(i, { width_mm: Number(e.target.value) })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Height (mm)</p>
                        <input type="number" value={w.height_mm}
                          onChange={e => updateWindow(i, { height_mm: Number(e.target.value) })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Count</p>
                        <input type="number" min={1} max={10} value={w.count}
                          onChange={e => updateWindow(i, { count: Number(e.target.value) })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addWindow}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-[var(--primary)] hover:text-[var(--primary)]">
                  <Plus className="w-4 h-4" /> Add Window
                </button>
              </div>
            </Section>
          </div>
        )}

        {/* STEP 3: Electrics */}
        {step === 3 && (
          <div className="space-y-6">
            <Section title="Power Supply">
              <Toggle checked={draft.has_consumer_unit}
                onChange={v => set('has_consumer_unit', v)}
                label="Existing consumer unit on site / close enough to use" />
              <div className="mt-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                  {draft.has_consumer_unit ? 'Cable run from consumer unit (m)' : 'Mains connection cable run (m)'}
                </p>
                <input type="number" step="1" min="0"
                  value={draft.cable_run_m ?? ''}
                  onChange={e => set('cable_run_m', e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g. 15"
                  className="w-40 text-xl font-bold border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--primary)]" />
              </div>
            </Section>

            <Section title="Lighting & Sockets">
              <div className="grid grid-cols-3 gap-6">
                <NumStepper value={draft.downlight_count} min={0} max={30}
                  onChange={v => set('downlight_count', v)} label="LED Downlights" />
                <NumStepper value={draft.double_socket_count} min={0} max={20}
                  onChange={v => set('double_socket_count', v)} label="Double Sockets" />
                <NumStepper value={draft.usb_socket_count} min={0} max={10}
                  onChange={v => set('usb_socket_count', v)} label="USB Sockets" />
              </div>
            </Section>

            <Section title="Additional">
              <div className="space-y-4">
                <Toggle checked={draft.has_wifi} onChange={v => set('has_wifi', v)} label="WiFi access point" />
                <Toggle checked={draft.has_ac} onChange={v => {
                  set('has_ac', v)
                  if (!v) set('ac_units', 0)
                  else if (draft.ac_units === 0) set('ac_units', 1)
                }} label="Air conditioning" />
                {draft.has_ac && (
                  <div className="ml-14">
                    <NumStepper value={draft.ac_units} min={1} max={4}
                      onChange={v => set('ac_units', v)} label="Number of units" />
                  </div>
                )}
                <Toggle checked={draft.has_ufh} onChange={v => set('has_ufh', v)} label="Underfloor heating" />
              </div>
            </Section>
          </div>
        )}

        {/* STEP 4: Extras */}
        {step === 4 && (
          <div className="space-y-6">
            <Section title="Decking">
              <Toggle checked={draft.has_decking} onChange={v => set('has_decking', v)} label="Includes decking" />
              {draft.has_decking && (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Approximate area (m²)</p>
                    <input type="number" step="0.5" min="0"
                      value={draft.decking_sqm ?? ''}
                      onChange={e => set('decking_sqm', e.target.value ? Number(e.target.value) : null)}
                      placeholder="e.g. 12"
                      className="w-40 text-xl font-bold border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--primary)]" />
                  </div>
                  {draft.tiers_enabled && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Include decking from which tier?</p>
                      <div className="flex gap-2">
                        {(['good','better','best'] as const).map(t => (
                          <button key={t} onClick={() => set('decking_tier', t)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize border-2 ${draft.decking_tier === t ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-gray-200'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Section>

            <Section title="Other Extras">
              <div className="space-y-4">
                <div>
                  <Toggle checked={draft.has_blinds} onChange={v => set('has_blinds', v)} label="Blinds" />
                  {draft.has_blinds && draft.tiers_enabled && (
                    <div className="mt-2 ml-14">
                      <p className="text-xs text-gray-400 mb-1">Include from which tier?</p>
                      <div className="flex gap-2">
                        {(['good','better','best'] as const).map(t => (
                          <button key={t} onClick={() => set('blinds_tier', t)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border-2 ${draft.blinds_tier === t ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-gray-200'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Toggle checked={draft.has_acoustic_panels} onChange={v => set('has_acoustic_panels', v)} label="Acoustic wall panels" />
                <Toggle checked={draft.needs_planning} onChange={v => set('needs_planning', v)} label="Planning application required" />
              </div>
            </Section>
          </div>
        )}

        {/* STEP 5: Site Notes */}
        {step === 5 && (
          <div className="space-y-6">
            <Section title="Ground Condition">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: 'grass',  l: 'Grass / Lawn' },
                  { v: 'patio',  l: 'Existing Patio' },
                  { v: 'slope',  l: 'Sloped Ground' },
                  { v: 'mixed',  l: 'Mixed' },
                  { v: 'other',  l: 'Other' },
                ].map(o => (
                  <BigOption key={o.v} value={o.v} selected={draft.ground_type === o.v}
                    onClick={() => set('ground_type', o.v as Draft['ground_type'])}
                    label={o.l} />
                ))}
              </div>
            </Section>

            <Section title="Access Notes">
              <textarea
                value={draft.access_notes ?? ''}
                onChange={e => set('access_notes', e.target.value || null)}
                rows={3}
                placeholder="Gate width, side access, any delivery constraints..."
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[var(--primary)]" />
            </Section>

            <Section title="Site Notes">
              <textarea
                value={draft.site_notes ?? ''}
                onChange={e => set('site_notes', e.target.value || null)}
                rows={4}
                placeholder="Customer requirements, planning considerations, neighbour concerns, any special requests discussed..."
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[var(--primary)]" />
            </Section>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-800 mb-1">All done!</p>
              <p className="text-xs text-green-700">Save the assessment, then head to the Quote Builder to create the proposal with Good / Better / Best pricing.</p>
            </div>
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 sticky bottom-0">
        <div className="max-w-2xl mx-auto flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 px-5 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          <div className="flex-1" />
          {!isLast ? (
            <button onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:opacity-90">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => save()} disabled={saving}
                className="px-5 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Only'}
              </button>
              <button onClick={() => save('quote')} disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
                <Check className="w-4 h-4" /> Save & Build Quote
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  )
}
