import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { QuotePDFDocument } from '@/lib/pdf/QuotePDF'
import type { QuotePDFData, PDFTCClause, PDFSpecSummary } from '@/lib/pdf/QuotePDF'
import { CLADDING_LABELS } from '@/types/assessment'
import path from 'path'
import fs from 'fs'

interface Params { params: Promise<{ quoteId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { quoteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const versionId = req.nextUrl.searchParams.get('versionId')

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  // Load quote + lead
  const { data: quote } = await adminAny
    .from('quotes')
    .select('id, quote_ref, lead_id, leads(id, name, email, address, postcode)')
    .eq('id', quoteId)
    .single()

  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Load the requested version (or current)
  let versionQuery = adminAny
    .from('quote_versions')
    .select('id, version_number, status, total_pence, cover_letter, is_current, created_at, build_date, expires_at')
    .eq('quote_id', quoteId)

  if (versionId) {
    versionQuery = versionQuery.eq('id', versionId)
  } else {
    versionQuery = versionQuery.eq('is_current', true)
  }

  const { data: versions } = await versionQuery.order('version_number', { ascending: false }).limit(1)
  const version = versions?.[0]
  if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 })

  const resolvedVersionId = version.id

  // Load all data in parallel
  const [sectionsRes, paymentRes, elevationsRes, tcRes, assessmentRes] = await Promise.all([
    adminAny
      .from('quote_sections')
      .select(`id, title, sort_order, show_subtotal,
        quote_line_items(id, name, description, quantity, unit, unit_price_pence, line_total_pence, is_optional, is_included, sort_order)`)
      .eq('quote_version_id', resolvedVersionId)
      .order('sort_order'),
    adminAny
      .from('payment_schedules')
      .select('milestone, label, amount_pence, percentage, due_trigger')
      .eq('quote_version_id', resolvedVersionId)
      .order('sort_order'),
    adminAny
      .from('quote_assets')
      .select('id, elevation_face, svg_data, caption')
      .eq('quote_version_id', resolvedVersionId)
      .eq('asset_type', 'elevation_svg')
      .eq('include_in_pdf', true)
      .order('sort_order'),
    adminAny
      .from('tc_versions')
      .select('clauses')
      .eq('is_current', true)
      .limit(1),
    adminAny
      .from('site_assessments')
      .select('width_m, depth_m, roof_type, single_cladding, cladding_better, cladding_good, planning_type')
      .eq('lead_id', quote.lead_id)
      .single(),
  ])

  // Sort items within sections
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortedSections = (sectionsRes.data ?? []).map((sec: any) => ({
    ...sec,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    quote_line_items: (sec.quote_line_items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
  }))

  // Build spec summary from assessment
  let specSummary: PDFSpecSummary | null = null
  if (assessmentRes.data) {
    const a = assessmentRes.data
    const w = a.width_m
    const d = a.depth_m
    const clad = a.single_cladding || a.cladding_better || a.cladding_good
    specSummary = {
      dimensions: w && d ? `${w}m × ${d}m` : undefined,
      sqm: w && d ? `${(w * d).toFixed(1)}m²` : undefined,
      roofType: a.roof_type ?? undefined,
      cladding: clad ? (CLADDING_LABELS[clad] ?? clad) : undefined,
      planningType: a.planning_type ?? undefined,
    }
  }

  // Pull T&Cs from database
  let tcClauses: PDFTCClause[] | null = null
  if (tcRes.data?.[0]?.clauses) {
    try {
      const raw = tcRes.data[0].clauses
      tcClauses = Array.isArray(raw) ? raw as PDFTCClause[] : null
    } catch { /* fall through to hardcoded */ }
  }

  // Filter elevation assets (only those with svg_data)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elevationAssets = (elevationsRes.data ?? []).filter((a: any) => a.svg_data)

  const lead = quote.leads as { name: string; email: string | null; address: string | null; postcode: string | null }
  const siteAddress = [lead.address, lead.postcode].filter(Boolean).join(', ') || null

  // Format build/expiry dates
  let buildDate: string | null = null
  let expiresAt: string | null = null
  if (version.build_date) {
    buildDate = new Date(version.build_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }
  if (version.expires_at) {
    expiresAt = new Date(version.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const pdfData: QuotePDFData = {
    quoteRef: quote.quote_ref,
    versionNumber: version.version_number,
    customerName: lead.name,
    customerEmail: lead.email,
    siteAddress,
    totalPence: version.total_pence,
    coverLetter: version.cover_letter,
    sections: sortedSections,
    paymentSchedule: paymentRes.data ?? [],
    preparedDate: new Date(version.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    validDays: expiresAt ? undefined : 30,
    buildDate,
    expiresAt,
    elevationAssets,
    tcClauses,
    specSummary,
  }

  // Load logo as base64
  let logoUrl: string | undefined
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-colour.png')
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath)
      logoUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`
    }
  } catch { /* logo missing — render without */ }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(QuotePDFDocument, { data: pdfData, logoUrl }) as any
  const buffer = await renderToBuffer(element)
  const uint8 = new Uint8Array(buffer)

  const filename = `${quote.quote_ref}-v${version.version_number}.pdf`

  return new NextResponse(uint8, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
