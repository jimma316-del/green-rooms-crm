import type { SiteAssessment, DoorSpec, WindowSpec } from '@/types/assessment'
import { PRICING, DOOR_OPTIONS, ROOF_OPTIONS, CLIMATE_OPTIONS } from '@/types/assessment'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface XeroLineItem {
  id: string
  label: string
  description: string
  unitAmount: number  // ex-VAT, in pounds
  included: boolean
  category: 'room' | 'canopy' | 'decking' | 'electrics' | 'mains' | 'climate' | 'wifi' | 'extras'
}

// ─── Cladding helpers ─────────────────────────────────────────────────────────

const CLADDING_FULL_NAMES: Record<string, string> = {
  thermo_ayous:   'Thermally Modified Ayous Timber',
  cedar:          'Western Red Cedar Timber',
  charred_spruce: 'Charred Spruce (Shou Sugi Ban)',
  hardie:         'Hardie Plank Fibre Cement Board',
  millboard:      'Millboard Composite',
  thermo_ash:     'Thermo Ash Timber',
}

const CLADDING_ELEVATION_NAMES: Record<number, string> = {
  1: 'front elevation',
  2: 'front and left side elevations',
  3: 'front and side elevations',
  4: 'all elevations',
}

function claddingDescription(a: Partial<SiteAssessment>): string {
  const key = a.single_cladding || a.cladding_better || a.cladding_good || 'thermo_ayous'
  const fullName = CLADDING_FULL_NAMES[key] || key
  const walls = a.cladding_walls ?? 1

  if (walls >= 4) {
    return `${fullName} cladding to all elevations`
  }

  const elevStr = CLADDING_ELEVATION_NAMES[walls] || 'front elevation'
  return [
    `Feature ${fullName} cladding to ${elevStr}`,
    `Low-maintenance architectural metal box profile cladding to remaining elevations (45-year manufacturer's warranty)`,
  ].join('\n')
}

// ─── Door description ─────────────────────────────────────────────────────────

const DOOR_DESC_TEMPLATES: Record<string, (colour: string) => string> = {
  upvc_sliding:    c => `uPVC sliding doors, ${c} finish, with high-security multi-point locking and thermally efficient glazing`,
  alu_french:      c => `2.0m aluminium French doors, ${c} finish, with slimline frames, high-security multi-point locking, and thermally efficient glazing`,
  alu_sliding_2m:  c => `2.0m aluminium sliding doors, ${c} finish, with slimline frames, high-security multi-point locking, and thermally efficient glazing`,
  alu_sliding_26:  c => `2.6m aluminium sliding doors, ${c} finish, with slimline frames, high-security multi-point locking, and thermally efficient glazing`,
  alu_bifold_36:   c => `Aluminium bifold doors (up to 3.6m), ${c} finish, with slimline frames, high-security multi-point locking, and thermally efficient glazing`,
  alu_bifold_4m:   c => `4.0m aluminium bifold doors, ${c} finish, with slimline frames, high-security multi-point locking, and thermally efficient glazing`,
  alu_bifold_5m:   c => `5.0m aluminium bifold doors, ${c} finish, with slimline frames, high-security multi-point locking, and thermally efficient glazing`,
  alu_crittal_3m:  c => `3.0m aluminium Crittall-style doors, ${c} finish, with slimline frames, high-security multi-point locking, and thermally efficient glazing`,
  alu_crittal_4m:  c => `4.0m aluminium Crittall-style doors, ${c} finish, with slimline frames, high-security multi-point locking, and thermally efficient glazing`,
  alu_crittal_5m:  c => `5.0m aluminium Crittall-style doors, ${c} finish, with slimline frames, high-security multi-point locking, and thermally efficient glazing`,
}

function doorDescription(d: DoorSpec): string {
  const colour = (d.colour || 'anthracite grey').toLowerCase()
  const tmpl = DOOR_DESC_TEMPLATES[d.key]
  if (tmpl) return tmpl(colour)
  const opt = DOOR_OPTIONS.find(o => o.value === d.key)
  return `${opt?.label || d.key}, ${colour} finish`
}

// ─── Window description ───────────────────────────────────────────────────────

const WINDOW_TYPE_NAMES: Record<string, string> = {
  slot:       'slot window',
  square:     'fixed window',
  double:     'double fixed window',
  bifold_win: 'bifold window',
  full_height: 'full-height fixed window',
}

