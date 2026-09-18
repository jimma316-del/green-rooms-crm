// Public client-facing quote acceptance page — no login required
// URL: /q/[token]  — token stored on quote_versions.client_token

import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ClientQuoteView } from './ClientQuoteView'

interface Props { params: Promise<{ token: string }> }

export default async function ClientQuotePage({ params }: Props) {
  const { token } = await params
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  // Look up version by token
  const { data: version } = await adminAny
    .from('quote_versions')
    .select(`
      id, version_number, status, total_pence, cover_letter,
      created_at, sent_at, viewed_at, responded_at,
      quotes (
        id, quote_ref, lead_id,
        leads ( name, address, postcode )
      )
    `)
    .eq('client_token', token)
    .single()

  if (!version) notFound()

  // Record that the client opened it (only set viewed_at once)
  if (!version.viewed_at) {
    await adminAny.from('quote_versions')
      .update({ viewed_at: new Date().toISOString(), status: version.status === 'sent' ? 'viewed' : version.status })
      .eq('id', version.id)
  }

  const quote = version.quotes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lead = (quote as any).leads as { name: string; address: string | null; postcode: string | null }

  // Load sections + items + payment schedule + elevation assets in parallel
  const [sectionsRes, paymentRes, elevationsRes] = await Promise.all([
    adminAny.from('quote_sections')
      .select(`id, title, sort_order, show_subtotal,
        quote_line_items(id, name, description, quantity, unit, unit_price_pence, line_total_pence, is_optional, is_included, sort_order)`)
      .eq('quote_version_id', version.id)
      .order('sort_order'),
    adminAny.from('payment_schedules')
      .select('id, milestone, label, amount_pence, percentage, due_trigger, paid_at')
      .eq('quote_version_id', version.id)
      .order('sort_order'),
    adminAny.from('quote_assets')
      .select('id, elevation_face, svg_data, caption')
      .eq('quote_version_id', version.id)
      .eq('asset_type', 'elevation_svg')
      .eq('include_in_pdf', true)
      .order('sort_order'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortedSections = (sectionsRes.data ?? []).map((s: any) => ({
    ...s,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    quote_line_items: (s.quote_line_items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elevations = (elevationsRes.data ?? []).filter((a: any) => a.svg_data)

  return (
    <ClientQuoteView
      token={token}
      versionId={version.id}
      quoteRef={quote.quote_ref}
      versionNumber={version.version_number}
      status={version.status}
      customerName={lead.name}
      siteAddress={[lead.address, lead.postcode].filter(Boolean).join(', ') || undefined}
      totalPence={version.total_pence}
      coverLetter={version.cover_letter}
      sections={sortedSections}
      paymentSchedule={paymentRes.data ?? []}
      preparedDate={new Date(version.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
      elevations={elevations}
    />
  )
}
