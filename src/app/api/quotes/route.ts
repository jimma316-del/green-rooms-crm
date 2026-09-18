import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PRICING, CLADDING_LABELS, DOOR_OPTIONS, WINDOW_OPTIONS } from '@/types/assessment'
import type { SiteAssessment } from '@/types/assessment'

// ─── GET /api/quotes?lead_id=xxx ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leadId = req.nextUrl.searchParams.get('lead_id')
  if (!leadId) return NextResponse.json({ error: 'lead_id required' }, { status: 400 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('quotes')
    .select(`
      id, quote_ref, created_at, archived_at,
      quote_versions ( id, version_number, status, title, total_pence, sent_at, is_current )
    `)
    .eq('lead_id', leadId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ quotes: data ?? [] })
}

// ─── POST /api/quotes ─────────────────────────────────────────────────────────
// Creates a quote + first version, optionally pre-populating from site assessment
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { lead_id, from_assessment = true } = body as {
    lead_id: string
    from_assessment?: boolean
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  // Create parent quote record
  const { data: quote, error: qErr } = await adminAny
    .from('quotes')
    .insert({ lead_id, created_by: user.id })
    .select('id, quote_ref')
    .single()

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 })

  // Create first version
  const { data: version, error: vErr } = await adminAny
    .from('quote_versions')
    .insert({ quote_id: quote.id, version_number: 1, status: 'draft', created_by: user.id })
    .select('id')
    .single()

  if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 })

  const versionId = version.id

  // Build sections from assessment if requested
  if (from_assessment) {
    const { data: assessment } = await adminAny
      .from('site_assessments')
      .select('*')
      .eq('lead_id', lead_id)
      .single()

    if (assessment) {
      await buildSectionsFromAssessment(adminAny, versionId, assessment as SiteAssessment)
    } else {
      await createBlankSections(adminAny, versionId)
    }
  } else {
    await createBlankSections(adminAny, versionId)
  }

  // Create default payment schedule
  const totalPence = await recalcVersionTotal(adminAny, versionId)
  await createDefaultPaymentSchedule(adminAny, versionId, totalPence)

  await admin.from('activities').insert({
    lead_id,
    created_by: user.id,
    type: 'note',
    body: `Quote ${quote.quote_ref} created`,
  })

  return NextResponse.json({ quoteId: quote.id, quoteRef: quote.quote_ref, versionId })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function p(pounds: number) { return Math.round(pounds * 100) }

function wallsLabel(walls: number) {
  if (walls === 1) return 'front'
  if (walls === 2) return 'front + 1 side'
  if (walls === 3) return 'front + 2 sides'
  return 'all 4 walls'
}