function windowDescription(w: WindowSpec): string {
  const wm = (w.width_mm / 1000).toFixed(1)
  const hm = (w.height_mm / 1000).toFixed(2).replace(/\.?0+$/, '')
  const colour = (w.colour || 'anthracite grey').toLowerCase()
  const typeName = (w.opening && w.type === 'square')
    ? 'side hung casement window'
    : (WINDOW_TYPE_NAMES[w.type] || w.type.replace(/_/g, ' '))
  const suffix = w.type === 'full_height'
    ? ', with slimline profile for maximum glass area and thermally efficient glazing'
    : ', with slimline frames, high-security locking, and thermally efficient glazing'
  const prefix = w.count > 1 ? `${w.count}x ` : ''
  return `${prefix}${wm}m (W) x ${hm}m (H) aluminium ${typeName}, ${colour} finish${suffix}`
}

// ─── Roof description ─────────────────────────────────────────────────────────

const ROOF_DESCRIPTIONS: Record<string, string> = {
  flat:          'EPDM rubber roofing membrane (fully sealed, weatherproof system with 20-year manufacturer\'s guarantee)',
  single_ext:    'Single-pitch extended height roof (3m eaves) with EPDM rubber roofing membrane (20-year guarantee)',
  dual_pitched:  'Dual-pitched A-frame ridge roof with EPDM rubber roofing membrane (20-year manufacturer\'s guarantee)',
  dual_extended: 'Dual-pitched extended apex roof (4m peak) with EPDM rubber roofing membrane (20-year manufacturer\'s guarantee)',
}

// ─── Pricing (ex-VAT) ─────────────────────────────────────────────────────────
// PRICING constants are inc-VAT; divide by 1.2 for Xero ex-VAT amounts

function exVat(incVat: number) { return Math.round((incVat / 1.2) * 100) / 100 }

function claddingCostInc(a: Partial<SiteAssessment>): number {
  const clad = a.single_cladding || a.cladding_better || a.cladding_good || 'thermo_ayous'
  const r = PRICING.CLADDING[clad] ?? 245
  const walls = a.cladding_walls ?? 1
  const w = a.width_m ?? 4
  const d = a.depth_m ?? 3
  if (walls === 1) return w * r
  if (walls === 2) return w * r + d * r
  if (walls === 3) return w * r + d * r * 2
  return (w + d) * r * 2
}

// ─── Main generator ────────────────────────────────────────────────────────────

