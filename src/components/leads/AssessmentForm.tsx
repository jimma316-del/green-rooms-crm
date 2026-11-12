'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, Check } from 'lucide-react'
import type { SiteAssessment, DoorSpec, WindowSpec } from '@/types/assessment'
import {
  CLADDING_OPTIONS, DOOR_OPTIONS, WINDOW_OPTIONS, ROOF_OPTIONS,
  ELEC_OPTIONS, CLIMATE_OPTIONS, estimatePrice, poundK, PRICING,
  DOOR_DEFAULT_WIDTHS,
} from '@/types/assessment'
import { SketchCanvas } from './SketchCanvas'
import { CalculatorQuoteSummary } from './CalculatorQuoteSummary'

// ─── Shared helper components ────────────────────────────────────────────────

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-3 text-left">
      <div className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[var(--primary)]' : 'bg-gray-300'}`}>
        <div className={`w-5 h-5 bg-white rounded-full shadow m-0.5 transition-transform ${checked ? 'translate-x-6' : ''}`} />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </button>
  )
}

function NumStepper({ value, onChange, min = 0, max = 99, step = 1, label }: {
  value: number; onChange: (v: number) => void
  min?: number; max?: number; step?: number; label?: string
}) {
  return (
    <div>
      {label && <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>}
      <div className="flex items-center">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))}
          className="w-11 h-11 rounded-l-lg border border-gray-200 text-xl font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 flex-shrink-0">−</button>
        <input type="number" value={value} min={min} max={max} step={step}
          onChange={e => onChange(parseFloat(e.target.value) || min)}
          className="w-16 h-11 border-y border-gray-200 text-center text-lg font-semibold text-gray-800 focus:outline-none focus:bg-gray-50" />
        <button type="button" onClick={() => onChange(Math.min(max, value + step))}
          className="w-11 h-11 rounded-r-lg border border-gray-200 text-xl font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 flex-shrink-0">+</button>
      </div>
    </div>
  )
}

function SectionHead({ title }: { title: string }) {
  return <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">{title}</h3>
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{children}</p>
}

function TextInput({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-30 focus:border-[var(--primary)]" />
  )
}

function Select({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-30 focus:border-[var(--primary)] bg-white">
      {children}
    </select>
  )
}

// ─── Draft type ──────────────────────────────────────────────────────────────

type Draft = Omit<SiteAssessment, 'id' | 'lead_id' | 'created_by' | 'created_at' | 'updated_at'>

function defaultDraft(data?: Partial<SiteAssessment>): Draft {
  return {
    width_m: data?.width_m ?? 4,
    depth_m: data?.depth_m ?? 3,
    height_eaves_m: data?.height_eaves_m ?? null,
    roof_type: data?.roof_type ?? 'flat',
    has_canopy: data?.has_canopy ?? false,
    canopy_depth_m: data?.canopy_depth_m ?? null,
    has_side_canopy: data?.has_side_canopy ?? false,
    has_storage: data?.has_storage ?? false,
    has_glass_corner: data?.has_glass_corner ?? false,
    has_skylight: data?.has_skylight ?? false,
    shape: data?.shape ?? null,
    location_notes: data?.location_notes ?? null,
    planning_type: data?.planning_type ?? null,
    has_decking: data?.has_decking ?? false,
    decking_material: data?.decking_material ?? 'millboard',
    deck_w: data?.deck_w ?? null,
    deck_d: data?.deck_d ?? null,
    cladding_good: data?.cladding_good ?? null,
    cladding_better: data?.cladding_better ?? null,
    cladding_best: data?.cladding_best ?? null,
    single_cladding: data?.single_cladding ?? 'thermo_ayous',
    tiers_enabled: data?.tiers_enabled ?? false,
    cladding_walls: data?.cladding_walls ?? 1,
    fireproofing: data?.fireproofing ?? false,
    fireproofing_walls: data?.fireproofing_walls ?? null,
    secondary_cladding: data?.secondary_cladding ?? null,
    secondary_cladding_location: data?.secondary_cladding_location ?? null,
    doors: data?.doors ?? [],
    windows: data?.windows ?? [],
    has_consumer_unit: data?.has_consumer_unit ?? true,
    has_existing_swa: data?.has_existing_swa ?? false,
    cable_run_m: data?.cable_run_m ?? null,
    downlight_count: data?.downlight_count ?? 6,
    double_socket_count: data?.double_socket_count ?? 4,
    usb_socket_count: data?.usb_socket_count ?? 0,
    electricals: data?.electricals ?? [],
    climate: data?.climate ?? 'none',
    ground_type: data?.ground_type ?? null,
    access_notes: data?.access_notes ?? null,
    landscaping_notes: data?.landscaping_notes ?? null,
    site_notes: data?.site_notes ?? null,
    photo_urls: data?.photo_urls ?? [],
    sketch_data: data?.sketch_data ?? null,
  }
}

