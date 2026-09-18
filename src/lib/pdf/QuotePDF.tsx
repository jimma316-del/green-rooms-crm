// @react-pdf/renderer quote document
// Matches the TGR branded booklet style: dark header, green accent, clean tables

import {
  Document, Page, Text, View, StyleSheet, Image, Font,
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
  body: { padding: 40, paddingTop: 36 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 12, borderBottom: `1 solid ${C.border}` },
  pageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageHeaderLogo: { width: 60, height: 18, objectFit: 'contain' },
  pageHeaderRef: { color: C.muted, fontSize: 7.5 },
  pageHeaderRight: { color: C.muted, fontSize: 7.5 },

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
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(pence: number) {
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtK(pence: number) {
  if (pence >= 100000) return `£${(pence / 100000).toFixed(1)}k`
  return fmt(pence)
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
}

// ─── Page footer ─────────────────────────────────────────────────────────────
function PageFooter({ quoteRef }: { quoteRef: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>The Green Rooms · Lyne Lane, Lyne, Surrey KT16 0AN · 01932 640242 · thegreenrooms.com</Text>
      <Text style={s.footerText}>{quoteRef}</Text>
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
      </View>

      {/* Bottom: price + details */}
      <View style={s.coverBottom}>
        <View>
          <Text style={s.coverDetailLabel}>Prepared</Text>
          <Text style={s.coverDetail}>{data.preparedDate}</Text>
          <Text style={{ ...s.coverDetailLabel, marginTop: 10 }}>Version</Text>
          <Text style={s.coverDetail}>v{data.versionNumber}</Text>
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
  // Filter to sections that have at least one visible item
  const visibleSections = data.sections.filter(s =>
    s.quote_line_items.some(i => !i.is_optional || i.is_included)
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
              {/* Section label row */}
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

        {/* Schedule table header */}
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

        {/* Total */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 8, paddingHorizontal: 10, borderTop: `1 solid ${C.border}`, marginTop: 4 }}>
          <Text style={{ fontSize: 9, color: C.muted, marginRight: 10 }}>Total</Text>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.green, width: 80, textAlign: 'right' }}>{fmt(data.totalPence)}</Text>
        </View>

        {/* Notes */}
        <View style={{ marginTop: 24, backgroundColor: C.light, padding: 12, borderRadius: 4, border: `0.5 solid ${C.border}` }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: C.dark, marginBottom: 6 }}>Important Notes</Text>
          <Text style={{ fontSize: 8, color: C.muted, lineHeight: 1.7 }}>
            {`· All payments are due within 7 days of the invoice date.\n`}
            {`· Payment can be made by bank transfer to The Green Rooms Ltd.\n`}
            {`· The deposit payment confirms your booking and secures your build slot.\n`}
            {`· This quote is valid for 30 days from the date of issue.\n`}
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
  return (
    <Page size="A4" style={s.page}>
      <View style={s.body}>
        <BodyHeader quoteRef={data.quoteRef} logoUrl={logoUrl} />
        <Text style={{ ...s.sectionTitle, marginTop: 0 }}>Terms & Conditions Summary</Text>
        <View style={s.sectionTitleBar} />

        {[
          ['1. Acceptance', 'Acceptance of this quotation is confirmed by payment of the deposit. By paying the deposit, the client agrees to the full terms and conditions of The Green Rooms Ltd.'],
          ['2. Design & Specification', 'All designs and specifications remain the intellectual property of The Green Rooms Ltd until full payment is received. Changes to the agreed specification may result in additional costs.'],
          ['3. Planning Permission', 'It is the responsibility of the client to obtain any planning permission required. The Green Rooms Ltd can advise but cannot be held liable for planning refusals.'],
          ['4. Site Access & Ground Conditions', 'The client is responsible for ensuring adequate site access for delivery vehicles and materials. Additional charges may apply where access is restricted or ground conditions require additional preparation.'],
          ['5. Timescales', 'Build dates are agreed at the time of booking and are subject to weather conditions and material availability. The Green Rooms Ltd will communicate any delays as soon as reasonably possible.'],
          ['6. Guarantee', 'All structural work is guaranteed for 10 years. Electrical work is certified to current Part P regulations. Window and door units carry the manufacturer\'s guarantee.'],
          ['7. Payment', 'Payments are due as per the payment schedule in this proposal. Late payment may result in suspension of work and interest charges.'],
          ['8. Variations', 'Any variations to the agreed specification must be confirmed in writing. All variations are subject to additional costs and may affect the build schedule.'],
        ].map(([title, body]) => (
          <View key={title} style={{ marginBottom: 10 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8.5, color: C.dark, marginBottom: 2 }}>{title}</Text>
            <Text style={{ fontSize: 8, color: C.muted, lineHeight: 1.6 }}>{body}</Text>
          </View>
        ))}

        <View style={{ marginTop: 16, backgroundColor: C.dark, padding: 12, borderRadius: 4 }}>
          <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
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
  return (
    <Document
      title={`${data.quoteRef} — ${data.customerName}`}
      author="The Green Rooms"
      subject="Garden Room Proposal"
      creator="The Green Rooms CRM"
    >
      <CoverPage data={data} logoUrl={logoUrl} />
      {data.coverLetter && <IntroPage data={data} logoUrl={logoUrl} />}
      <SpecPage data={data} logoUrl={logoUrl} />
      <PaymentPage data={data} logoUrl={logoUrl} />
      <TCsPage data={data} logoUrl={logoUrl} />
    </Document>
  )
}
