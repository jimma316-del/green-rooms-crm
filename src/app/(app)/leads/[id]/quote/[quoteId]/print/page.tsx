import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SiteAssessment, LeadQuote } from '@/types/assessment'
import { CLADDING_LABELS, tierTotal, poundStr } from '@/types/assessment'

interface Props { params: Promise<{ id: string; quoteId: string }> }

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function PrintPage({ params }: Props) {
  const { id, quoteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any
  const [{ data: lead }, { data: assessment }, { data: quote }] = await Promise.all([
    admin.from('leads').select('*').eq('id', id).single(),
    adminAny.from('site_assessments').select('*').eq('lead_id', id).single(),
    adminAny.from('lead_quotes').select('*').eq('id', quoteId).eq('lead_id', id).single(),
  ])

  if (!lead || !quote) notFound()

  const q = quote as LeadQuote
  const a = assessment as SiteAssessment | null
  const includedTiers = q.tiers.filter(t => t.included)
  const firstName = (lead.name as string).split(' ')[0]
  const monthYear = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{lead.name} — Garden Room Proposal</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; background: white; }

          .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0; position: relative; page-break-after: always; }

          /* Cover */
          .cover { background: #1a2e1a; color: white; min-height: 297mm; display: flex; flex-direction: column; padding: 0; }
          .cover-inner { padding: 60px 56px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
          .cover-logo { font-size: 13px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #9db89d; margin-bottom: auto; }
          .cover-title { margin-top: auto; }
          .cover-title h1 { font-size: 44px; font-weight: 700; line-height: 1.1; margin-bottom: 16px; }
          .cover-title h1 span { color: #7fbf7f; }
          .cover-title p { font-size: 16px; color: #9db89d; }
          .cover-footer { padding: 32px 56px; border-top: 1px solid #2d4a2d; font-size: 12px; color: #6b8c6b; display: flex; justify-content: space-between; }
          .cover-bar { height: 6px; background: linear-gradient(to right, #4a7c4a, #7fbf7f, #4a7c4a); }

          /* Content pages */
          .content-page { padding: 48px 56px; min-height: 297mm; }
          .section-label { font-size: 10px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #7fbf7f; margin-bottom: 8px; }
          .page-title { font-size: 28px; font-weight: 700; color: #1a1a1a; margin-bottom: 32px; line-height: 1.2; }

          /* Welcome letter */
          .letter-body { font-size: 14px; line-height: 1.8; color: #333; white-space: pre-wrap; }
          .letter-sig { margin-top: 32px; }
          .letter-sig .name { font-weight: 700; font-size: 15px; margin-bottom: 2px; }
          .letter-sig .title { font-size: 13px; color: #666; }

          /* Spec table */
          .spec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
          .spec-row { display: contents; }
          .spec-label { background: #f8f8f8; padding: 10px 14px; font-size: 12px; font-weight: 500; color: #666; border-bottom: 1px solid #e5e5e5; }
          .spec-value { background: white; padding: 10px 14px; font-size: 12px; color: #1a1a1a; font-weight: 600; border-bottom: 1px solid #e5e5e5; }

          /* Quote */
          .tier-heading { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
          .tier-sub { font-size: 13px; color: #666; margin-bottom: 20px; }

          .line-items { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          .line-items th { text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888; border-bottom: 2px solid #e5e5e5; }
          .line-items th:last-child { text-align: right; }
          .line-items td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
          .line-items td:last-child { text-align: right; font-family: 'Courier New', monospace; font-size: 13px; white-space: nowrap; }
          .line-items .category-row td { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #888; padding: 12px 12px 4px; background: #fafafa; }
          .totals { margin-top: 8px; }
          .total-row { display: flex; justify-content: space-between; padding: 6px 12px; font-size: 13px; color: #555; }
          .total-row.grand { font-size: 18px; font-weight: 700; color: #1a1a1a; padding: 12px; background: #f0f7f0; border-radius: 8px; margin-top: 8px; }
          .total-row .amount { font-family: 'Courier New', monospace; }

          /* Comparison */
          .comparison-grid { display: grid; gap: 16px; margin-bottom: 24px; }
          .comparison-card { border: 2px solid #e5e5e5; border-radius: 12px; overflow: hidden; }
          .comparison-card.best { border-color: #4a7c4a; }
          .comparison-header { padding: 16px 20px; background: #f8f8f8; }
          .comparison-header.best-bg { background: #1a2e1a; color: white; }
          .comparison-name { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
          .comparison-cladding { font-size: 12px; color: #888; }
          .comparison-cladding.best-text { color: #9db89d; }
          .comparison-price { font-size: 28px; font-weight: 700; margin: 12px 0 4px; }
          .comparison-vat { font-size: 11px; color: #888; }

          /* Payment */
          .payment-section { margin-bottom: 28px; }
          .payment-title { font-size: 15px; font-weight: 700; margin-bottom: 12px; color: #1a1a1a; }
          .milestone-list { list-style: none; }
          .milestone-list li { padding: 10px 0; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; font-size: 13px; }
          .milestone-list li:last-child { border-bottom: none; }
          .milestone-amount { font-weight: 700; font-family: monospace; }
          .bank-detail { font-size: 13px; line-height: 2; }
          .bank-detail strong { display: inline-block; width: 120px; color: #555; font-weight: 500; }

          /* Print */
          @media print {
            .no-print { display: none !important; }
            .page { margin: 0; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          @media screen {
            body { background: #888; }
            .page { margin: 24px auto; box-shadow: 0 4px 32px rgba(0,0,0,0.3); }
          }
        `}</style>
      </head>
      <body>
        {/* Print button — screen only */}
        <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, zIndex: 100, display: 'flex', gap: 8 }}>
          <a href={`/leads/${id}/quote/${quoteId}`}
            style={{ padding: '10px 20px', background: 'white', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, cursor: 'pointer', textDecoration: 'none', color: '#333' }}>
            ← Edit Quote
          </a>
          <button onClick={() => window.print()}
            style={{ padding: '10px 20px', background: '#1a2e1a', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            Print / Save PDF
          </button>
        </div>

        {/* PAGE 1: Cover */}
        <div className="page">
          <div className="cover">
            <div className="cover-bar" />
            <div className="cover-inner">
              <div className="cover-logo">The Green Rooms</div>
              <div className="cover-title">
                <p style={{ fontSize: 14, color: '#7fbf7f', marginBottom: 12, fontWeight: 500 }}>
                  Garden Room Proposal
                </p>
                <h1>
                  {firstName}&apos;s<br />
                  <span>Garden Room</span><br />
                  Project
                </h1>
                <p style={{ marginTop: 20 }}>{monthYear}</p>
              </div>
            </div>
            <div className="cover-footer">
              <span>{lead.name as string} · {(lead.postcode as string) ?? ''}</span>
              <span>thegreenrooms.com</span>
            </div>
          </div>
        </div>

        {/* PAGE 2: Welcome letter */}
        <div className="page">
          <div className="content-page">
            <p className="section-label">Welcome</p>
            <h2 className="page-title">A note from James</h2>

            <div className="letter-body">{q.cover_note ?? `Hi ${firstName},\n\nThank you for inviting me to your home. It was great to discuss your project and I look forward to helping you create your perfect garden room.\n\nBest regards,\nJames Austin`}</div>

            <div className="letter-sig">
              <div className="name">James Austin</div>
              <div className="title">Director, The Green Rooms</div>
            </div>
          </div>
        </div>

        {/* PAGE 3: Your Design */}
        {a && (
          <div className="page">
            <div className="content-page">
              <p className="section-label">Your Project</p>
              <h2 className="page-title">Design Specification</h2>

              <div className="spec-grid">
                {a.width_m && a.depth_m && <>
                  <div className="spec-label">Floor Area</div>
                  <div className="spec-value">{a.width_m}m × {a.depth_m}m ({(a.width_m * a.depth_m).toFixed(1)}m²)</div>
                </>}
                {a.height_eaves_m && <>
                  <div className="spec-label">Eaves Height</div>
                  <div className="spec-value">{a.height_eaves_m}m</div>
                </>}
                {a.roof_type && <>
                  <div className="spec-label">Roof</div>
                  <div className="spec-value">{
                    a.roof_type === 'flat' ? 'Flat (EPDM rubber membrane)' :
                    a.roof_type === 'dual_pitched' ? 'Dual pitched (A-frame)' :
                    a.roof_type === 'dual_extended' ? 'Dual pitched extended height' :
                    a.roof_type === 'single_ext' ? 'Single pitch extended height' :
                    a.roof_type.replace(/_/g, ' ')
                  }</div>
                </>}
                {a.has_canopy && <>
                  <div className="spec-label">Canopy</div>
                  <div className="spec-value">Covered outdoor canopy{a.canopy_depth_m ? ` (${a.canopy_depth_m}m depth)` : ''}</div>
                </>}
                {a.doors?.length > 0 && <>
                  <div className="spec-label">Doors</div>
                  <div className="spec-value">
                    {a.doors.map(d => `${d.key.replace(/_/g, ' ')} — ${d.colour} (${d.position})`).join('; ')}
                  </div>
                </>}
                {a.windows?.length > 0 && <>
                  <div className="spec-label">Windows</div>
                  <div className="spec-value">
                    {a.windows.map(w => `${w.count > 1 ? `${w.count}× ` : ''}${w.width_mm}×${w.height_mm}mm ${w.type.replace(/_/g,' ')} (${w.position})${w.glazing !== 'double' ? ` ${w.glazing} glazed` : ''}`).join(', ')}
                  </div>
                </>}
                {(a.downlight_count > 0 || a.double_socket_count > 0) && <>
                  <div className="spec-label">Electrics</div>
                  <div className="spec-value">
                    {[
                      a.downlight_count > 0 ? `${a.downlight_count} LED downlights` : null,
                      a.double_socket_count > 0 ? `${a.double_socket_count} double sockets` : null,
                      a.usb_socket_count > 0 ? `${a.usb_socket_count} USB sockets` : null,
                      a.electricals?.includes('cat6') ? 'WiFi via Cat6a' : null,
                      a.climate === 'ac_2_5kw' ? 'Air con 2.5kW' : a.climate === 'ac_5kw' ? 'Air con 5kW' : null,
                      a.climate === 'wall_heater' ? 'Electric panel heater' : null,
                    ].filter(Boolean).join(', ')}
                  </div>
                </>}
                {a.has_decking && <>
                  <div className="spec-label">Decking</div>
                  <div className="spec-value">Composite decking{a.deck_w && a.deck_d ? ` approx ${(a.deck_w * a.deck_d).toFixed(1)}m²` : ''}</div>
                </>}
              </div>

              <div style={{ marginTop: 24, padding: '16px 20px', background: '#f0f7f0', borderRadius: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4a7c4a', marginBottom: 8 }}>
                  Included as Standard
                </p>
                <ul style={{ fontSize: 12, color: '#333', lineHeight: 2, columns: 2, columnGap: 24, listStyleType: 'none' }}>
                  {['SIPS structural insulated panel construction', 'Concrete ground screws (no groundworks)', 'EPDM rubber roof membrane', '150mm insulated floor', 'Plastered and decorated interior', 'Double-glazed aluminium frames', 'Electrical installation certificate', 'Full project management', 'All waste removal included', '10-year structural guarantee'].map(item => (
                    <li key={item} style={{ paddingLeft: 16, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: '#4a7c4a' }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* PAGE(S): Quote — comparison view if multiple tiers */}
        {includedTiers.length > 1 ? (
          <div className="page">
            <div className="content-page">
              <p className="section-label">Your Options</p>
              <h2 className="page-title">Choose Your Package</h2>

              <div className="comparison-grid" style={{ gridTemplateColumns: `repeat(${includedTiers.length}, 1fr)` }}>
                {includedTiers.map((tier, i) => {
                  const { exVat, vat, incVat } = tierTotal(tier.line_items)
                  const isBest = i === includedTiers.length - 1
                  return (
                    <div key={tier.key} className={`comparison-card${isBest ? ' best' : ''}`}>
                      <div className={`comparison-header${isBest ? ' best-bg' : ''}`}>
                        <div className={`comparison-name${isBest ? '' : ''}`}>{tier.label}</div>
                        <div className={`comparison-cladding${isBest ? ' best-text' : ''}`}>
                          {CLADDING_LABELS[tier.cladding] ?? tier.cladding}
                        </div>
                        <div className="comparison-price" style={isBest ? { color: '#7fbf7f' } : {}}>
                          {poundStr(incVat)}
                        </div>
                        <div className="comparison-vat" style={isBest ? { color: '#9db89d' } : {}}>
                          inc VAT &nbsp;·&nbsp; ex VAT {poundStr(exVat)}
                        </div>
                      </div>
                      <div style={{ padding: '12px 20px' }}>
                        {tier.line_items.map(li => (
                          <div key={li.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 11, borderBottom: '1px solid #f0f0f0', color: '#444' }}>
                            <span>{li.description}</span>
                            <span style={{ fontFamily: 'monospace', marginLeft: 8, whiteSpace: 'nowrap' }}>{poundStr(li.amount_pence)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              <p style={{ fontSize: 11, color: '#888', textAlign: 'center', marginTop: 16 }}>
                All prices include 20% VAT. Ground screws included (no concrete, no groundworks).
              </p>
            </div>
          </div>
        ) : includedTiers.map(tier => {
          const { exVat, vat, incVat } = tierTotal(tier.line_items)
          const byCategory: Record<string, typeof tier.line_items> = {}
          for (const li of tier.line_items) {
            ;(byCategory[li.category] = byCategory[li.category] ?? []).push(li)
          }
          const catLabels: Record<string, string> = { room: 'Garden Room', electrics: 'Electrics & Power', decking: 'Decking', extras: 'Additional Items', other: 'Other' }
          return (
            <div key={tier.key} className="page">
              <div className="content-page">
                <p className="section-label">Pricing</p>
                <h2 className="page-title">{tier.label}</h2>
                {tier.cladding && (
                  <p className="tier-sub">{CLADDING_LABELS[tier.cladding] ?? tier.cladding} cladding</p>
                )}

                <table className="line-items">
                  <thead>
                    <tr>
                      <th style={{ width: '60%' }}>Description</th>
                      <th>VAT</th>
                      <th>Ex VAT</th>
                      <th>Inc VAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(byCategory).map(([cat, items]) => (
                      <>
                        <tr key={`${cat}-head`} className="category-row">
                          <td colSpan={4}>{catLabels[cat] ?? cat}</td>
                        </tr>
                        {items.map(li => (
                          <tr key={li.id}>
                            <td>{li.description}</td>
                            <td style={{ fontSize: 11, color: '#888' }}>{li.vat ? '20%' : '—'}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{poundStr(li.amount_pence)}</td>
                            <td>{poundStr(li.vat ? Math.round(li.amount_pence * 1.2) : li.amount_pence)}</td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>

                <div className="totals">
                  <div className="total-row">
                    <span>Subtotal (ex VAT)</span>
                    <span className="amount">{poundStr(exVat)}</span>
                  </div>
                  <div className="total-row">
                    <span>VAT at 20%</span>
                    <span className="amount">{poundStr(vat)}</span>
                  </div>
                  <div className="total-row grand">
                    <span>Total (inc VAT)</span>
                    <span className="amount">{poundStr(incVat)}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Payment terms */}
        <div className="page">
          <div className="content-page">
            <p className="section-label">Next Steps</p>
            <h2 className="page-title">Payment Terms</h2>

            <div className="payment-section">
              <p className="payment-title">Deposit</p>
              <p style={{ fontSize: 13, color: '#444', lineHeight: 1.7 }}>
                A deposit of <strong>£500</strong> is required to secure your build slot. This is deducted from the final balance.
              </p>
            </div>

            <div className="payment-section">
              <p className="payment-title">Payment Milestones</p>
              <ul className="milestone-list">
                <li>
                  <span>£500 deposit — on booking</span>
                  <span className="milestone-amount">Secures your slot</span>
                </li>
                <li>
                  <span>First stage payment — on start of build</span>
                  <span className="milestone-amount">Up to £10,000</span>
                </li>
                <li>
                  <span>Second stage payment — at plastering stage</span>
                  <span className="milestone-amount">Up to £20,000</span>
                </li>
                <li>
                  <span>Final balance — on completion</span>
                  <span className="milestone-amount">Remainder</span>
                </li>
              </ul>
              <p style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
                Stage payments only apply to projects over £10,000. Smaller projects are invoiced in full on start of build.
              </p>
            </div>

            {q.earliest_build_date && (
              <div className="payment-section" style={{ background: '#f0f7f0', padding: 16, borderRadius: 10 }}>
                <p className="payment-title" style={{ color: '#1a2e1a' }}>Your Build Slot</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#1a2e1a' }}>
                  Earliest start date: {fmt(q.earliest_build_date)}
                </p>
                <p style={{ fontSize: 12, color: '#4a7c4a', marginTop: 4 }}>
                  Build slots fill quickly — secure yours with a £500 deposit.
                </p>
              </div>
            )}

            <div className="payment-section">
              <p className="payment-title">Bank Details</p>
              <div className="bank-detail">
                <p><strong>Account name</strong>The Green Rooms Ltd</p>
                <p><strong>Sort code</strong>Please contact us for payment details</p>
                <p><strong>Reference</strong>Your surname + postcode</p>
              </div>
            </div>

            <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #e5e5e5' }}>
              <p style={{ fontSize: 12, color: '#666', lineHeight: 1.7 }}>
                This proposal is valid for 30 days from the date issued. Prices are subject to change based on material costs at time of booking.
                Full terms and conditions are available at <strong>thegreenrooms.com/terms</strong>.
              </p>
              <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                Questions? Call James on <strong>01932 640242</strong> or email <strong>hello@thegreenrooms.com</strong>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
