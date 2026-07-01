export interface WindowSpec {
  id: string
  type: 'fixed' | 'casement' | 'velux'
  width_mm: number
  height_mm: number
  position: 'front' | 'left' | 'right' | 'rear' | 'roof'
  count: number
}

export interface SiteAssessment {
  id: string
  lead_id: string
  created_by: string
  created_at: string
  updated_at: string

  width_m: number | null
  depth_m: number | null
  height_eaves_m: number | null

  roof_type: 'flat' | 'apex' | 'mono_pitch' | null
  has_canopy: boolean
  canopy_depth_m: number | null

  tiers_enabled: boolean
  cladding_good: string | null
  cladding_better: string | null
  cladding_best: string | null
  single_cladding: string | null

  door_type: 'bifold' | 'sliding' | 'french' | 'single' | null
  door_panels: number | null
  door_colour: string | null

  windows: WindowSpec[]

  has_consumer_unit: boolean
  cable_run_m: number | null
  downlight_count: number
  double_socket_count: number
  usb_socket_count: number
  has_wifi: boolean
  has_ac: boolean
  ac_units: number
  has_ufh: boolean

  has_decking: boolean
  decking_sqm: number | null
  decking_tier: 'good' | 'better' | 'best' | null
  has_blinds: boolean
  blinds_tier: 'good' | 'better' | 'best' | null
  has_acoustic_panels: boolean
  needs_planning: boolean

  ground_type: 'grass' | 'patio' | 'slope' | 'mixed' | 'other' | null
  access_notes: string | null
  site_notes: string | null
  photo_urls: string[]
}

export interface QuoteLineItem {
  id: string
  category: 'room' | 'electrics' | 'extras' | 'decking' | 'other'
  description: string
  amount_pence: number
  vat: boolean
}

export interface QuoteTier {
  key: 'good' | 'better' | 'best'
  label: string
  included: boolean
  cladding: string
  line_items: QuoteLineItem[]
}

export interface LeadQuote {
  id: string
  lead_id: string
  assessment_id: string | null
  created_by: string
  created_at: string
  updated_at: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected'
  tiers: QuoteTier[]
  cover_note: string | null
  earliest_build_date: string | null
  pdf_url: string | null
  sent_at: string | null
  accepted_tier: string | null
}

export const CLADDING_OPTIONS = [
  { value: 'box_profile', label: 'Box Profile Steel' },
  { value: 'thermo_ayous', label: 'Thermo Ayous Timber' },
  { value: 'charred_spruce', label: 'Charred Spruce (Shou Sugi Ban)' },
  { value: 'larch', label: 'Siberian Larch' },
  { value: 'cedar', label: 'Western Red Cedar' },
  { value: 'render', label: 'Render' },
  { value: 'other', label: 'Other' },
]

export const CLADDING_LABELS: Record<string, string> = Object.fromEntries(
  CLADDING_OPTIONS.map(o => [o.value, o.label])
)

export const TIER_DEFAULTS: QuoteTier[] = [
  { key: 'good',   label: 'Good',   included: true, cladding: 'box_profile',    line_items: [] },
  { key: 'better', label: 'Better', included: true, cladding: 'thermo_ayous',   line_items: [] },
  { key: 'best',   label: 'Best',   included: true, cladding: 'charred_spruce', line_items: [] },
]

export function tierTotal(items: QuoteLineItem[]) {
  const exVat = items.reduce((s, i) => s + i.amount_pence, 0)
  const vat = items.reduce((s, i) => s + (i.vat ? i.amount_pence * 0.2 : 0), 0)
  return { exVat, vat, incVat: exVat + vat }
}

export function poundStr(pence: number) {
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