// Auto-fill draft from customer's calculator config
function draftFromCalculator(raw: Record<string, unknown>): Partial<Draft> {
  const c = (raw?.calculator_data ?? raw) as Record<string, unknown>
  if (!c?.roofType && !c?.width) return {}

  const doors: DoorSpec[] = []
  if (c.door && c.door !== 'none') {
    const key = c.door as string
    doors.push({ id: crypto.randomUUID(), key, colour: 'Anthracite Grey', position: 'front', width_mm: DOOR_DEFAULT_WIDTHS[key] ?? 2000, height_mm: 2100 })
  }

  const windows: WindowSpec[] = []
  if (Array.isArray(c.wins)) {
    for (const w of c.wins as string[]) {
      if (w && w !== 'none') {
        windows.push({ id: crypto.randomUUID(), type: w, width_mm: 1000, height_mm: 1000, position: 'left', count: 1, opening: false, glazing: 'double', colour: 'Anthracite Grey' })
      }
    }
  }

  return {
    width_m:         c.width  ? Math.round(parseFloat(String(c.width))  * 10) / 10 : undefined,
    depth_m:         c.depth  ? Math.round(parseFloat(String(c.depth))  * 10) / 10 : undefined,
    roof_type:       (c.roofType  as string) || undefined,
    doors,
    windows,
    single_cladding: (c.claddingMaterial as string) || undefined,
    cladding_walls:  c.claddingWalls ? parseInt(String(c.claddingWalls)) : undefined,
    climate:         (c.climate as string) || 'none',
    has_canopy:      Boolean(c.canopy),
    has_side_canopy: Boolean(c.side_canopy),
    has_storage:     Boolean(c.storage),
    has_glass_corner:Boolean(c.glass_corner),
    has_skylight:    Boolean(c.skylight),
    has_decking:     Boolean(c.hasDecking),
    deck_w:          c.deckW ? parseFloat(String(c.deckW)) : undefined,
    deck_d:          c.deckD ? parseFloat(String(c.deckD)) : undefined,
    electricals:     Array.isArray(c.electricals) ? c.electricals as string[] : [],
  }
}

function newDoor(key = 'alu_bifold_36'): DoorSpec {
  return { id: crypto.randomUUID(), key, colour: 'Anthracite Grey', position: 'front', width_mm: DOOR_DEFAULT_WIDTHS[key] ?? 2000, height_mm: 2050 }
}

function newWindow(): WindowSpec {
  return { id: crypto.randomUUID(), type: 'square', width_mm: 1000, height_mm: 1000, position: 'left', count: 1, opening: false, glazing: 'double', colour: 'Anthracite Grey' }
}

// ─── Page 1: Dimensions & Structure ─────────────────────────────────────────

