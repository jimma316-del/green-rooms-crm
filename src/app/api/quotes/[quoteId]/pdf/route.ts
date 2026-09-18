import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { QuotePDFDocument } from '@/lib/pdf/QuotePDF'
import type { QuotePDFData } from '@/lib/pdf/QuotePDF'
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
    .select('id, version_number, status, total_pence, cover_letter, is_current, created_at')
    .eq('quote_id', quoteId)

  if (versionId) {
    versionQuery = versionQuery.eq('id', versionId)
  } else {
    versionQuery = versionQuery.eq('is_current', true)
  }

  const { data: versions } = await versionQuery.order('version_number', { ascending: false }).limit(1)
  const version = versions?.[0]
  if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 })

  // Load sections + items
  const { data: sections } = await adminAny
    .from('quote_sections')
    .select(`id, title, sort_order, show_subtotal,
      quote_line_items(id, name, description, quantity, unit, unit_price_pence, line_total_pence, is_optional, is_included, sort_order)`)
    .eq('quote_version_id', version.id)
    .order('sort_order')

  // Load payment schedule
  const { data: paymentSchedule } = await adminAny
    .from('payment_schedules')
    .select('milestone, label, amount_pence, percentage, due_trigger')
    .eq('quote_version_id', version.id)
    .order('sort_order')

  // Sort items within sections
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortedSections = (sections ?? []).map((s: any) => ({
    ...s,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    quote_line_items: (s.quote_line_items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
  }))

  const lead = quote.leads as { name: string; email: string | null; address: string | null; postcode: string | null }
  const siteAddress = [lead.address, lead.postcode].filter(Boolean).join(', ') || null

  const pdfData: QuotePDFData = {
    quoteRef: quote.quote_ref,
    versionNumber: version.version_number,
    customerName: lead.name,
    customerEmail: lead.email,
    siteAddress,
    totalPence: version.total_pence,
    coverLetter: version.cover_letter,
    sections: sortedSections,
    paymentSchedule: paymentSchedule ?? [],
    preparedDate: new Date(version.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    validDays: 30,
  }

  // Load logo as base64 (works in serverless — reads from public folder at build time)
  let logoUrl: string | undefined
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-colour.png')
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath)
      logoUrl = `data:image/png;base64,${logoBuffer.toString('base64')}`
    }
  } catch { /* logo missing — render without */ }

  // Render PDF — cast through unknown to satisfy strict react-pdf types
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
