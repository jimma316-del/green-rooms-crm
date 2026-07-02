// ─── Pricing constants (mirrors the website calculator) ─────────────────────
export const PRICING = {
  BASE: 7450,
  SQM:  825,
  ROOF:    { flat: 0, dual_pitched: 200, dual_extended: 275, single_ext: 100 } as Record<string,number>,
  CLADDING:{ thermo_ayous: 245, cedar: 266, charred_spruce: 280, hardie: 255, millboard: 448, thermo_ash: 395 } as Record<string,number>,
  DOORS:   { upvc_sliding: 1400, alu_french: 1900, alu_sliding_2m: 2300, alu_sliding_26: 2600, alu_bifold_36: 2300, alu_crittal_3m: 3225, alu_bifold_4m: 4000, alu_crittal_4m: 5175, alu_bifold_5m: 4660, alu_crittal_5m: 6085 } as Record<string,number>,
  WINDOWS: { slot: 600, square: 750, double: 900, bifold_win: 1900, full_height: 860 } as Record<string,number>,
  ELEC:    { ext_lights: 240, canopy_lights: 280, smart_switch: 75, cat6: 550, smart_socket: 145 } as Record<string,number>,
  CLIMATE: { none: 0, ac_2_5kw: 1860, ac_5kw: 2740, wall_heater: 330 } as Record<string,number>,
}

export const CLADDING_OPTIONS = [
  { value: 'thermo_ayous',   label: 'Thermo Ayous',                  rate: 245 },
  { value: 'cedar',          label: 'Western Red Cedar',              rate: 266 },
  { value: 'charred_spruce', label: 'Charred Spruce (Shou Sugi Ban)', rate: 280 },
  { value: 'hardie',         label: 'Hardie Plank',                   rate: 255 },
  { value: 'millboard',      label: 'Millboard / Composite',          rate: 448 },
  { value: 'thermo_ash',     label: 'Thermo Ash',                     rate: 395 },
]

export const CLADDING_LABELS: Record<string,string> = Object.fromEntries(CLADDING_OPTIONS.map(o => [o.value, o.label]))

export const DOOR_OPTIONS = [
  { value: 'upvc_sliding',   label: 'uPVC Sliding',                    price: 1400 },
  { value: 'alu_french',     label: 'Aluminium French Doors',          price: 1900 },
  { value: 'alu_sliding_2m', label: 'Aluminium Sliding (2m)',          price: 2300 },
  { value: 'alu_sliding_26', label: 'Aluminium Sliding (2.6m)',        price: 2600 },
  { value: 'alu_bifold_36',  label: 'Aluminium Bifolds (2.4–3.6m)',    price: 2300 },
  { value: 'alu_bifold_4m',  label: 'Aluminium Bifolds (4m)',          price: 4000 },
  { value: 'alu_bifold_5m',  label: 'Aluminium Bifolds (5m)',          price: 4660 },
  { value: 'alu_crittal_3m', label: 'Aluminium Crittall (3m)',         price: 3225 },
  { value: 'alu_crittal_4m', label: 'Aluminium Crittall (4m)',         price: 5175 },
  { value: 'alu_crittal_5m', label: 'Aluminium Crittall (5m)',         price: 6085 },
]

export const WINDOW_OPTIONS = [
  { value: 'slot',       label: 'Slot window (1m × 0.5m)',   price: 600  },
  { value: 'square',     label: 'Square window (1m × 1m)',   price: 750  },
  { value: 'double',     label: 'Double window (2m × 1m)',   price: 900  },
  { value: 'bifold_win', label: 'Bifold window',             price: 1900 },
  { value: 'full_height',label: 'Full-height window',        price: 860  },
]

export const ROOF_OPTIONS = [
  { value: 'flat',         label: 'Flat',                              sub: 'EPDM rubber membrane',    uplift: 0   },
  { value: 'single_ext',   label: 'Single pitch extended height (3m)', sub: 'Mono-pitch, taller eaves',uplift: 100 },
  { value: 'dual_pitched', label: 'Dual pitched',                      sub: 'A-frame ridge roof',      uplift: 200 },
  { value: 'dual_extended',label: 'Dual pitched extended (4m)',        sub: 'Full-height apex',        uplift: 275 },
]

export const ELEC_OPTIONS = [
  { value: 'ext_lights',    label: 'External up & down lights',  price: 240 },
  { value: 'canopy_lights', label: 'Canopy downlights',          price: 280 },
  { value: 'smart_switch',  label: 'LCD smart light switch',     price: 75  },
  { value: 'cat6',          label: 'WiFi via Cat6a cable',       price: 550 },
  { value: 'smart_socket',  label: 'External smart socket',      price: 145 },
]

export const CLIMATE_OPTIONS = [
  { value: 'none',      label: 'None',                           price: 0    },
  { value: 'ac_2_5kw', label: 'Air con 2.5kW (heat & cool)',    price: 1860 },
  { value: 'ac_5kw',   label: 'Air con 5kW (heat & cool)',      price: 2740 },
  { value: 'wall_heater',label: 'Electric panel heater',        price: 330  },
]

