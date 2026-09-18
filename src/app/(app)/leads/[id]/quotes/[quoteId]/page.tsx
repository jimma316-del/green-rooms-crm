import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { QuoteEditorClient } from '@/components/quotes/QuoteEditorClient'
import { VariationsPanel } from '@/components/quotes/VariationsPanel'
import { ElevationDiagramBuilder } from '@/components/quotes/ElevationDiagramBuilder'
import { QuotePhotosTab } from '@/components/quotes/QuotePhotosTab'
import { QuoteEditorTabs, QuoteTabPanel } from '@/components/quotes/QuoteEditorTabs'

interface Props { params: Promise<{ id: string; quoteId: string }> }

export default async function QuoteEditorPage({ params }: Props) {
  const { id: leadId, quoteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const [leadRes, quoteRes, productsRes, variationsRes, assessmentRes] = await Promise.all([
    admin.from('leads').select('id, name, email, mobile, address, postcode').eq('id', leadId).single(),
    adminAny.from('quotes')
      .select(`
        id, quote_ref, lead_id, created_at,
        quote_versions (
          id, version_number, status, title, internal_notes, cover_letter,
          total_pence, is_current, created_at, sent_at, pdf_url
        )
      `)
      .eq('id', quoteId)
      .single(),
    adminAny.from('product_catalogue')
      .select('id, category, sku, name, description, unit, base_price_pence, vat_rate, sort_order')
      .eq('is_active', true)
      .order('category').order('sort_order'),
    adminAny.from('quote_variations')
      .select('*')
      .eq('quote_id', quoteId)
      .order('variation_number'),
    adminAny.from('site_assessments')
      .select('width_m, depth_m, roof_type')
      .eq('lead_id', leadId)
      .single(),
  ])

  const lead = leadRes.data
  const quote = quoteRes.data
  const variations = variationsRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assessment = assessmentRes.data as any ?? null
  if (!lead || !quote) notFound()

  // Verify quote belongs to this lead
  if (quote.lead_id !== leadId) notFound()

  // Get current version
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const versions: any[] = quote.quote_versions ?? []
  const currentVersion = versions.find((v: { is_current: boolean }) => v.is_current)
    ?? versions.sort((a: { version_number: number }, b: { version_number: number }) => b.version_number - a.version_number)[0]

  if (!currentVersion) notFound()

  // Load current version's sections + items + payment schedule + elevation assets + photos
  const [sectionsRes, paymentRes, assetsRes, photosRes] = await Promise.all([
    adminAny.from('quote_sections')
      .select(`
        id, title, sort_order, show_subtotal, notes,
        quote_line_items (
          id, product_id, name, description, quantity, unit,
          unit_price_pence, line_total_pence, is_optional, is_included,
          sort_order, internal_notes
        )
      `)
      .eq('quote_version_id', currentVersion.id)
      .order('sort_order'),
    adminAny.from('payment_schedules')
      .select('*')
      .eq('quote_version_id', currentVersion.id)
      .order('sort_order'),
    adminAny.from('quote_assets')
      .select('id, elevation_face, svg_data, caption, width_mm, height_mm, sort_order, include_in_pdf')
      .eq('quote_version_id', currentVersion.id)
      .eq('asset_type', 'elevation_svg')
      .order('sort_order'),
    adminAny.from('quote_assets')
      .select('id, image_url, caption, include_in_pdf, sort_order')
      .eq('quote_version_id', currentVersion.id)
      .eq('asset_type', 'photo')
      .order('sort_order'),
  ])

  const elevationAssets = assetsRes.data ?? []
  const photoAssets = photosRes.data ?? []

  // Sort items within each section
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sections = (sectionsRes.data ?? []).map((s: any) => ({
    ...s,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    quote_line_items: (s.quote_line_items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
  }))

  // Group products by category for picker
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productsGrouped: Record<string, any[]> = {}
  for (const p of productsRes.data ?? []) {
    if (!productsGrouped[p.category]) productsGrouped[p.category] = []
    productsGrouped[p.category].push(p)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Breadcrumb header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <a href={`/leads/${leadId}`} className="text-xs text-gray-500 hover:text-gray-700 shrink-0">
          ← {lead.name}
        </a>
        <span className="text-gray-200">|</span>
        <span className="text-xs font-semibold text-gray-700">{quote.quote_ref}</span>
        {versions.length > 1 && (
          <>
            <span className="text-gray-200">|</span>
            <span className="text-xs text-gray-500">v{currentVersion.version_number} of {versions.length}</span>
          </>
        )}
        <div className="flex-1" />
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          currentVersion.status === 'draft'     ? 'bg-gray-100 text-gray-600' :
          currentVersion.status === 'sent'      ? 'bg-blue-100 text-blue-700' :
          currentVersion.status === 'viewed'    ? 'bg-yellow-100 text-yellow-700' :
          currentVersion.status === 'accepted'  ? 'bg-green-100 text-green-700' :
          currentVersion.status === 'rejected'  ? 'bg-red-100 text-red-700' :
                                                   'bg-gray-100 text-gray-500'
        }`}>
          {currentVersion.status}
        </span>
      </div>

      <QuoteEditorTabs>
        <QuoteTabPanel tabId="quote">
          <QuoteEditorClient
            leadId={leadId}
            lead={lead}
            quoteId={quoteId}
            quoteRef={quote.quote_ref}
            versions={versions}
            currentVersion={currentVersion}
            initialSections={sections}
            initialPaymentSchedule={paymentRes.data ?? []}
            productsGrouped={productsGrouped}
            assessment={assessment}
          />
        </QuoteTabPanel>

        <QuoteTabPanel tabId="elevations" className="max-w-5xl mx-auto w-full px-4 py-6">
          <ElevationDiagramBuilder
            quoteId={quoteId}
            versionId={currentVersion.id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialAssets={elevationAssets as any}
          />
        </QuoteTabPanel>

        <QuoteTabPanel tabId="photos" className="max-w-5xl mx-auto w-full px-4 py-6">
          <QuotePhotosTab
            quoteId={quoteId}
            versionId={currentVersion.id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialPhotos={photoAssets as any}
          />
        </QuoteTabPanel>

        <QuoteTabPanel tabId="variations" className="max-w-5xl mx-auto w-full px-4 py-6">
          <VariationsPanel
            quoteId={quoteId}
            leadEmail={lead.email}
            leadName={lead.name}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialVariations={variations as any}
          />
        </QuoteTabPanel>
      </QuoteEditorTabs>
    </div>
  )
}