function claddingLinearM(w: number, d: number, walls: number) {
  if (walls === 1) return w
  if (walls === 2) return w + d
  if (walls === 3) return w + d * 2
  return (w + d) * 2
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildSectionsFromAssessment(admin: any, versionId: string, a: SiteAssessment) {
  const w = a.width_m ?? 4
  const d = a.depth_m ?? 3
  const sqm = w * d
  const walls = a.cladding_walls ?? 1
  const roofUplift = PRICING.ROOF[a.roof_type ?? 'flat'] ?? 0
  const roofLabel = a.roof_type === 'dual_pitched' ? 'dual pitched roof'
    : a.roof_type === 'dual_extended' ? 'dual pitched extended height roof'
    : a.roof_type === 'single_ext' ? 'single pitch extended roof'
    : 'flat roof'

  const sections: Array<{ title: string; sort_order: number; items: Array<{ name: string; description?: string; quantity: number; unit: string; unit_price_pence: number }> }> = []

  // ── Room Shell ──────────────────────────────────────────────────
  const structurePounds = PRICING.BASE + sqm * PRICING.SQM + sqm * roofUplift
  sections.push({
    title: 'Room Shell',
    sort_order: 1,
    items: [{
      name: `Garden Room ${w}m × ${d}m (${sqm.toFixed(1)}m²) — ${roofLabel}`,
      description: 'Timber-frame structure, fully insulated walls/roof/floor, EPDM or felt roof, plastered and decorated internally',
      quantity: 1,
      unit: 'item',
      unit_price_pence: p(structurePounds),
    }],
  })

  // Optional extras on shell
  if (a.has_canopy) {
    const canopyPounds = 1000 + w * (PRICING.CLADDING[a.single_cladding ?? 'thermo_ayous'] ?? 245) / 2
    sections[0].items.push({
      name: 'Canopy',
      description: `Canopy over entrance, matching cladding`,
      quantity: 1, unit: 'item',
      unit_price_pence: p(canopyPounds),
    })
  }
  if (a.has_side_canopy) {
    const r = PRICING.CLADDING[a.single_cladding ?? 'thermo_ayous'] ?? 245
    sections[0].items.push({
      name: 'Side Canopy Walls',
      quantity: 1, unit: 'item',
      unit_price_pence: p(700 + 2 * r),
    })
  }
  if (a.has_storage) {
    sections[0].items.push({ name: 'Hidden Storage Room', quantity: 1, unit: 'item', unit_price_pence: p(1740) })
  }
  if (a.has_glass_corner) {
    sections[0].items.push({ name: 'Glass Corner', quantity: 1, unit: 'item', unit_price_pence: p(1450) })
  }
  if (a.has_skylight) {
    sections[0].items.push({ name: 'Roof Skylight', quantity: 1, unit: 'item', unit_price_pence: p(1400) })
  }

  // ── Cladding ────────────────────────────────────────────────────
  const clad = a.single_cladding || a.cladding_better || a.cladding_good || 'thermo_ayous'
  const claddingRate = PRICING.CLADDING[clad] ?? 245
  const claddingLabel = CLADDING_LABELS[clad] ?? clad
  const linearM = claddingLinearM(w, d, walls)
  sections.push({
    title: 'Cladding',
    sort_order: 2,
    items: [{
      name: `${claddingLabel} cladding — ${wallsLabel(walls)}`,
      description: 'Including battens, fixings and any required fire treatment',
      quantity: linearM,
      unit: 'linear_m',
      unit_price_pence: p(claddingRate),
    }],
  })

  // ── Glazing (doors + windows) ───────────────────────────────────
  const glazingItems: typeof sections[0]['items'] = []
  for (const door of a.doors ?? []) {
    const opt = DOOR_OPTIONS.find(o => o.value === door.key)
    if (opt) {
      glazingItems.push({
        name: `${opt.label}${door.colour ? ` — ${door.colour}` : ''}`,
        description: `Position: ${door.position}`,
        quantity: 1, unit: 'item',
        unit_price_pence: p(opt.price),
      })
    }
  }
  for (const win of a.windows ?? []) {
    const opt = WINDOW_OPTIONS.find(o => o.value === win.type)
    if (opt) {
      glazingItems.push({
        name: `${opt.label}${win.colour ? ` — ${win.colour}` : ''}`,
        description: `Position: ${win.position}${win.opening ? ', opening' : ''}`,
        quantity: win.count, unit: 'item',
        unit_price_pence: p(opt.price),
      })
    }
  }
  sections.push({
    title: 'Glazing',
    sort_order: 3,
    items: glazingItems.length ? glazingItems : [{ name: 'Glazing (TBC)', quantity: 1, unit: 'item', unit_price_pence: 0 }],
  })

  // ── Electrical ──────────────────────────────────────────────────
  const elecItems: typeof sections[0]['items'] = []
  // Standard package is always included
  elecItems.push({ name: 'Standard Electrical Package', description: 'Consumer unit, armoured cable run, 6× double sockets, switches, LED downlights', quantity: 1, unit: 'item', unit_price_pence: p(2800) })
  for (const e of a.electricals ?? []) {
    const price = PRICING.ELEC[e] ?? 0
    if (price > 0) {
      elecItems.push({ name: e.replace(/_/g, ' '), quantity: 1, unit: 'item', unit_price_pence: p(price) })
    }
  }
  const climatePrice = PRICING.CLIMATE[a.climate ?? 'none'] ?? 0
  if (climatePrice > 0) {
    const climateLabel = a.climate === 'ac_2_5kw' ? 'Air conditioning 2.5kW' : a.climate === 'ac_5kw' ? 'Air conditioning 5kW' : 'Electric panel heater'
    elecItems.push({ name: climateLabel, quantity: 1, unit: 'item', unit_price_pence: p(climatePrice) })
  }
  sections.push({ title: 'Electrical', sort_order: 4, items: elecItems })

  // ── Decking ─────────────────────────────────────────────────────
  if (a.has_decking && a.deck_w && a.deck_d) {
    const deckPounds = 225 + 360 * a.deck_w * a.deck_d
    sections.push({
      title: 'Decking',
      sort_order: 5,
      items: [{ name: `Hardwood decking ${a.deck_w}m × ${a.deck_d}m`, quantity: a.deck_w * a.deck_d, unit: 'm2', unit_price_pence: p(360) }],
    })
    // suppress the unused variable warning
    void deckPounds
  }

  // ── Extras placeholder ──────────────────────────────────────────
  sections.push({ title: 'Extras', sort_order: 6, items: [] })

  // Insert all sections + items
  for (const s of sections) {
    const { data: sec } = await admin
      .from('quote_sections')
      .insert({ quote_version_id: versionId, title: s.title, sort_order: s.sort_order })
      .select('id')
      .single()
    if (!sec) continue

    const itemRows = s.items.map((item, i) => ({
      section_id: sec.id,
      name: item.name,
      description: item.description ?? null,
      quantity: item.quantity,
      unit: item.unit,
      unit_price_pence: item.unit_price_pence,
      line_total_pence: Math.round(item.quantity * item.unit_price_pence),
      sort_order: i,
    }))
    if (itemRows.length > 0) {
      await admin.from('quote_line_items').insert(itemRows)
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createBlankSections(admin: any, versionId: string) {
  const titles = ['Room Shell', 'Cladding', 'Glazing', 'Electrical', 'Extras']
  for (let i = 0; i < titles.length; i++) {
    await admin.from('quote_sections').insert({ quote_version_id: versionId, title: titles[i], sort_order: i + 1 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recalcVersionTotal(admin: any, versionId: string): Promise<number> {
  const { data: sections } = await admin
    .from('quote_sections')
    .select('id')
    .eq('quote_version_id', versionId)

  if (!sections?.length) return 0

  const sectionIds = sections.map((s: { id: string }) => s.id)
  const { data: items } = await admin
    .from('quote_line_items')
    .select('line_total_pence, is_included, is_optional')
    .in('section_id', sectionIds)

  const total = (items ?? []).reduce((sum: number, it: { line_total_pence: number; is_included: boolean; is_optional: boolean }) => {
    if (it.is_optional && !it.is_included) return sum
    return sum + (it.line_total_pence ?? 0)
  }, 0)

  await admin.from('quote_versions').update({ total_pence: total }).eq('id', versionId)
  return total
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createDefaultPaymentSchedule(admin: any, versionId: string, totalPence: number) {
  const milestones = [
    { milestone: 'deposit',    label: 'Deposit on booking',         percentage: 10, due_trigger: 'on_booking',    sort_order: 1 },
    { milestone: 'day_1',      label: 'Day 1 — materials delivery', percentage: 50, due_trigger: 'on_start',      sort_order: 2 },
    { milestone: 'plastering', label: 'Plastering / second fix',    percentage: 30, due_trigger: 'on_plastering', sort_order: 3 },
    { milestone: 'completion', label: 'Balance on completion',      percentage: 10, due_trigger: 'on_completion', sort_order: 4 },
  ]
  const rows = milestones.map(m => ({
    quote_version_id: versionId,
    ...m,
    amount_pence: Math.round(totalPence * m.percentage / 100),
  }))
  await admin.from('payment_schedules').insert(rows)
}

// Export helpers so other routes can reuse them
export { recalcVersionTotal, createDefaultPaymentSchedule }