function DimensionsTab({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  const sqm = draft.width_m && draft.depth_m ? (draft.width_m * draft.depth_m).toFixed(1) : '—'

  return (
    <div className="space-y-8">
      {/* Dimensions */}
      <div>
        <SectionHead title="Dimensions" />
        <div className="grid grid-cols-3 gap-4">
          <div>
            <FieldLabel>Width (m)</FieldLabel>
            <NumStepper value={draft.width_m ?? 4} step={0.1}
              onChange={v => set({ width_m: Math.round(v * 10) / 10 })} min={2} max={12} />
          </div>
          <div>
            <FieldLabel>Depth (m)</FieldLabel>
            <NumStepper value={draft.depth_m ?? 3} step={0.1}
              onChange={v => set({ depth_m: Math.round(v * 10) / 10 })} min={2} max={10} />
          </div>
          <div>
            <FieldLabel>Floor area</FieldLabel>
            <div className="flex items-center h-11 px-3 bg-gray-50 border border-gray-200 rounded-lg text-lg font-bold text-[var(--primary)]">
              {sqm} m²
            </div>
          </div>
        </div>
        <div className="mt-4 max-w-xs">
          <FieldLabel>Eaves height (m) — leave blank for standard</FieldLabel>
          <NumStepper value={draft.height_eaves_m ?? 2.4} step={0.05}
            onChange={v => set({ height_eaves_m: Math.round(v * 20) / 20 })} min={2} max={4} />
        </div>
      </div>

      {/* Roof type */}
      <div>
        <SectionHead title="Roof Type" />
        <div className="grid grid-cols-2 gap-3">
          {ROOF_OPTIONS.map(r => (
            <button key={r.value} type="button"
              onClick={() => set({ roof_type: r.value })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${draft.roof_type === r.value
                ? 'border-[var(--primary)] bg-green-50'
                : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="font-semibold text-sm text-gray-800">{r.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{r.sub}</div>
              {r.uplift > 0 && (
                <div className="text-xs text-[var(--primary)] mt-1 font-medium">+£{r.uplift}/m²</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div>
        <SectionHead title="Features" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <Toggle checked={draft.has_canopy} onChange={v => set({ has_canopy: v })} label="Front canopy" />
            {draft.has_canopy && (
              <div className="ml-15 pl-3">
                <FieldLabel>Canopy depth (mm)</FieldLabel>
                <NumStepper value={Math.round((draft.canopy_depth_m ?? 0.35) * 1000)} step={50}
                  onChange={v => set({ canopy_depth_m: Math.round(v) / 1000 })} min={300} max={3000} />
              </div>
            )}
            <Toggle checked={draft.has_side_canopy} onChange={v => set({ has_side_canopy: v })} label="Side canopy" />
            <Toggle checked={draft.has_storage} onChange={v => set({ has_storage: v })} label="Storage room +£1,740" />
          </div>
          <div className="space-y-4">
            <Toggle checked={draft.has_glass_corner} onChange={v => set({ has_glass_corner: v })} label="Glass corner +£1,450" />
            <Toggle checked={draft.has_skylight} onChange={v => set({ has_skylight: v })} label="Skylight +£1,400" />
          </div>
        </div>
      </div>

      {/* Decking */}
      <div>
        <SectionHead title="Decking" />
        <Toggle checked={draft.has_decking} onChange={v => set({ has_decking: v })} label="Decking included" />
        {draft.has_decking && (
          <div className="mt-4 space-y-4">
            <div>
              <FieldLabel>Material</FieldLabel>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'millboard',    label: 'Millboard',      sub: `£${Math.round(225 + 360 * (draft.deck_w ?? 3) * (draft.deck_d ?? 2)).toLocaleString()}` },
                  { value: 'yellow_balau', label: 'Yellow Balau',   sub: `£${Math.round((draft.deck_w ?? 3) * (draft.deck_d ?? 2) * 260 + 225).toLocaleString()}` },
                ] as const).map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => set({ decking_material: opt.value })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${draft.decking_material === opt.value ? 'border-[var(--primary)] bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="font-semibold text-sm text-gray-800">{opt.label}</div>
                    <div className="text-xs text-[var(--primary)] font-medium mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Deck width (m)</FieldLabel>
                <NumStepper value={draft.deck_w ?? 3} step={0.1}
                  onChange={v => set({ deck_w: Math.round(v * 10) / 10 })} min={1} max={12} />
              </div>
              <div>
                <FieldLabel>Deck depth (m)</FieldLabel>
                <NumStepper value={draft.deck_d ?? 2} step={0.1}
                  onChange={v => set({ deck_d: Math.round(v * 10) / 10 })} min={0.1} max={6} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Planning & Site */}
      <div>
        <SectionHead title="Planning & Site" />
        <div className="space-y-4">
          <div>
            <FieldLabel>Planning</FieldLabel>
            <Select value={draft.planning_type ?? ''} onChange={v => set({ planning_type: v || null })}>
              <option value="">TBC / not discussed</option>
              <option value="permitted_development">Permitted Development</option>
              <option value="full_planning">Full Planning Required</option>
              <option value="conservation_area">Conservation Area</option>
              <option value="listed_building">Listed Building / AONB</option>
            </Select>
          </div>
          <div>
            <FieldLabel>Shape / layout</FieldLabel>
            <Select value={draft.shape ?? ''} onChange={v => set({ shape: v || null })}>
              <option value="">Standard rectangle</option>
              <option value="L-shape">L shaped</option>
              <option value="5-sides">5 sides</option>
              <option value="bespoke">Bespoke</option>
            </Select>
          </div>
          <div>
            <FieldLabel>Location notes (garden position, orientation, aspect)</FieldLabel>
            <textarea value={draft.location_notes ?? ''} rows={2}
              onChange={e => set({ location_notes: e.target.value || null })}
              placeholder="e.g. bottom of garden, south-facing, backing onto fence..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-30 focus:border-[var(--primary)] resize-none" />
          </div>
          <div>
            <FieldLabel>Ground / base type</FieldLabel>
            <Select value={draft.ground_type ?? ''} onChange={v => set({ ground_type: v || null })}>
              <option value="">Unknown / TBC</option>
              <option value="ground_screws">Ground screws</option>
              <option value="concrete_pedestals">Concrete pedestals off existing slab</option>
              <option value="screws_and_pedestals">Screws and concrete pedestals</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Access */}
      <div>
        <SectionHead title="Access & Landscaping" />
        <div className="space-y-4">
          <div>
            <FieldLabel>Access notes (gates, paths, overhead cables, obstructions)</FieldLabel>
            <textarea value={draft.access_notes ?? ''} rows={2}
              onChange={e => set({ access_notes: e.target.value || null })}
              placeholder="e.g. narrow side gate, low fence to lift over, 6ft headroom under pergola..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-30 focus:border-[var(--primary)] resize-none" />
          </div>
          <div>
            <FieldLabel>Landscaping requirements</FieldLabel>
            <textarea value={draft.landscaping_notes ?? ''} rows={2}
              onChange={e => set({ landscaping_notes: e.target.value || null })}
              placeholder="e.g. turf to clear, raised area, retaining wall, existing path to integrate..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-30 focus:border-[var(--primary)] resize-none" />
          </div>
        </div>
      </div>

      {/* Site notes */}
      <div>
        <FieldLabel>Additional site notes</FieldLabel>
        <textarea value={draft.site_notes ?? ''} rows={3}
          onChange={e => set({ site_notes: e.target.value || null })}
          placeholder="Neighbour issues, trees, utilities, anything else..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-30 focus:border-[var(--primary)] resize-none" />
      </div>
    </div>
  )
}

// ─── Page 2: Cladding ────────────────────────────────────────────────────────

const WALLS_OPTIONS = [
  { value: 1, label: 'Front wall only' },
  { value: 2, label: 'Front + 1 side' },
  { value: 3, label: 'Front + 2 sides' },
  { value: 4, label: 'All 4 walls' },
]

function CladdingTab({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  return (
    <div className="space-y-8">
      {/* Main cladding */}
      <div>
        <SectionHead title="Main Cladding" />
        <div className="grid grid-cols-2 gap-3">
          {CLADDING_OPTIONS.map(c => (
            <button key={c.value} type="button"
              onClick={() => set({ single_cladding: c.value })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${draft.single_cladding === c.value
                ? 'border-[var(--primary)] bg-green-50'
                : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="font-semibold text-sm text-gray-800">{c.label}</div>
              <div className="text-xs text-[var(--primary)] font-medium mt-0.5">£{c.rate}/m</div>
            </button>
          ))}
        </div>
      </div>

      {/* Cladding walls */}
      <div>
        <SectionHead title="Cladding Coverage" />
        <div className="grid grid-cols-2 gap-3">
          {WALLS_OPTIONS.map(w => (
            <button key={w.value} type="button"
              onClick={() => set({ cladding_walls: w.value })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${draft.cladding_walls === w.value
                ? 'border-[var(--primary)] bg-green-50'
                : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="font-semibold text-sm text-gray-800">{w.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Fireproofing */}
      <div>
        <SectionHead title="Fireproofing" />
        <Toggle checked={draft.fireproofing} onChange={v => set({ fireproofing: v })} label="Fireproofing required (boundary wall / party wall)" />
        {draft.fireproofing && (
          <div className="mt-4">
            <FieldLabel>Which walls need fireproofing?</FieldLabel>
            <TextInput value={draft.fireproofing_walls ?? ''} placeholder="e.g. Rear wall, left side wall"
              onChange={v => set({ fireproofing_walls: v || null })} />
          </div>
        )}
      </div>

      {/* Secondary cladding */}
      <div>
        <SectionHead title="Secondary Cladding" />
        <p className="text-sm text-gray-500 mb-4">Use this if the canopy or specific walls will have a different cladding material — e.g. charred spruce on canopy, cedar on rear wall.</p>
        <div>
          <FieldLabel>Secondary cladding material</FieldLabel>
          <Select value={draft.secondary_cladding ?? ''} onChange={v => set({ secondary_cladding: v || null })}>
            <option value="">None</option>
            {CLADDING_OPTIONS.map(c => (
              <option key={c.value} value={c.value}>{c.label} — £{c.rate}/m</option>
            ))}
          </Select>
        </div>
        {draft.secondary_cladding && (
          <div className="mt-3">
            <FieldLabel>Where? (which element or wall)</FieldLabel>
            <TextInput value={draft.secondary_cladding_location ?? ''} placeholder="e.g. Canopy, rear wall, left side"
              onChange={v => set({ secondary_cladding_location: v || null })} />
          </div>
        )}
      </div>

      {/* Cladding tiers for quote */}
      <div>
        <SectionHead title="Quote Tiers" />
        <p className="text-sm text-gray-500 mb-4">Optionally spec Good / Better / Best cladding options for the quote builder.</p>
        <Toggle checked={draft.tiers_enabled} onChange={v => set({ tiers_enabled: v })} label="Use separate cladding tiers (Good / Better / Best)" />
        {draft.tiers_enabled && (
          <div className="mt-4 space-y-3">
            {(['good', 'better', 'best'] as const).map(tier => {
              const key = `cladding_${tier}` as 'cladding_good' | 'cladding_better' | 'cladding_best'
              return (
                <div key={tier}>
                  <FieldLabel>{tier.charAt(0).toUpperCase() + tier.slice(1)} cladding</FieldLabel>
                  <Select value={draft[key] ?? ''} onChange={v => set({ [key]: v || null })}>
                    <option value="">—</option>
                    {CLADDING_OPTIONS.map(c => (
                      <option key={c.value} value={c.value}>{c.label} — £{c.rate}/m</option>
                    ))}
                  </Select>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page 3: Doors & Windows ─────────────────────────────────────────────────

const POSITIONS = ['front', 'left', 'right', 'rear']
const COLOURS   = ['Anthracite Grey', 'Black', 'Bespoke RAL']

function DoorCard({ door, onChange, onRemove }: {
  door: DoorSpec; onChange: (d: DoorSpec) => void; onRemove: () => void
}) {
  const opt = DOOR_OPTIONS.find(d => d.value === door.key)
  function DimInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    return (
      <div>
        <FieldLabel>{label} (mm)</FieldLabel>
        <div className="flex items-center">
          <button type="button"
            onClick={() => onChange(Math.max(500, value - 50))}
            className="w-10 h-10 rounded-l-lg border border-gray-200 text-lg font-medium text-gray-600 hover:bg-gray-100 active:bg-gray-200 flex-shrink-0 flex items-center justify-center">
            −
          </button>
          <input
            type="number" value={value} min={500} max={6000} step={50}
            onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 500) onChange(v) }}
            className="w-20 h-10 border-y border-gray-200 text-center text-sm font-semibold text-gray-800 focus:outline-none focus:bg-gray-50"
          />
          <button type="button"
            onClick={() => onChange(Math.min(6000, value + 50))}
            className="w-10 h-10 rounded-r-lg border border-gray-200 text-lg font-medium text-gray-600 hover:bg-gray-100 active:bg-gray-200 flex-shrink-0 flex items-center justify-center">
            +
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="font-semibold text-sm text-gray-800">
          {opt?.label ?? door.key}
          <span className="ml-2 text-[var(--primary)] font-medium">£{(opt?.price ?? 0).toLocaleString()}</span>
        </div>
        <button type="button" onClick={onRemove}
          className="text-gray-400 hover:text-red-500 p-1 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <FieldLabel>Door type</FieldLabel>
          <Select value={door.key} onChange={v => onChange({ ...door, key: v, width_mm: DOOR_DEFAULT_WIDTHS[v] ?? door.width_mm })}>
            {DOOR_OPTIONS.map(d => (
              <option key={d.value} value={d.value}>{d.label} — £{d.price.toLocaleString()}</option>
            ))}
          </Select>
        </div>
        <DimInput label="Width" value={door.width_mm ?? (DOOR_DEFAULT_WIDTHS[door.key] ?? 2000)} onChange={v => onChange({ ...door, width_mm: v })} />
        <div>
          <FieldLabel>Position</FieldLabel>
          <Select value={door.position} onChange={v => onChange({ ...door, position: v })}>
            {POSITIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel>Colour</FieldLabel>
          <Select value={door.colour} onChange={v => onChange({ ...door, colour: v })}>
            {COLOURS.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
      </div>
    </div>
  )
}

function WindowCard({ win, onChange, onRemove }: {
  win: WindowSpec; onChange: (w: WindowSpec) => void; onRemove: () => void
}) {
  const opt = WINDOW_OPTIONS.find(w => w.value === win.type)
  const linePrice = (opt?.price ?? 0) * win.count
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="font-semibold text-sm text-gray-800">
          {opt?.label ?? win.type}
          <span className="ml-2 text-[var(--primary)] font-medium">£{linePrice.toLocaleString()}</span>
        </div>
        <button type="button" onClick={onRemove}
          className="text-gray-400 hover:text-red-500 p-1 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <FieldLabel>Window type</FieldLabel>
          <Select value={win.type} onChange={v => onChange({ ...win, type: v })}>
            {WINDOW_OPTIONS.map(w => (
              <option key={w.value} value={w.value}>{w.label} — £{w.price.toLocaleString()}</option>
            ))}
          </Select>
        </div>
        <div>
          <FieldLabel>Width (mm)</FieldLabel>
          <input type="number" value={win.width_mm} min={200} max={5000} step={50}
            onChange={e => onChange({ ...win, width_mm: parseInt(e.target.value) || 1000 })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-30 focus:border-[var(--primary)]" />
        </div>
        <div>
          <FieldLabel>Height (mm)</FieldLabel>
          <input type="number" value={win.height_mm} min={200} max={3000} step={50}
            onChange={e => onChange({ ...win, height_mm: parseInt(e.target.value) || 1000 })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-30 focus:border-[var(--primary)]" />
        </div>
        <div>
          <FieldLabel>Position</FieldLabel>
          <Select value={win.position} onChange={v => onChange({ ...win, position: v })}>
            {[...POSITIONS, 'roof'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </Select>
        </div>
        <div>
          <FieldLabel>Qty</FieldLabel>
          <NumStepper value={win.count} min={1} max={10} onChange={v => onChange({ ...win, count: v })} />
        </div>
        <div>
          <FieldLabel>Glazing</FieldLabel>
          <Select value={win.glazing} onChange={v => onChange({ ...win, glazing: v as WindowSpec['glazing'] })}>
            <option value="single">Single pane</option>
            <option value="double">Double glazed</option>
            <option value="triple">Triple glazed</option>
          </Select>
        </div>
        <div>
          <FieldLabel>Colour</FieldLabel>
          <Select value={win.colour} onChange={v => onChange({ ...win, colour: v })}>
            {COLOURS.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div className="col-span-2 flex items-center gap-4">
          <Toggle checked={win.opening} onChange={v => onChange({ ...win, opening: v })} label="Opening (casement / awning)" />
        </div>
      </div>
    </div>
  )
}

function DoorsWindowsTab({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  function updateDoor(id: string, d: DoorSpec) {
    set({ doors: draft.doors.map(x => x.id === id ? d : x) })
  }
  function removeDoor(id: string) {
    set({ doors: draft.doors.filter(x => x.id !== id) })
  }
  function updateWindow(id: string, w: WindowSpec) {
    set({ windows: draft.windows.map(x => x.id === id ? w : x) })
  }
  function removeWindow(id: string) {
    set({ windows: draft.windows.filter(x => x.id !== id) })
  }

  const doorsTotal = draft.doors.reduce((s, d) => s + (PRICING.DOORS[d.key] ?? 0), 0)
  const winsTotal  = draft.windows.reduce((s, w) => s + (PRICING.WINDOWS[w.type] ?? 0) * w.count, 0)

  return (
    <div className="space-y-8">
      {/* Doors */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">Doors</h3>
          <span className="text-sm font-medium text-[var(--primary)]">£{doorsTotal.toLocaleString()}</span>
        </div>
        {draft.doors.length === 0 && (
          <p className="text-sm text-gray-400 mb-3">No doors added — tap below to spec the first set.</p>
        )}
        <div className="space-y-3">
          {draft.doors.map(door => (
            <DoorCard key={door.id} door={door}
              onChange={d => updateDoor(door.id, d)}
              onRemove={() => removeDoor(door.id)} />
          ))}
        </div>
        <button type="button" onClick={() => set({ doors: [...draft.doors, newDoor()] })}
          className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-[var(--primary)] text-[var(--primary)] text-sm font-medium hover:bg-green-50 transition-colors w-full justify-center">
          <Plus size={16} /> Add door set
        </button>
      </div>

      <div className="border-t border-gray-100" />

      {/* Windows */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">Windows</h3>
          <span className="text-sm font-medium text-[var(--primary)]">£{winsTotal.toLocaleString()}</span>
        </div>
        {draft.windows.length === 0 && (
          <p className="text-sm text-gray-400 mb-3">No windows added — tap below to spec the first window.</p>
        )}
        <div className="space-y-3">
          {draft.windows.map(win => (
            <WindowCard key={win.id} win={win}
              onChange={w => updateWindow(win.id, w)}
              onRemove={() => removeWindow(win.id)} />
          ))}
        </div>
        <button type="button" onClick={() => set({ windows: [...draft.windows, newWindow()] })}
          className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-[var(--primary)] text-[var(--primary)] text-sm font-medium hover:bg-green-50 transition-colors w-full justify-center">
          <Plus size={16} /> Add window
        </button>
      </div>
    </div>
  )
}

// ─── Page 4: Electrics & Climate ────────────────────────────────────────────

function ElectricsTab({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  function toggleElec(val: string) {
    const next = draft.electricals.includes(val)
      ? draft.electricals.filter(e => e !== val)
      : [...draft.electricals, val]
    set({ electricals: next })
  }

  const extrasTotal = draft.electricals.reduce((s, e) => s + (PRICING.ELEC[e] ?? 0), 0)
  const climatePrice = PRICING.CLIMATE[draft.climate ?? 'none'] ?? 0

  return (
    <div className="space-y-8">
      {/* Standard electrics */}
      <div>
        <SectionHead title="Standard Electrics Package" />
        <p className="text-sm text-gray-500 mb-4">Included with every build — adjust quantities to spec.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Downlights</FieldLabel>
            <NumStepper value={draft.downlight_count} min={0} max={20}
              onChange={v => set({ downlight_count: v })} />
          </div>
          <div>
            <FieldLabel>Double sockets</FieldLabel>
            <NumStepper value={draft.double_socket_count} min={0} max={20}
              onChange={v => set({ double_socket_count: v })} />
          </div>
          <div>
            <FieldLabel>USB sockets</FieldLabel>
            <NumStepper value={draft.usb_socket_count} min={0} max={10}
              onChange={v => set({ usb_socket_count: v })} />
          </div>
          <div>
            <FieldLabel>Cable run (m)</FieldLabel>
            <NumStepper value={draft.cable_run_m ?? 10} min={0} max={100} step={5}
              onChange={v => set({ cable_run_m: v })} />
          </div>
        </div>
        <div className="mt-4">
          <Toggle checked={draft.has_existing_swa} onChange={v => set({ has_existing_swa: v })} label="Existing SWA power supply already in place" />
        </div>
      </div>

      {/* Electrical extras */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">Electrical Extras</h3>
          {extrasTotal > 0 && <span className="text-sm font-medium text-[var(--primary)]">+£{extrasTotal.toLocaleString()}</span>}
        </div>
        <div className="space-y-3">
          {ELEC_OPTIONS.map(opt => {
            const checked = draft.electricals.includes(opt.value)
            return (
              <button key={opt.value} type="button" onClick={() => toggleElec(opt.value)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${checked
                  ? 'border-[var(--primary)] bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-[var(--primary)]' : 'border-2 border-gray-300'}`}>
                    {checked && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                </div>
                <span className="text-sm font-medium text-gray-500">+£{opt.price.toLocaleString()}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Climate control */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800">Climate Control</h3>
          {climatePrice > 0 && <span className="text-sm font-medium text-[var(--primary)]">+£{climatePrice.toLocaleString()}</span>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {CLIMATE_OPTIONS.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => set({ climate: opt.value })}
              className={`p-4 rounded-xl border-2 text-left transition-all ${draft.climate === opt.value
                ? 'border-[var(--primary)] bg-green-50'
                : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="font-semibold text-sm text-gray-800">{opt.label}</div>
              {opt.price > 0 && <div className="text-xs text-[var(--primary)] font-medium mt-0.5">+£{opt.price.toLocaleString()}</div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

const TABS = ['Dimensions', 'Cladding', 'Doors & Windows', 'Electrics', 'Sketch']

interface Props {
  leadId: string
  initialData?: Partial<SiteAssessment>
  calculatorData?: Record<string, unknown> | null
  estimatedPrice?: number | null
  quoteId?: string
}

export function AssessmentForm({ leadId, initialData, calculatorData, estimatedPrice, quoteId }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState(0)
  const [draft, setDraft] = useState<Draft>(() => {
    const base = defaultDraft(initialData)
    // If no existing assessment and calculator data available, auto-fill from customer's quote
    if (!initialData && calculatorData) {
      const fill = draftFromCalculator(calculatorData)
      return { ...base, ...fill }
    }
    return base
  })
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const estimate = estimatePrice(draft)
  const set = (patch: Partial<Draft>) => setDraft(d => ({ ...d, ...patch }))

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(`Save failed: ${json.error ?? res.status}`)
        return
      }
      setLastSaved(new Date())
      toast.success('Assessment saved')
    } catch (e) {
      toast.error('Could not save assessment')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAndQuote() {
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const resJson = await res.json()
      if (!res.ok) {
        toast.error(`Assessment save failed: ${resJson.error ?? res.status}`)
        return
      }

      const qRes = await fetch(`/api/leads/${leadId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_id: resJson.assessment?.id }),
      })
      const qJson = await qRes.json()
      if (!qRes.ok) {
        toast.error(`Quote create failed: ${qJson.error ?? qRes.status}`)
        return
      }
      router.push(`/leads/${leadId}/quote/${qJson.quote.id}`)
    } catch (e) {
      toast.error('Could not save and create quote')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Tab bar + price banner */}
      <div className="flex items-center border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex flex-1">
          {TABS.map((t, i) => (
            <button key={i} type="button" onClick={() => setTab(i)}
              className={`px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${tab === i
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="px-4 text-right">
          <div className="text-xs text-gray-400 leading-none mb-0.5">Est. price</div>
          <div className="text-lg font-bold text-[var(--primary)] leading-none">
            ~{poundK(estimate)}
          </div>
          <div className="text-xs text-gray-400 leading-none mt-0.5">ex VAT</div>
        </div>
      </div>

      {/* Tab content — calculator summary scrolls away with content */}
      <div className="flex-1 overflow-y-auto p-6">
        {calculatorData && (
          <CalculatorQuoteSummary
            calculatorData={calculatorData}
            estimatedPrice={estimatedPrice ?? null}
          />
        )}
        {tab === 0 && <DimensionsTab draft={draft} set={set} />}
        {tab === 1 && <CladdingTab draft={draft} set={set} />}
        {tab === 2 && <DoorsWindowsTab draft={draft} set={set} />}
        {tab === 3 && <ElectricsTab draft={draft} set={set} />}
        {tab === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-1">Floor Plan Sketch</h3>
              <p className="text-sm text-gray-500 mb-4">Sketch the plot showing room position, window & door locations, and any key measurements or notes. Use Apple Pencil on iPad for best results.</p>
              <SketchCanvas
                initialData={draft.sketch_data ?? null}
                onChange={v => set({ sketch_data: v })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Save bar */}
      <div className="border-t border-gray-200 px-6 py-4 flex items-center gap-3 bg-white">
        {lastSaved && (
          <span className="text-xs text-gray-400 mr-auto">
            Last saved {lastSaved.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <div className="flex gap-3 ml-auto">
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={handleSaveAndQuote} disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
            Save & Build Quote →
          </button>
        </div>
      </div>
    </div>
  )
}
