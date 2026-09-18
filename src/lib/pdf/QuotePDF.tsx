// @react-pdf/renderer quote document
// Matches the TGR branded booklet style: dark header, green accent, clean tables

import {
  Document, Page, Text, View, StyleSheet, Image,
} from '@react-pdf/renderer'

// ─── Colours (TGR brand) ──────────────────────────────────────────────────────
const C = {
  dark:    '#1a2328',
  green:   '#34a02e',
  mid:     '#2d3841',
  white:   '#ffffff',
  offWhite:'#f8f9f8',
  border:  '#e5e7e5',
  text:    '#2d3841',
  muted:   '#6b7280',
  light:   '#f0f7ef',
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: C.text, backgroundColor: C.white },

  // Cover
  coverPage: { backgroundColor: C.dark, padding: 0 },
  coverTop: { backgroundColor: C.dark, padding: 48, paddingBottom: 32 },
  coverLogo: { width: 120, height: 36, objectFit: 'contain' },
  coverTagline: { color: 'rgba(255,255,255,0.4)', fontSize: 8, marginTop: 6, letterSpacing: 1, textTransform: 'uppercase' },
  coverDivider: { height: 2, backgroundColor: C.green, marginTop: 32, marginBottom: 0 },
  coverMid: { backgroundColor: C.mid, padding: 48, paddingTop: 40, paddingBottom: 40 },
  coverRef: { color: 'rgba(255,255,255,0.45)', fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  coverTitle: { color: C.white, fontSize: 28, fontFamily: 'Helvetica-Bold', lineHeight: 1.2 },
  coverSubtitle: { color: C.green, fontSize: 13, marginTop: 10 },
  coverBottom: { backgroundColor: C.dark, padding: 48, paddingTop: 32, flexDirection: 'row', justifyContent: 'space-between' },
  coverDetail: { color: 'rgba(255,255,255,0.6)', fontSize: 8.5, lineHeight: 1.7 },
  coverDetailLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 7.5, textTransform: 'uppercase', letterSpacing: 0.5 },
  coverPrice: { color: C.green, fontSize: 32, fontFamily: 'Helvetica-Bold' },
  coverPriceLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 7.5, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  coverIncVat: { color: 'rgba(255,255,255,0.35)', fontSize: 7.5, marginTop: 3 },

  // Body pages
  body: { padding: 40, paddingTop: 36, paddingBottom: 52 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 12, borderBottom: `1 solid ${C.border}` },
  pageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageHeaderLogo: { width: 60, height: 18, objectFit: 'contain' },
  pageHeaderRef: { color: C.muted, fontSize: 7.5 },

  // Section
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 6, marginTop: 16 },
  sectionTitleBar: { height: 2, backgroundColor: C.green, width: 32, marginBottom: 10 },

  // Line items table
  tableHeader: { flexDirection: 'row', backgroundColor: C.dark, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 0 },
  tableHeaderText: { color: 'rgba(255,255,255,0.7)', fontSize: 7.5, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, borderBottom: `0.5 solid ${C.border}` },
  tableRowAlt: { backgroundColor: C.offWhite },
  colDesc: { flex: 1 },
  colQty: { width: 40, textAlign: 'right' },
  colUnit: { width: 36, textAlign: 'center' },
  colPrice: { width: 58, textAlign: 'right' },
  colTotal: { width: 60, textAlign: 'right' },
  tableItemName: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: C.dark },
  tableItemDesc: { fontSize: 7.5, color: C.muted, marginTop: 1.5, lineHeight: 1.4 },
  tableItemOptional: { fontSize: 7, color: C.green, marginTop: 1 },
  tableNumber: { fontSize: 8.5, color: C.text },
  tableSubtotal: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'flex-end', backgroundColor: C.light, marginTop: 1 },
  tableSubtotalLabel: { color: C.muted, fontSize: 8, marginRight: 10 },
  tableSubtotalAmount: { width: 60, textAlign: 'right', fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: C.green },

  // Total box
  totalBox: { marginTop: 24, backgroundColor: C.dark, padding: 16, borderRadius: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 8 },
  totalValue: { color: C.white, fontSize: 8 },
  totalGrandRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, marginTop: 6, borderTop: '0.5 solid rgba(255,255,255,0.15)' },
  totalGrandLabel: { color: C.white, fontFamily: 'Helvetica-Bold', fontSize: 10 },
  totalGrandValue: { color: C.green, fontFamily: 'Helvetica-Bold', fontSize: 14 },

  // Payment schedule
  payRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderBottom: `0.5 solid ${C.border}`, alignItems: 'center' },
  payMilestone: { flex: 1 },
  payLabel: { fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: C.dark },
  payTrigger: { fontSize: 7.5, color: C.muted, marginTop: 1 },
  payPct: { width: 36, textAlign: 'center', fontSize: 8, color: C.muted },
  payAmount: { width: 70, textAlign: 'right', fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.dark },

  // Cover letter
  coverLetterText: { fontSize: 9, lineHeight: 1.8, color: C.text, marginBottom: 20 },

  // Footer
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { color: 'rgba(0,0,0,0.25)', fontSize: 7 },

  // Info grid
  infoGrid: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  infoCard: { flex: 1, backgroundColor: C.offWhite, padding: 10, borderRadius: 4, border: `0.5 solid ${C.border}` },
  infoLabel: { fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  infoValue: { fontSize: 9, color: C.dark, fontFamily: 'Helvetica-Bold' },

  // Spec summary
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  specCard: { width: '47%', backgroundColor: C.offWhite, padding: 12, borderRadius: 4, border: `0.5 solid ${C.border}` },
  specCardFull: { width: '100%', backgroundColor: C.offWhite, padding: 12, borderRadius: 4, border: `0.5 solid ${C.border}` },
  specLabel: { fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  specValue: { fontSize: 10, color: C.dark, fontFamily: 'Helvetica-Bold' },
  specSub: { fontSize: 7.5, color: C.muted, marginTop: 2 },

  // Guarantee banner
  guaranteeBanner: { flexDirection: 'row', backgroundColor: C.dark, padding: 14, borderRadius: 4, marginTop: 16, alignItems: 'center', gap: 14 },
  guaranteeText: { flex: 1, color: 'rgba(255,255,255,0.7)', fontSize: 8, lineHeight: 1.6 },
  guaranteeBadge: { backgroundColor: C.green, padding: 8, borderRadius: 4, minWidth: 60, alignItems: 'center' },
  guaranteeBadgeNum: { color: C.white, fontSize: 18, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  guaranteeBadgeSub: { color: 'rgba(255,255,255,0.8)', fontSize: 6.5, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Elevation drawings
  elevationPage: { padding: 40, paddingTop: 36, paddingBottom: 52 },
  elevationRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  elevationBox: { flex: 1, border: `0.5 solid ${C.border}`, borderRadius: 4, overflow: 'hidden' },
  elevationImg: { width: '100%' },
  elevationCaption: { backgroundColor: C.light, paddingHorizontal: 8, paddingVertical: 4, borderTop: `0.5 solid ${C.border}` },
  elevationCaptionText: { fontSize: 7.5, color: C.muted, textAlign: 'center' },
  elevationLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.dark, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(pence: number) {
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtK(pence: number) {
  if (pence >= 100000) return `£${(pence / 100000).toFixed(1)}k`
  return fmt(pence)
}

function svgToDataUri(svgString: string): string {
  const b64 = Buffer.from(svgString, 'utf-8').toString('base64')
  return `data:image/svg+xml;base64,${b64}`
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PDFLineItem {
  id: string
  name: string
  description: string | null
  quantity: number
  unit: string
  unit_price_pence: number
  line_total_pence: number
  is_optional: boolean
  is_included: boolean
}

export interface PDFSection {
  id: string
  title: string
  show_subtotal: boolean
  quote_line_items: PDFLineItem[]
}

export interface PDFPaymentMilestone {
  milestone: string
  label: string
  amount_pence: number
  percentage: number | null
  due_trigger: string
}

export interface PDFElevationAsset {
  id: string
  elevation_face: string
  svg_data: string
  caption: string | null
}

export interface PDFTCClause {
  title: string
  body: string
}

export interface PDFSpecSummary {
  dimensions?: string      // e.g. "4.4m × 3.0m"
  sqm?: string             // e.g. "13.2m²"
  roofType?: string
  cladding?: string
  doorsCount?: number
  windowsCount?: number
  hasCal?: boolean
  buildDate?: string
  planningType?: string
}

export interface QuotePDFData {
  quoteRef: string
  versionNumber: number
  customerName: string
  customerEmail: string | null
  siteAddress: string | null
  totalPence: number
  coverLetter: string | null
  sections: PDFSection[]
  paymentSchedule: PDFPaymentMilestone[]
  preparedDate: string
  validDays?: number
  buildDate?: string | null
  expiresAt?: string | null
  elevationAssets?: PDFElevationAsset[]
  tcClauses?: PDFTCClause[] | null
  specSummary?: PDFSpecSummary | null
}

const DEFAULT_TC_CLAUSES: PDFTCClause[] = [
  { title: '1. Acceptance', body: 'Acceptance of this quotation is confirmed by payment of the deposit. By paying the deposit, the client agrees to the full terms and conditions of The Green Rooms Ltd.' },
  { title: '2. Design & Specification', body: 'All designs and specifications remain the intellectual property of The Green Rooms Ltd until full payment is received. Changes to the agreed specification may result in additional costs.' },
  { title: '3. Planning Permission', body: 'It is the responsibility of the client to obtain any planning permission required. The Green Rooms Ltd can advise but cannot be held liable for planning refusals.' },
  { title: '4. Site Access & Ground Conditions', body: 'The client is responsible for ensuring adequate site access for delivery vehicles and materials. Additional charges may apply where access is restricted or ground conditions require additional preparation.' },
  { title: '5. Timescales', body: 'Build dates are agreed at the time of booking and are subject to weather conditions and material availability. The Green Rooms Ltd will communicate any delays as soon as reasonably possible.' },
  { title: '6. Guarantee', body: "All structural work is guaranteed for 10 years. Electrical work is certified to current Part P regulations. Window and door units carry the manufacturer's guarantee." },
  { title: '7. Payment', body: 'Payments are due as per the payment schedule in this proposal. Late payment may result in suspension of work and interest charges.' },
  { title: '8. Variations', body: 'Any variations to the agreed specification must be confirmed in writing. All variations are subject to additional costs and may affect the build schedule.' },
]

// ─── Page footer ─────────────────────────────────────────────────────────────
function PageFooter({ quoteRef }: { quoteRef: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>The Green Rooms · Lyne Lane, Lyne, Surrey KT16 0AN · 01932 640242 · thegreenrooms.com</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={s.footerText}>{quoteRef}</Text>
        <Text style={{ ...s.footerText, color: 'rgba(0,0,0,0.35)' }}
          render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}`}
        />
      </View>
    </View>
  )
}

// ─── Body page header ─────────────────────────────────────────────────────────
function BodyHeader({ quoteRef, logoUrl }: { quoteRef: string; logoUrl?: string }) {
  return (
    <View style={s.pageHeader} fixed>
      <View style={s.pageHeaderLeft}>
        {logoUrl && <Image src={logoUrl} style={s.pageHeaderLogo} />}
        {!logoUrl && <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.green }}>The Green Rooms</Text>}
      </View>
      <Text style={s.pageHeaderRef}>{quoteRef}</Text>
    </View>
  )
}

// ─── Cover page ───────────────────────────────────────────────────────────────
function CoverPage({ data, logoUrl }: { data: QuotePDFData; logoUrl?: string }) {
  const net = Math.round(data.totalPence / 1.2)
  const vat = data.totalPence - net

  return (
    <Page size="A4" style={s.coverPage}>
      {/* Top: logo + tagline */}
      <View style={s.coverTop}>
        {logoUrl
          ? <Image src={logoUrl} style={s.coverLogo} />
          : <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 22, color: C.green }}>The Green Rooms</Text>
        }
        <Text style={s.coverTagline}>Bespoke Garden Rooms · Surrey</Text>
        <View style={s.coverDivider} />
      </View>

      {/* Mid: project title */}
      <View style={s.coverMid}>
        <Text style={s.coverRef}>Proposal · {data.quoteRef}</Text>
        <Text style={s.coverTitle}>Garden Room{'\n'}Proposal</Text>
        <Text style={s.coverSubtitle}>{data.customerName}</Text>
        {data.siteAddress && (
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8.5, marginTop: 6 }}>{data.siteAddress}</Text>
        )}
        {data.specSummary?.dimensions && (
          <Text style={{ color: C.green, fontSize: 10, marginTop: 12, fontFamily: 'Helvetica-Bold' }}>
            {data.specSummary.dimensions}{data.specSummary.sqm ? ` · ${data.specSummary.sqm}` : ''}
          </Text>
        )}
      </View>

      {/* Bottom: price + details */}
      <View style={s.coverBottom}>
        <View>
          <Text style={s.coverDetailLabel}>Prepared</Text>
          <Text style={s.coverDetail}>{data.preparedDate}</Text>
          <Text style={{ ...s.coverDetailLabel, marginTop: 10 }}>Version</Text>
          <Text style={s.coverDetail}>v{data.versionNumber}</Text>
          {data.buildDate && (
            <>
              <Text style={{ ...s.coverDetailLabel, marginTop: 10 }}>Estimated build</Text>
              <Text style={s.coverDetail}>{data.buildDate}</Text>
            </>
          )}
          {data.validDays && (
            <>
              <Text style={{ ...s.coverDetailLabel, marginTop: 10 }}>Valid for</Text>
              <Text style={s.coverDetail}>{data.validDays} days</Text>
            </>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.coverPriceLabel}>Total price</Text>
          <Text style={s.coverPrice}>{fmtK(data.totalPence)}</Text>
          <Text style={s.coverIncVat}>inc. VAT</Text>
          <Text style={{ ...s.coverDetail, marginTop: 8, textAlign: 'right' }}>
            Net {fmt(net)}{'\n'}VAT {fmt(vat)}
          </Text>
        </View>
      </View>
    </Page>
  )
}

// ─── Project spec summary page ────────────────────────────────────────────────
function SpecSummaryPage({ data, logoUrl }: { data: QuotePDFData; logoUrl?: string }) {
  const spec = data.specSummary
  const glazingItems = data.sections
    .find(s => s.title === 'Glazing')
    ?.quote_line_items.filter(i => !i.is_optional || i.is_included) ?? []
  const doorItems = glazingItems.filter(i => i.name.toLowerCase().includes('door') || i.name.toLowerCase().includes('french') || i.name.toLowerCase().includes('bifold') || i.name.toLowerCase().includes('sliding') || i.name.toLowerCase().includes('crittall'))
  const winItems  = glazingItems.filter(i => !doorItems.includes(i))

  const electricalSection = data.sections.find(s => s.title === 'Electrical')
  const electricalItems = electricalSection?.quote_line_items.filter(i => !i.is_optional || i.is_included) ?? []

  const roofLabel = spec?.roofType === 'dual_pitched' ? 'Dual pitched'
    : spec?.roofType === 'dual_extended' ? 'Dual pitched extended (4m)'
    : spec?.roofType === 'single_ext' ? 'Single pitch extended'
    : 'Flat'

  return (
    <Page size="A4" style={s.page}>
      <View style={s.body}>
        <BodyHeader quoteRef={data.quoteRef} logoUrl={logoUrl} />
        <Text style={{ ...s.sectionTitle, marginTop: 0 }}>Your Garden Room at a Glance</Text>
        <View style={s.sectionTitleBar} />

        <View style={s.specGrid}>
          {spec?.dimensions && (
            <View style={s.specCard}>
              <Text style={s.specLabel}>Dimensions</Text>
              <Text style={s.specValue}>{spec.dimensions}</Text>
              {spec.sqm && <Text style={s.specSub}>{spec.sqm} internal floor area</Text>}
            </View>
          )}
          <View style={s.specCard}>
            <Text style={s.specLabel}>Roof type</Text>
            <Text style={s.specValue}>{roofLabel}</Text>
            <Text style={s.specSub}>EPDM rubber membrane or felt</Text>
          </View>
          {spec?.cladding && (
            <View style={s.specCard}>
              <Text style={s.specLabel}>Cladding</Text>
              <Text style={s.specValue}>{spec.cladding}</Text>
              <Text style={s.specSub}>Treated & finished</Text>
            </View>
          )}
          <View style={s.specCard}>
            <Text style={s.specLabel}>Structure</Text>
            <Text style={s.specValue}>Timber frame</Text>
            <Text style={s.specSub}>Ground screws · fully insulated</Text>
          </View>
          {spec?.planningType && (
            <View style={s.specCard}>
              <Text style={s.specLabel}>Planning</Text>
              <Text style={s.specValue}>
                {spec.planningType === 'permitted_development' ? 'Permitted Development'
                  : spec.planningType === 'full_planning' ? 'Full Planning Required'
                  : 'TBC'}
              </Text>
            </View>
          )}
          {data.buildDate && (
            <View style={s.specCard}>
              <Text style={s.specLabel}>Estimated build start</Text>
              <Text style={s.specValue}>{data.buildDate}</Text>
            </View>
          )}
        </View>

        {/* Glazing summary */}
        {(doorItems.length > 0 || winItems.length > 0) && (
          <>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.dark, marginBottom: 6, marginTop: 4 }}>Glazing</Text>
            <View style={{ border: `0.5 solid ${C.border}`, borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
              {doorItems.map((item, i) => (
                <View key={item.id} style={{ flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 6, borderBottom: `0.5 solid ${C.border}`, backgroundColor: i % 2 === 1 ? C.offWhite : C.white }}>
                  <Text style={{ flex: 1, fontSize: 8.5, color: C.dark, fontFamily: 'Helvetica-Bold' }}>{item.name}</Text>
                  {item.description && <Text style={{ fontSize: 7.5, color: C.muted }}>{item.description}</Text>}
                </View>
              ))}
              {winItems.map((item, i) => (
                <View key={item.id} style={{ flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 6, borderBottom: i < winItems.length - 1 ? `0.5 solid ${C.border}` : undefined, backgroundColor: (i + doorItems.length) % 2 === 1 ? C.offWhite : C.white }}>
                  <Text style={{ flex: 1, fontSize: 8.5, color: C.dark }}>{item.name}</Text>
                  {item.description && <Text style={{ fontSize: 7.5, color: C.muted }}>{item.description}</Text>}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Electrical summary */}
        {electricalItems.length > 0 && (
          <>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.dark, marginBottom: 6 }}>Electrical</Text>
            <View style={{ border: `0.5 solid ${C.border}`, borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
              {electricalItems.map((item, i) => (
                <View key={item.id} style={{ paddingHorizontal: 10, paddingVertical: 6, borderBottom: i < electricalItems.length - 1 ? `0.5 solid ${C.border}` : undefined, backgroundColor: i % 2 === 1 ? C.offWhite : C.white }}>
                  <Text style={{ fontSize: 8.5, color: C.dark }}>{item.name}</Text>
                  {item.description && <Text style={{ fontSize: 7.5, color: C.muted, marginTop: 1 }}>{item.description}</Text>}
                </View>
              ))}
            </View>
          </>
        )}

        {/* What's included banner */}
        <View style={{ backgroundColor: C.light, border: `0.5 solid ${C.border}`, borderRadius: 4, padding: 12, marginTop: 4 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: C.dark, marginBottom: 6 }}>Every build includes</Text>
          <Text style={{ fontSize: 8, color: C.muted, lineHeight: 1.7 }}>
            {`· Ground screw foundations — no concrete, minimal disruption, fully removable\n`}
            {`· Fully insulated walls, roof and floor to modern building standards\n`}
            {`· Plastered and decorated interior, ready to furnish\n`}
            {`· EPDM or felt roof with 20-year manufacturer's warranty\n`}
            {`· All structural work guaranteed for 10 years`}
          </Text>
        </View>
      </View>
      <PageFooter quoteRef={data.quoteRef} />
    </Page>
  )
}

// ─── Elevation drawings page ─────────────────────────────────────────────────
function ElevationsPage({ data, logoUrl }: { data: QuotePDFData; logoUrl?: string }) {
  const assets = data.elevationAssets ?? []
  if (!assets.length) return null

  const faceLabel: Record<string, string> = {
    front: 'Front Elevation',
    rear: 'Rear Elevation',
    left: 'Left Elevation',
    right: 'Right Elevation',
  }

  // Pair assets into rows of 2
  const rows: PDFElevationAsset[][] = []
  for (let i = 0; i < assets.length; i += 2) {
    rows.push(assets.slice(i, i + 2))
  }

  return (
    <Page size="A4" style={s.page}>
      <View style={s.body}>
        <BodyHeader quoteRef={data.quoteRef} logoUrl={logoUrl} />
        <Text style={{ ...s.sectionTitle, marginTop: 0 }}>Elevation Drawings</Text>
        <View style={s.sectionTitleBar} />
        <Text style={{ fontSize: 8.5, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
          The following elevation drawings show the proposed garden room from each face.
          All dimensions and specifications are as agreed at the time of quoting.
        </Text>

        {rows.map((row, ri) => (
          <View key={ri} style={s.elevationRow}>
            {row.map(asset => (
              <View key={asset.id} style={s.elevationBox}>
                <Image
                  src={svgToDataUri(asset.svg_data)}
                  style={s.elevationImg}
                />
                <View style={s.elevationCaption}>
                  <Text style={s.elevationLabel}>{faceLabel[asset.elevation_face] ?? asset.elevation_face}</Text>
                  {asset.caption && <Text style={s.elevationCaptionText}>{asset.caption}</Text>}
                </View>
              </View>
            ))}
            {/* Pad to 2 columns if odd */}
            {row.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        ))}
      </View>
      <PageFooter quoteRef={data.quoteRef} />
    </Page>
  )
}

// ─── Intro / cover letter page ────────────────────────────────────────────────
function IntroPage({ data, logoUrl }: { data: QuotePDFData; logoUrl?: string }) {
  if (!data.coverLetter) return null
  return (
    <Page size="A4" style={s.page}>
      <View style={s.body}>
        <BodyHeader quoteRef={data.quoteRef} logoUrl={logoUrl} />
        <Text style={{ ...s.sectionTitle, marginTop: 0 }}>Introduction</Text>
        <View style={s.sectionTitleBar} />
        <Text style={s.coverLetterText}>{data.coverLetter}</Text>

        {/* Summary info grid */}
        <View style={s.infoGrid}>
          <View style={s.infoCard}>
            <Text style={s.infoLabel}>Prepared for</Text>
            <Text style={s.infoValue}>{data.customerName}</Text>
            {data.customerEmail && <Text style={{ fontSize: 7.5, color: C.muted, marginTop: 2 }}>{data.customerEmail}</Text>}
          </View>
          <View style={s.infoCard}>
            <Text style={s.infoLabel}>Site address</Text>
            <Text style={s.infoValue}>{data.siteAddress ?? 'To be confirmed'}</Text>
          </View>
          <View style={s.infoCard}>
            <Text style={s.infoLabel}>Quote reference</Text>
            <Text style={s.infoValue}>{data.quoteRef}</Text>
            <Text style={{ fontSize: 7.5, color: C.muted, marginTop: 2 }}>Prepared {data.preparedDate}</Text>
          </View>
        </View>
      </View>
      <PageFooter quoteRef={data.quoteRef} />
    </Page>
  )
}

// ─── Specification (line items) pages ─────────────────────────────────────────
function SpecPage({ data, logoUrl }: { data: QuotePDFData; logoUrl?: string }) {
  const visibleSections = data.sections.filter(sec =>
    sec.quote_line_items.some(i => !i.is_optional || i.is_included)
  )

  return (
    <Page size="A4" style={s.page}>
      <View style={s.body}>
        <BodyHeader quoteRef={data.quoteRef} logoUrl={logoUrl} />
        <Text style={{ ...s.sectionTitle, marginTop: 0 }}>Specification & Pricing</Text>
        <View style={s.sectionTitleBar} />

        {/* Table header */}
        <View style={s.tableHeader}>
          <View style={s.colDesc}><Text style={s.tableHeaderText}>Description</Text></View>
          <View style={s.colQty}><Text style={s.tableHeaderText}>Qty</Text></View>
          <View style={s.colUnit}><Text style={s.tableHeaderText}>Unit</Text></View>
          <View style={s.colPrice}><Text style={s.tableHeaderText}>Unit price</Text></View>
          <View style={s.colTotal}><Text style={s.tableHeaderText}>Total</Text></View>
        </View>

        {visibleSections.map(section => {
          const visibleItems = section.quote_line_items.filter(i => !i.is_optional || i.is_included)
          if (!visibleItems.length) return null
          const subtotal = visibleItems.reduce((sum, i) => sum + i.line_total_pence, 0)

          return (
            <View key={section.id} wrap={false}>
              <View style={{ backgroundColor: C.light, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.green, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {section.title}
                </Text>
              </View>

              {visibleItems.map((item, idx) => (
                <View key={item.id} style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}>
                  <View style={s.colDesc}>
                    <Text style={s.tableItemName}>{item.name}</Text>
                    {item.description && <Text style={s.tableItemDesc}>{item.description}</Text>}
                    {item.is_optional && <Text style={s.tableItemOptional}>Optional</Text>}
                  </View>
                  <View style={s.colQty}>
                    <Text style={s.tableNumber}>{item.quantity % 1 === 0 ? item.quantity.toString() : item.quantity.toFixed(2)}</Text>
                  </View>
                  <View style={s.colUnit}>
                    <Text style={{ ...s.tableNumber, color: C.muted }}>{item.unit === 'm2' ? 'm²' : item.unit === 'linear_m' ? 'lin.m' : item.unit}</Text>
                  </View>
                  <View style={s.colPrice}>
                    <Text style={s.tableNumber}>{fmt(item.unit_price_pence)}</Text>
                  </View>
                  <View style={s.colTotal}>
                    <Text style={{ ...s.tableNumber, fontFamily: 'Helvetica-Bold' }}>{fmt(item.line_total_pence)}</Text>
                  </View>
                </View>
              ))}

              {section.show_subtotal && (
                <View style={s.tableSubtotal}>
                  <Text style={s.tableSubtotalLabel}>{section.title} subtotal</Text>
                  <Text style={s.tableSubtotalAmount}>{fmt(subtotal)}</Text>
                </View>
              )}
            </View>
          )
        })}

        {/* Total box */}
        <View style={s.totalBox} wrap={false}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Net amount (ex. VAT)</Text>
            <Text style={s.totalValue}>{fmt(Math.round(data.totalPence / 1.2))}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>VAT @ 20%</Text>
            <Text style={s.totalValue}>{fmt(data.totalPence - Math.round(data.totalPence / 1.2))}</Text>
          </View>
          <View style={s.totalGrandRow}>
            <Text style={s.totalGrandLabel}>Total (inc. VAT)</Text>
            <Text style={s.totalGrandValue}>{fmt(data.totalPence)}</Text>
          </View>
        </View>
      </View>
      <PageFooter quoteRef={data.quoteRef} />
    </Page>
  )
}

// ─── Payment schedule page ─────────────────────────────────────────────────────
function PaymentPage({ data, logoUrl }: { data: QuotePDFData; logoUrl?: string }) {
  if (!data.paymentSchedule.length) return null

  return (
    <Page size="A4" style={s.page}>
      <View style={s.body}>
        <BodyHeader quoteRef={data.quoteRef} logoUrl={logoUrl} />
        <Text style={{ ...s.sectionTitle, marginTop: 0 }}>Payment Schedule</Text>
        <View style={s.sectionTitleBar} />

        <Text style={{ fontSize: 8.5, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
          The following payment schedule applies to this project. Each payment is due at the stated milestone.
          Invoices will be raised and sent electronically at each stage.
        </Text>

        <View style={{ ...s.tableHeader, borderRadius: 0 }}>
          <View style={{ flex: 1 }}><Text style={s.tableHeaderText}>Milestone</Text></View>
          <View style={{ width: 50, textAlign: 'center' }}><Text style={s.tableHeaderText}>%</Text></View>
          <View style={{ width: 80, textAlign: 'right' }}><Text style={s.tableHeaderText}>Amount</Text></View>
        </View>

        {data.paymentSchedule.map((m, i) => {
          const amount = data.totalPence > 0 && m.percentage
            ? Math.round(data.totalPence * m.percentage / 100)
            : m.amount_pence
          return (
            <View key={i} style={[s.payRow, i % 2 === 1 ? { backgroundColor: C.offWhite } : {}]}>
              <View style={s.payMilestone}>
                <Text style={s.payLabel}>{m.label}</Text>
                <Text style={s.payTrigger}>{m.due_trigger.replace(/_/g, ' ')}</Text>
              </View>
              <View style={{ width: 50 }}>
                <Text style={{ textAlign: 'center', fontSize: 8, color: C.muted }}>{m.percentage ?? '—'}%</Text>
              </View>
              <View style={{ width: 80 }}>
                <Text style={{ textAlign: 'right', fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.dark }}>{fmt(amount)}</Text>
              </View>
            </View>
          )
        })}

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 8, paddingHorizontal: 10, borderTop: `1 solid ${C.border}`, marginTop: 4 }}>
          <Text style={{ fontSize: 9, color: C.muted, marginRight: 10 }}>Total</Text>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.green, width: 80, textAlign: 'right' }}>{fmt(data.totalPence)}</Text>
        </View>

        <View style={{ marginTop: 24, backgroundColor: C.light, padding: 12, borderRadius: 4, border: `0.5 solid ${C.border}` }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: C.dark, marginBottom: 6 }}>Important Notes</Text>
          <Text style={{ fontSize: 8, color: C.muted, lineHeight: 1.7 }}>
            {`· All payments are due within 7 days of the invoice date.\n`}
            {`· Payment can be made by bank transfer to The Green Rooms Ltd.\n`}
            {`· The deposit payment confirms your booking and secures your build slot.\n`}
            {data.validDays ? `· This quote is valid for ${data.validDays} days from the date of issue.\n` : ''}
            {`· Prices are subject to change if specifications are amended after acceptance.`}
          </Text>
        </View>
      </View>
      <PageFooter quoteRef={data.quoteRef} />
    </Page>
  )
}

// ─── T&Cs summary page ────────────────────────────────────────────────────────
function TCsPage({ data, logoUrl }: { data: QuotePDFData; logoUrl?: string }) {
  const clauses = data.tcClauses?.length ? data.tcClauses : DEFAULT_TC_CLAUSES

  return (
    <Page size="A4" style={s.page}>
      <View style={s.body}>
        <BodyHeader quoteRef={data.quoteRef} logoUrl={logoUrl} />
        <Text style={{ ...s.sectionTitle, marginTop: 0 }}>Terms & Conditions Summary</Text>
        <View style={s.sectionTitleBar} />

        {clauses.map(({ title, body }) => (
          <View key={title} style={{ marginBottom: 10 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: C.dark, marginBottom: 2 }}>{title}</Text>
            <Text style={{ fontSize: 8, color: C.muted, lineHeight: 1.6 }}>{body}</Text>
          </View>
        ))}

        {/* Guarantee banner */}
        <View style={s.guaranteeBanner}>
          <View style={s.guaranteeBadge}>
            <Text style={s.guaranteeBadgeNum}>10</Text>
            <Text style={s.guaranteeBadgeSub}>Year{'\n'}Guarantee</Text>
          </View>
          <Text style={s.guaranteeText}>
            {`All structural work carried out by The Green Rooms Ltd is covered by a 10-year structural guarantee. `}
            {`Our electrical installations are certified to current Part P Building Regulations. `}
            {`We are fully insured and all work is carried out by qualified tradespeople.`}
          </Text>
        </View>

        <View style={{ marginTop: 14, backgroundColor: C.light, padding: 12, borderRadius: 4, border: `0.5 solid ${C.border}` }}>
          <Text style={{ fontSize: 8, color: 'rgba(0,0,0,0.4)', lineHeight: 1.7 }}>
            Full terms and conditions are available on request and at thegreenrooms.com/terms.
            The Green Rooms Ltd is registered in England and Wales. All work is carried out by qualified tradespeople in accordance with current building regulations.
          </Text>
        </View>
      </View>
      <PageFooter quoteRef={data.quoteRef} />
    </Page>
  )
}

// ─── Main document ────────────────────────────────────────────────────────────
export function QuotePDFDocument({ data, logoUrl }: { data: QuotePDFData; logoUrl?: string }) {
  const hasElevations = (data.elevationAssets?.length ?? 0) > 0

  return (
    <Document
      title={`${data.quoteRef} — ${data.customerName}`}
      author="The Green Rooms"
      subject="Garden Room Proposal"
      creator="The Green Rooms CRM"
    >
      <CoverPage data={data} logoUrl={logoUrl} />
      {data.coverLetter && <IntroPage data={data} logoUrl={logoUrl} />}
      <SpecSummaryPage data={data} logoUrl={logoUrl} />
      {hasElevations && <ElevationsPage data={data} logoUrl={logoUrl} />}
      <SpecPage data={data} logoUrl={logoUrl} />
      <PaymentPage data={data} logoUrl={logoUrl} />
      <TCsPage data={data} logoUrl={logoUrl} />
    </Document>
  )
}