export function generateXeroLineItems(a: Partial<SiteAssessment>): XeroLineItem[] {
  const w = a.width_m ?? 4
  const d = a.depth_m ?? 3
  const sqm = w * d
  const clad = a.single_cladding || a.cladding_better || a.cladding_good || 'thermo_ayous'
  const r = PRICING.CLADDING[clad] ?? 245
  const electricals = a.electricals ?? []
  const hasCat6 = electricals.includes('cat6')

  // ── 1. Garden Room ──────────────────────────────────────────────────────────

  // Room price = structure + roof + cladding + storage + glass corner + skylight + doors + windows
  // (excludes decking, canopy, AC, cat6 — those are separate line items)
  const roomInc =
    (PRICING.BASE + sqm * PRICING.SQM) +
    sqm * (PRICING.ROOF[a.roof_type ?? 'flat'] ?? 0) +
    claddingCostInc(a) +
    (a.has_storage ? 1740 : 0) +
    (a.has_glass_corner ? 1450 : 0) +
    (a.has_skylight ? 1400 : 0) +
    (a.doors ?? []).reduce((s, dr) => s + (PRICING.DOORS[dr.key] ?? 0), 0) +
    (a.windows ?? []).reduce((s, win) => s + (PRICING.WINDOWS[win.type] ?? 0) * win.count, 0)

  // Build the garden room description
  const roofDesc = ROOF_DESCRIPTIONS[a.roof_type ?? 'flat'] || ROOF_DESCRIPTIONS['flat']

  const doorLines = (a.doors ?? []).map(d => doorDescription(d)).filter(Boolean)
  const windowLines = (a.windows ?? []).map(w => windowDescription(w)).filter(Boolean)

  const gardenRoomParts: string[] = [
    `Garden Room:`,
    `${w}m (W) x ${d}m (D) external footprint (${sqm.toFixed(1)}m² internal)`,
    ``,
    `Foundations:`,
    `Galvanised ground screw foundation system, providing a precise, level base with no concrete and minimal ground disruption`,
    ``,
    `Structure:`,
    `High-performance SIPs (Structural Insulated Panel) system to floor, walls, and roof, delivering excellent insulation and airtight performance for year-round use`,
    `Reinforced floor construction with 18mm CDX plywood for enhanced rigidity underfoot`,
    roofDesc,
  ]

  if (a.has_storage) {
    gardenRoomParts.push(``, `Storage Area:`, `Integrated storage room with external concealed 'secret' door, clad to match surrounding elevation`)
  }
  if (a.has_glass_corner) {
    gardenRoomParts.push(``, `Glass Corner Detail:`, `Corner glazing with sliding doors meeting fixed window to create a seamless glass corner feature`)
  }
  if (a.has_skylight) {
    gardenRoomParts.push(``, `Skylight:`, `Thermally efficient roof lantern / skylight bringing natural light from above`)
  }
  if (a.shape && a.shape !== 'standard') {
    gardenRoomParts.push(``, `Layout:`, `${a.shape} room layout as per discussions and laid out in drawings`)
  }

  if (doorLines.length) {
    gardenRoomParts.push(``, `Doors:`, ...doorLines)
  }
  if (windowLines.length) {
    gardenRoomParts.push(``, `Windows:`, ...windowLines)
  }

  gardenRoomParts.push(``, `External Cladding:`, claddingDescription(a))

  if (a.fireproofing) {
    gardenRoomParts.push(``, `Fire Protection:`, `FR treated fire-retardant coating to external cladding${a.fireproofing_walls ? ` (${a.fireproofing_walls})` : ''}`)
  }

  gardenRoomParts.push(``, `Internal Finish:`, `Fully plastered internal walls and ceilings`, `Premium laminate flooring (client-selected)`, `Skirting boards throughout`)

  const items: XeroLineItem[] = [
    {
      id: 'room',
      label: 'Garden Room',
      description: gardenRoomParts.join('\n'),
      unitAmount: exVat(roomInc),
      included: true,
      category: 'room',
    },
  ]

  // ── 2. Canopy ───────────────────────────────────────────────────────────────

  if (a.has_canopy) {
    const canopyInc = 1000 + w * r / 2
    const canopyType = a.has_side_canopy ? 'Dual Canopy' : 'Canopy'
    const sideCanopyInc = a.has_side_canopy ? 700 + 2 * r : 0
    const totalCanopyInc = canopyInc + sideCanopyInc
    const canopyDepth = a.canopy_depth_m ? `${a.canopy_depth_m}m deep, ` : ''
    items.push({
      id: 'canopy',
      label: canopyType,
      description: a.has_side_canopy
        ? `Dual aluminium canopy structure extending from front and side of the garden room\n${canopyDepth}matching the roof pitch and cladding of the main building\nFully supported on structural posts with EPDM-clad roof\nSupplied and installed including all fixings and sealing`
        : `Aluminium canopy structure extending from the front of the garden room\n${canopyDepth}matching the roof pitch and cladding of the main building\nFully supported on structural posts with EPDM-clad roof\nSupplied and installed including all fixings and sealing`,
      unitAmount: exVat(totalCanopyInc),
      included: true,
      category: 'canopy',
    })
  }

  // ── 3. Decking ──────────────────────────────────────────────────────────────

  if (a.has_decking) {
    const deckW = a.deck_w ?? 3
    const deckD = a.deck_d ?? 2
    const deckSqm = deckW * deckD
    const deckInc = 225 + 360 * deckW * deckD
    items.push({
      id: 'decking',
      label: 'Decking',
      description: `Hardwood Decking\nSupply and installation of ${deckSqm.toFixed(1)}m² hardwood deck adjacent to garden room\nConstructed on a pressure-treated timber subframe supported by ground screws\nAll necessary fixings, trims, and fascia boards included`,
      unitAmount: exVat(deckInc),
      included: true,
      category: 'decking',
    })
  }

  // ── 4. Electrics ────────────────────────────────────────────────────────────

  const hasExtLights = electricals.includes('ext_lights')
  const hasCanopyLights = electricals.includes('canopy_lights')
  const hasSmartSwitch = electricals.includes('smart_switch')
  const hasSmartSocket = electricals.includes('smart_socket')

  // Base electrics: labor + consumer unit + downlights + sockets + cabling (not inc in PRICING)
  // Plus PRICING items for extras (ext_lights, canopy_lights, smart_switch, smart_socket) — inc-VAT
  const baseElecInc = 1440 // £1,200 ex-VAT × 1.2 — base labor, consumer unit, first/second fix
  const downlightInc = (a.downlight_count ?? 0) * 60
  const socketInc = ((a.double_socket_count ?? 0) + (a.usb_socket_count ?? 0)) * 54
  const extraElecInc = electricals
    .filter(e => e !== 'cat6') // cat6 = separate line item
    .reduce((s, e) => s + (PRICING.ELEC[e] ?? 0), 0)
  const electricsInc = baseElecInc + downlightInc + socketInc + extraElecInc

  const internalParts: string[] = []
  if (a.downlight_count) internalParts.push(`${a.downlight_count}x LED recessed downlights`)
  if (a.double_socket_count) internalParts.push(`${a.double_socket_count}x double power sockets`)
  if (a.usb_socket_count) internalParts.push(`${a.usb_socket_count}x USB charging sockets`)
  if (hasSmartSwitch) internalParts.push(`LCD smart light switch`)
  if (a.has_storage) internalParts.push(`1x LED strip light (storage room)`)

  const externalParts: string[] = []
  if (hasExtLights) externalParts.push(`2x up & down wall lights`)
  if (hasCanopyLights) externalParts.push(`LED canopy downlights`)
  if (hasSmartSocket) externalParts.push(`External weatherproof double socket`)

  const elecParts: string[] = [
    `Complete electrical installation including first and second fix`,
    ``,
  ]
  if (internalParts.length) {
    elecParts.push(`Internal:`, ...internalParts, ``)
  }
  if (externalParts.length) {
    elecParts.push(`External:`, ...externalParts, ``)
  }
  elecParts.push(`Dedicated consumer unit installed, fully wired and certificated`)

  items.push({
    id: 'electrics',
    label: 'Electrics',
    description: elecParts.join('\n'),
    unitAmount: exVat(electricsInc),
    included: true,
    category: 'electrics',
  })

  // ── 5. Mains connection ─────────────────────────────────────────────────────

  const cableRun = a.cable_run_m ?? 20
  items.push({
    id: 'mains',
    label: 'Mains Connection',
    description: `Mains Connection via 6mm SWA armoured cable\nConnection from main house consumer unit (approx. ${cableRun}m cable run)\nFully installed, tested, and certified with electrical safety certificate`,
    unitAmount: 500, // £600 inc-VAT / 1.2
    included: true,
    category: 'mains',
  })

  // ── 6. Cat6 / WiFi ──────────────────────────────────────────────────────────

  if (hasCat6) {
    items.push({
      id: 'wifi',
      label: 'Wi-Fi / Cat6',
      description: `Wi-Fi connectivity via shielded SWA Cat6a ethernet cable\nHardwired from main house router with dedicated internal access point\nFully installed and tested`,
      unitAmount: exVat(PRICING.ELEC.cat6),
      included: true,
      category: 'wifi',
    })
  }

  // ── 7. Air conditioning ─────────────────────────────────────────────────────

  const climateKey = a.climate ?? 'none'
  if (climateKey !== 'none') {
    const climateOpt = CLIMATE_OPTIONS.find(o => o.value === climateKey)
    const isAC = climateKey.startsWith('ac_')
    const sizeLabel = climateKey === 'ac_2_5kw' ? '2.5kW' : climateKey === 'ac_5kw' ? '5kW' : ''
    items.push({
      id: 'climate',
      label: isAC ? 'Air Conditioning' : climateOpt?.label || 'Climate Control',
      description: isAC
        ? `${sizeLabel} smart-controlled split system air conditioning providing both heating and cooling\nInstalled by F-Gas certified engineers, fully pressure tested, commissioned, and supplied with manufacturer's warranty`
        : `Electric panel heater for year-round warmth\nSupplied and installed with thermostat control`,
      unitAmount: exVat(PRICING.CLIMATE[climateKey] ?? 0),
      included: true,
      category: 'climate',
    })
  }

  return items
}

// ─── Totals helper ────────────────────────────────────────────────────────────

export function calcTotals(items: XeroLineItem[]) {
  const exVatTotal = items
    .filter(i => i.included)
    .reduce((s, i) => s + i.unitAmount, 0)
  const vat = Math.round(exVatTotal * 0.2 * 100) / 100
  return {
    exVat: Math.round(exVatTotal * 100) / 100,
    vat,
    incVat: Math.round((exVatTotal + vat) * 100) / 100,
  }
}
