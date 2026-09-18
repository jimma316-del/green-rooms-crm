import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { QuotePDFDocument } from '@/lib/pdf/QuotePDF'
import type { QuotePDFData, PDFTCClause, PDFSpecSummary } from '@/lib/pdf/QuotePDF'
import { CLADDING_LABELS } from '@/types/assessment'
import { sendEmail, TEAM_EMAIL } from '@/lib/email'
import path from 'path'
import fs from 'fs'

interface Params { params: Promise<{ quoteId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { quoteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { versionId, recipientEmail, recipientName, subject, bodyText } = body as {
    versionId: string
    recipientEmail: string
    recipientName: string
    subject?: string
    bodyText?: string
  }

  if (!recipientEmail) return NextResponse.json({ error: 'recipientEmail required' }, { status: 400 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  // Load quote + lead
  const { data: quote } = await adminAny
    .from('quotes')
    .select('id, quote_ref, lead_id, leads(id, name, email, address, postcode)')
    .eq('id', quoteId)
    .single()

  if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })

  const { data: version } = await adminAny
    .from('quote_versions')
    .select('id, version_number, status, total_pence, cover_letter, created_at, build_date, expires_at')
    .eq('id', versionId)
    .single()

  if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 })

  // Load all PDF data in parallel
  const [sectionsRes, paymentRes, elevationsRes, tcRes, assessmentRes] = await Promise.all([
    adminAny.from('quote_sections')
      .select(`id, title, sort_order, show_subtotal,
        quote_line_items(id, name, description, quantity, unit, unit_price_pence, line_total_pence, is_optional, is_included, sort_order)`)
      .eq('quote_version_id', versionId)
      .order('sort_order'),
    adminAny.from('payment_schedules')
      .select('milestone, label, amount_pence, percentage, due_trigger')
      .eq('quote_version_id', versionId)
      .order('sort_order'),
    adminAny.from('quote_assets')
      .select('id, elevation_face, svg_data, caption')
      .eq('quote_version_id', versionId)
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

  // Build spec summary
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

  // Pull T&Cs
  let tcClauses: PDFTCClause[] | null = null
  if (tcRes.data?.[0]?.clauses) {
    try {
      const raw = tcRes.data[0].clauses
      tcClauses = Array.isArray(raw) ? raw as PDFTCClause[] : null
    } catch { /* fall through */ }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elevationAssets = (elevationsRes.data ?? []).filter((a: any) => a.svg_data)

  const lead = quote.leads as { name: string; email: string | null; address: string | null; postcode: string | null }
  const siteAddress = [lead.address, lead.postcode].filter(Boolean).join(', ') || null

  let buildDate: string | null = null
  if (version.build_date) {
    buildDate = new Date(version.build_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }

  const pdfData: QuotePDFData = {
    quoteRef: quote.quote_ref,
    versionNumber: version.version_number,
    customerName: recipientName,
    customerEmail: recipientEmail,
    siteAddress,
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

  // Load logo
  let logoUrl: string | undefined
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-colour.png')
    if (fs.existsSync(logoPath)) {
      const buf = fs.readFileSync(logoPath)
      logoUrl = `data:image/png;base64,${buf.toString('base64')}`
    }
  } catch { /* ignore */ }

  // Generate PDF
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(QuotePDFDocument, { data: pdfData, logoUrl }) as any
  const pdfBuffer = await renderToBuffer(element)

  const totalStr = `£${(version.total_pence / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
  const firstName = recipientName.split(' ')[0]

  const emailSubject = subject ?? `Your Garden Room Proposal — The Green Rooms (${quote.quote_ref})`
  const emailHtml = buildQuoteEmail(firstName, totalStr, quote.quote_ref, bodyText)

  const sent = await sendEmail({
    to: recipientEmail,
    cc: TEAM_EMAIL,
    subject: emailSubject,
    html: emailHtml,
    attachments: [{
      filename: `${quote.quote_ref}-v${version.version_number}.pdf`,
      content: Buffer.from(pdfBuffer),
    }],
  })

  if (!sent) return NextResponse.json({ error: 'Email send failed' }, { status: 500 })

  // Record + update status
  await Promise.all([
    adminAny.from('quote_emails').insert({
      quote_version_id: versionId,
      sent_by: user.id,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      subject: emailSubject,
      body_html: emailHtml,
    }),
    adminAny.from('quote_versions').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', versionId),
    admin.from('activities').insert({
      lead_id: quote.lead_id,
      created_by: user.id,
      type: 'note',
      body: `Quote ${quote.quote_ref} v${version.version_number} sent to ${recipientEmail}`,
    }),
  ])

  return NextResponse.json({ success: true })
}

// ─── Email template ───────────────────────────────────────────────────────────
function buildQuoteEmail(firstName: string, totalStr: string, quoteRef: string, customBody?: string): string {
  const intro = customBody
    ? customBody.split('\n').map(l => `<p style="margin:0 0 14px;color:#555;font-size:14px;">${l}</p>`).join('')
    : `<p style="margin:0 0 14px;color:#555;font-size:14px;">Hi ${firstName},</p>
       <p style="margin:0 0 14px;color:#555;font-size:14px;">Thank you for your time during our site visit. Following our discussion, please find attached your personalised Garden Room Proposal from The Green Rooms.</p>
       <p style="margin:0 0 14px;color:#555;font-size:14px;">The proposal includes a full breakdown of the specification and pricing we discussed, along with our payment schedule and terms.</p>`

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f4f3;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f3;padding:28px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <tr><td style="background:#1a2328;padding:28px 32px;text-align:center;">
    <p style="font-size:22px;font-weight:700;color:#34a02e;margin:0;letter-spacing:-0.5px;">The Green Rooms</p>
    <p style="font-size:11px;color:rgba(255,255,255,0.45);margin:5px 0 0;text-transform:uppercase;letter-spacing:0.08em;">Bespoke Garden Rooms · Surrey</p>
  </td></tr>
  <tr><td style="background:#2d3841;padding:24px 32px;text-align:center;">
    <p style="font-size:11px;color:rgba(255,255,255,0.45);margin:0 0 8px;text-transform:uppercase;letter-spacing:0.1em;">Your Proposal is Attached</p>
    <p style="font-size:36px;font-weight:700;color:#34a02e;margin:0;line-height:1;">${totalStr}</p>
    <p style="font-size:11px;color:rgba(255,255,255,0.3);margin:8px 0 0;">Inc VAT · Ref: ${quoteRef}</p>
  </td></tr>
  <tr><td style="padding:32px 36px 28px;">
    ${intro}
    <p style="margin:0 0 14px;color:#555;font-size:14px;">Please take your time to review the proposal. If you have any questions or would like to discuss any aspect of the design or pricing, don't hesitate to get in touch.</p>
    <div style="background:#f0f8ef;border-radius:8px;padding:20px 22px;margin:20px 0 28px;border-left:3px solid #34a02e;">
      <p style="font-weight:700;color:#2d3841;font-size:14px;margin:0 0 6px;">Ready to proceed?</p>
      <p style="color:#555;font-size:13px;margin:0;">To secure your build slot, simply reply to this email or give us a call to confirm you're happy to proceed. We'll then send a deposit invoice to get everything started.</p>
    </div>
    <p style="margin:0 0 24px;color:#555;font-size:13px;">Call or WhatsApp us on <a href="tel:01932640242" style="color:#34a02e;font-weight:600;text-decoration:none;">01932 640242</a>, or reply to this email.</p>
    <p style="margin:0 0 32px;color:#555;font-size:13px;">Kind regards,<br><strong style="color:#2d3841;">The Green Rooms Team</strong></p>
  </td></tr>
  <tr><td style="background:#f8f8f8;padding:18px 32px;text-align:center;border-top:1px solid #eee;">
    <p style="font-size:11px;color:#aaa;margin:0;">The Green Rooms · Lyne Lane, Lyne, Surrey KT16 0AN</p>
    <p style="font-size:11px;color:#aaa;margin:4px 0 0;"><a href="tel:01932640242" style="color:#aaa;text-decoration:none;">01932 640242</a> · <a href="https://www.thegreenrooms.com" style="color:#aaa;text-decoration:none;">thegreenrooms.com</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