// ─── Spec types ─────────────────────────────────────────────────────────────
export interface DoorSpec {
  id: string
  key: string          // e.g. 'alu_bifold_4m'
  colour: string       // 'Anthracite Grey' | 'Black' | custom RAL
  position: string     // 'front' | 'left' | 'right' | 'rear'
}

export interface WindowSpec {
  id: string
  type: string         // from WINDOW_OPTIONS
  width_mm: number
  height_mm: number
  position: string
  count: number
  opening: boolean
  glazing: 'single' | 'double' | 'triple'
  colour: string
}

export interface SiteAssessment {
  id: string
  lead_id: string
  created_by: string
  created_at: string
  updated_at: string

  // Dimensions
  width_m: number | null
  depth_m: number | null
  height_eaves_m: number | null

  // Structure
  roof_type: string | null
  has_canopy: boolean
  canopy_depth_m: number | null
  has_side_canopy: boolean
  has_storage: boolean
  has_glass_corner: boolean
  has_skylight: boolean
  shape: string | null           // e.g. 'L-shape', 'standard'
  location_notes: string | null
  planning_type: string | null   // 'permitted_development' | 'full_planning' | 'tbc'

  // Decking
  has_decking: boolean
  deck_w: number | null
  deck_d: number | null

  // Cladding
  cladding_good: string | null
  cladding_better: string | null
  cladding_best: string | null
  single_cladding: string | null
  tiers_enabled: boolean
  cladding_walls: number         // 1 = front only, 2 = front+side, 3 = front+2sides, 4 = all
  fireproofing: boolean
  fireproofing_walls: string | null
  secondary_cladding: string | null
  secondary_cladding_location: string | null

  // Doors & Windows
  doors: DoorSpec[]
  windows: WindowSpec[]

  // Electrics
  has_consumer_unit: boolean
  cable_run_m: number | null
  downlight_count: number
  double_socket_count: number
  usb_socket_count: number
  electricals: string[]          // array of ELEC_OPTIONS values
  climate: string                // CLIMATE_OPTIONS value

  // Site
  ground_type: string | null
  access_notes: string | null
  site_notes: string | null
  photo_urls: string[]
}

// ─── Price estimate ──────────────────────────────────────────────────────────
export function estimatePrice(a: Partial<SiteAssessment>): number {
  const w = a.width_m ?? 4, d = a.depth_m ?? 3
  const sqm = w * d
  const clad = a.single_cladding || a.cladding_better || a.cladding_good || 'thermo_ayous'
  const r = PRICING.CLADDING[clad] ?? 245
  const walls = a.cladding_walls ?? 1

  function claddingCost() {
    if (walls === 1) return w * r
    if (walls === 2) return w * r + d * r
    if (walls === 3) return w * r + d * r * 2
    return (w + d) * r * 2
  }

  const structure = PRICING.BASE + sqm * PRICING.SQM
  const roof      = sqm * (PRICING.ROOF[a.roof_type ?? 'flat'] ?? 0)
  const cladding  = claddingCost()
  const canopy    = a.has_canopy ? 1000 + w * r / 2 : 0
  const sideCanopy= a.has_side_canopy ? 700 + 2 * r : 0
  const storage   = a.has_storage ? 1740 : 0
  const glassCorner = a.has_glass_corner ? 1450 : 0
  const skylight  = a.has_skylight ? 1400 : 0
  const decking   = a.has_decking ? 225 + 360 * (a.deck_w ?? 3) * (a.deck_d ?? 2) : 0
  const doors     = (a.doors ?? []).reduce((s, dr) => s + (PRICING.DOORS[dr.key] ?? 0), 0)
  const windows   = (a.windows ?? []).reduce((s, win) => s + (PRICING.WINDOWS[win.type] ?? 0) * win.count, 0)
  const elec      = (a.electricals ?? []).reduce((s, e) => s + (PRICING.ELEC[e] ?? 0), 0)
  const climate   = PRICING.CLIMATE[a.climate ?? 'none'] ?? 0

  return Math.round(structure + roof + cladding + canopy + sideCanopy + storage + glassCorner + skylight + decking + doors + windows + elec + climate)
}

export function poundStr(pence: number) {
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function poundK(p: number) {
  return `£${p.toLocaleString('en-GB')}`
}

// ─── Quote types ─────────────────────────────────────────────────────────────
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

export const TIER_DEFAULTS: QuoteTier[] = [
  { key: 'good',   label: 'Good',   included: true, cladding: 'thermo_ayous',   line_items: [] },
  { key: 'better', label: 'Better', included: true, cladding: 'charred_spruce', line_items: [] },
  { key: 'best',   label: 'Best',   included: true, cladding: 'millboard',      line_items: [] },
]

export function tierTotal(items: QuoteLineItem[]) {
  const exVat = items.reduce((s, i) => s + i.amount_pence, 0)
  const vat   = items.reduce((s, i) => s + (i.vat ? i.amount_pence * 0.2 : 0), 0)
  return { exVat, vat, incVat: exVat + vat }
}
