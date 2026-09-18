import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { QuotePDFDocument } from '@/lib/pdf/QuotePDF'
import type { QuotePDFData, PDFTCClause, PDFSpecSummary } from '@/lib/pdf/QuotePDF'
import { CLADDING_LABELS } from '@/types/assessment'
import path from 'path'
import fs from 'fs'

interface Params { params: Promise<{ token: string }> }

// GET /api/client-quote/[token]/pdf — public, no auth
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const { data: version } = await adminAny
    .from('quote_versions')
    .select(`id, version_number, total_pence, cover_letter, created_at,
      quotes(id, quote_ref, lead_id, leads(name, email, address, postcode))`)
    .eq('client_token', token)
    .single()

  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const quote = version.quotes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lead = (quote as any).leads as { name: string; email: string | null; address: string | null; postcode: string | null }

  // Load everything in parallel
  const [sectionsRes, paymentRes, elevationsRes, tcRes, assessmentRes] = await Promise.all([
    adminAny.from('quote_sections')
      .select(`id, title, sort_order, show_subtotal,
        quote_line_items(id, name, description, quantity, unit, unit_price_pence, line_total_pence, is_optional, is_included, sort_order)`)
      .eq('quote_version_id', version.id)
      .order('sort_order'),
    adminAny.from('payment_schedules')
      .select('milestone, label, amount_pence, percentage, due_trigger')
      .eq('quote_version_id', version.id)
      .order('sort_order'),
    adminAny.from('quote_assets')
      .select('id, elevation_face, svg_data, caption')
      .eq('quote_version_id', version.id)
      .eq('asset_type', 'elevation_svg')
      .eq('include_in_pdf', true)
      .order('sort_order'),
    adminAny.from('tc_versions').select('clauses').eq('is_current', true).limit(1),
    adminAny.from('site_assessments')
      .select('width_m, depth_m, roof_type, single_cladding, cladding_better, cladding_good, planning_type')
      .eq('lead_id', quote.lead_id)
      .single(),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortedSections = (sectionsRes.data ?? []).map((s: any) => ({
    ...s,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    quote_line_items: (s.quote_line_items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
  }))

  let specSummary: PDFSpecSummary | null = null
  if (assessmentRes.data) {
    const a = assessmentRes.data
    const clad = a.single_cladding || a.cladding_better || a.cladding_good
    specSummary = {
      dimensions: a.width_m && a.depth_m ? `${a.width_m}m × ${a.depth_m}m` : undefined,
      sqm: a.width_m && a.depth_m ? `${(a.width_m * a.depth_m).toFixed(1)}m²` : undefined,
      roofType: a.roof_type ?? undefined,
      cladding: clad ? (CLADDING_LABELS[clad] ?? clad) : undefined,
      planningType: a.planning_type ?? undefined,
    }
  }

  let tcClauses: PDFTCClause[] | null = null
  if (tcRes.data?.[0]?.clauses) {
    const raw = tcRes.data[0].clauses
    tcClauses = Array.isArray(raw) ? raw as PDFTCClause[] : null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elevationAssets = (elevationsRes.data ?? []).filter((a: any) => a.svg_data)

  let buildDate: string | null = null
  if (version.build_date) {
    buildDate = new Date(version.build_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }

  const pdfData: QuotePDFData = {
    quoteRef: quote.quote_ref,
    versionNumber: version.version_number,
    customerName: lead.name,
    customerEmail: lead.email,
    siteAddress: [lead.address, lead.postcode].filter(Boolean).join(', ') || null,
    totalPence: version.total_pence,
    coverLetter: version.cover_letter,
    sections: sortedSections,
    paymentSchedule: paymentRes.data ?? [],
    preparedDate: new Date(version.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    validDays: 30,
    buildDate,
    elevationAssets,
    tcClauses,
    specSummary,
  }

  let logoUrl: string | undefined
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-colour.png')
    if (fs.existsSync(logoPath)) {
      const buf = fs.readFileSync(logoPath)
      logoUrl = `data:image/png;base64,${buf.toString('base64')}`
    }
  } catch { /* ignore */ }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(QuotePDFDocument, { data: pdfData, logoUrl }) as any
  const buffer = await renderToBuffer(element)
  const uint8 = new Uint8Array(buffer)

  return new NextResponse(uint8, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${quote.quote_ref}-v${version.version_number}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
