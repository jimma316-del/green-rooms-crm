'use client'

import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Download, MessageCircle, Send } from 'lucide-react'

interface LineItem {
  id: string; name: string; description: string | null
  quantity: number; unit: string; unit_price_pence: number; line_total_pence: number
  is_optional: boolean; is_included: boolean; sort_order: number
}
interface Section {
  id: string; title: string; sort_order: number; show_subtotal: boolean
  quote_line_items: LineItem[]
}
interface PaymentMilestone {
  id: string; milestone: string; label: string; amount_pence: number
  percentage: number | null; due_trigger: string; paid_at: string | null
}
interface ElevationAsset {
  id: string; elevation_face: string; svg_data: string; caption: string | null
}

interface Props {
  token: string; versionId: string; quoteRef: string; versionNumber: number; status: string
  customerName: string; siteAddress?: string; totalPence: number; coverLetter: string | null
  sections: Section[]; paymentSchedule: PaymentMilestone[]; preparedDate: string
  buildDate?: string | null; elevations?: ElevationAsset[]
}

function fmt(pence: number) {
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function SectionBlock({ section }: { section: Section }) {
  const [open, setOpen] = useState(true)
  const visible = section.quote_line_items.filter(i => !i.is_optional || i.is_included)
  const subtotal = visible.reduce((s, i) => s + i.line_total_pence, 0)
  if (!visible.length) return null

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-left"
      >
        <span className="text-sm font-semibold text-gray-800">{section.title}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">{fmt(subtotal)}</span>
          {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
        </div>
      </button>
      {open && (
        <div>
          {visible.map((item, i) => (
            <div key={item.id} className={`flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                {item.description && <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.description}</div>}
                <div className="text-xs text-gray-400 mt-1">
                  {item.quantity !== 1 ? `${item.quantity} ${item.unit === 'm2' ? 'm²' : item.unit} × ${fmt(item.unit_price_pence)}` : null}
                </div>
              </div>
              <div className="text-sm font-semibold text-gray-900 shrink-0">{fmt(item.line_total_pence)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ElevationPanel({ elevations }: { elevations: ElevationAsset[] }) {
  if (!elevations.length) return null
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Elevation Drawings</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {elevations.map(el => (
          <div key={el.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div
              className="p-4 bg-gray-50"
              // SVG is generated internally, not from user input
              dangerouslySetInnerHTML={{ __html: el.svg_data }}
            />
            <div className="px-3 py-2 border-t border-gray-50">
              <p className="text-xs font-medium text-gray-600 capitalize">
                {el.elevation_face.replace(/_/g, ' ')} Elevation
              </p>
              {el.caption && <p className="text-xs text-gray-400 mt-0.5">{el.caption}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QueryForm({ token }: { token: string }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function send() {
    if (!message.trim()) return
    setSending(true)
    try {
      await fetch(`/api/client-quote/${token}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      setSent(true)
      setMessage('')
    } catch { /* silent */ } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 text-center">
        <MessageCircle size={24} className="mx-auto mb-2 text-green-500" />
        <p className="text-sm font-medium text-gray-800">Message sent!</p>
        <p className="text-xs text-gray-500 mt-1">We&apos;ll get back to you shortly.</p>
        <button onClick={() => { setSent(false); setOpen(true) }} className="text-xs text-gray-400 underline mt-3">Send another</button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-green-600" />
          <span className="text-sm font-semibold text-gray-800">Have a question?</span>
        </div>
        <ChevronDown size={15} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-gray-500">Send a message directly to The Green Rooms team and we&apos;ll get back to you shortly.</p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your question here…"
            rows={4}
            className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-green-400 resize-none"
          />
          <button
            onClick={send}
            disabled={sending || !message.trim()}
            style={{ background: '#34a02e' }}
            className="flex items-center justify-center gap-2 w-full text-white font-medium text-sm py-3 rounded-xl disabled:opacity-40"
          >
            <Send size={14} />
            {sending ? 'Sending…' : 'Send Message'}
          </button>
        </div>
      )}
    </div>
  )
}

export function ClientQuoteView({
  token, versionId: _versionId, quoteRef, versionNumber: _versionNumber, status,
  customerName, siteAddress, totalPence, coverLetter,
  sections, paymentSchedule, preparedDate, buildDate, elevations = [],
}: Props) {
  const [response, setResponse] = useState<'accept' | 'changes' | null>(
    status === 'accepted' ? 'accept' : status === 'rejected' ? 'changes' : null
  )
  const [changesNote, setChangesNote] = useState('')
  const [acceptName, setAcceptName] = useState(customerName)
  const [confirmAccept, setConfirmAccept] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(status === 'accepted' || status === 'rejected')

  const netPence = Math.round(totalPence / 1.2)
  const vatPence = totalPence - netPence

  async function submitResponse(action: 'accept' | 'changes') {
    if (action === 'accept' && !acceptName.trim()) return
    setSubmitting(true)
    try {
      await fetch(`/api/client-quote/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: changesNote, acceptedByName: action === 'accept' ? acceptName.trim() : undefined }),
      })
      setResponse(action)
      setSubmitted(true)
    } catch { /* silent */ } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Brand header */}
      <div style={{ background: '#1a2328' }} className="px-4 py-5 text-center">
        <div style={{ color: '#34a02e' }} className="text-xl font-bold">The Green Rooms</div>
        <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>BESPOKE GARDEN ROOMS · SURREY</div>
      </div>

      {/* Hero price bar */}
      <div style={{ background: '#2d3841' }} className="px-4 py-6 text-center">
        <div className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Your Garden Room Proposal</div>
        <div className="text-4xl font-bold" style={{ color: '#34a02e' }}>{fmt(totalPence)}</div>
        <div className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>inc. VAT · {quoteRef} · Prepared {preparedDate}</div>
        {siteAddress && <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{siteAddress}</div>}
        {buildDate && <div className="text-xs mt-1 font-medium" style={{ color: 'rgba(52,160,46,0.8)' }}>Estimated build: {buildDate}</div>}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* PDF download — prominent */}
        <a
          href={`/api/client-quote/${token}/pdf`}
          target="_blank"
          className="flex items-center justify-center gap-2 w-full border border-gray-200 bg-white rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download size={15} className="text-gray-400" />
          Download PDF Proposal
        </a>

        {/* Cover letter */}
        {coverLetter && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{coverLetter}</div>
          </div>
        )}

        {/* Elevation drawings */}
        <ElevationPanel elevations={elevations} />

        {/* Sections */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Specification & Pricing</h2>
          <div className="space-y-3">
            {sections.map(s => <SectionBlock key={s.id} section={s} />)}
          </div>
        </div>

        {/* Total */}
        <div className="bg-gray-800 rounded-xl p-4 text-white">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>Net (ex. VAT)</span><span>{fmt(netPence)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-400 mb-3">
            <span>VAT (20%)</span><span>{fmt(vatPence)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-gray-600 pt-3">
            <span>Total (inc. VAT)</span>
            <span style={{ color: '#34a02e' }}>{fmt(totalPence)}</span>
          </div>
        </div>

        {/* Payment schedule */}
        {paymentSchedule.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Payment Schedule</h2>
            <div className="space-y-2">
              {paymentSchedule.map((m, i) => {
                const amount = totalPence > 0 && m.percentage
                  ? Math.round(totalPence * m.percentage / 100)
                  : m.amount_pence
                return (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{m.label}</div>
                      {m.paid_at && (
                        <div className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                          <Check size={10} /> Paid
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{fmt(amount)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Acceptance / response section */}
        {!submitted ? (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            {response !== 'changes' ? (
              <>
                <h2 className="text-base font-semibold text-gray-800 mb-1">Ready to proceed?</h2>
                <p className="text-sm text-gray-500 mb-4">Accept the proposal below or request changes.</p>

                {!confirmAccept ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setConfirmAccept(true)}
                      style={{ background: '#34a02e' }}
                      className="flex-1 text-white font-semibold text-sm py-3 rounded-xl"
                    >
                      ✓ Accept Proposal
                    </button>
                    <button
                      onClick={() => setResponse('changes')}
                      className="flex-1 border border-gray-200 text-gray-700 font-medium text-sm py-3 rounded-xl hover:bg-gray-50"
                    >
                      Request Changes
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <p className="text-sm font-medium text-green-800 mb-1">Digital signature</p>
                      <p className="text-xs text-green-700 mb-3">By entering your full name and confirming, you are accepting this proposal and its terms and conditions.</p>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
                      <input
                        type="text"
                        value={acceptName}
                        onChange={e => setAcceptName(e.target.value)}
                        placeholder="Your full name…"
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-green-400"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => submitResponse('accept')}
                        disabled={submitting || !acceptName.trim()}
                        style={{ background: '#34a02e' }}
                        className="flex-1 text-white font-semibold text-sm py-3 rounded-xl disabled:opacity-40"
                      >
                        {submitting ? 'Confirming…' : `Confirm acceptance`}
                      </button>
                      <button
                        onClick={() => setConfirmAccept(false)}
                        className="px-4 border border-gray-200 text-gray-500 text-sm rounded-xl hover:bg-gray-50"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-gray-800">Request changes</h2>
                <p className="text-sm text-gray-500">Tell us what you&apos;d like to adjust and we&apos;ll send a revised proposal.</p>
                <textarea
                  value={changesNote}
                  onChange={e => setChangesNote(e.target.value)}
                  placeholder="What would you like to change or discuss…"
                  rows={4}
                  className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-green-400 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => submitResponse('changes')}
                    disabled={submitting || !changesNote.trim()}
                    className="flex-1 bg-gray-800 text-white font-medium text-sm py-3 rounded-xl disabled:opacity-40"
                  >
                    {submitting ? 'Sending…' : 'Send to The Green Rooms'}
                  </button>
                  <button
                    onClick={() => setResponse(null)}
                    className="px-4 border border-gray-200 text-gray-500 text-sm rounded-xl hover:bg-gray-50"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-5 text-center">
            {response === 'accept' ? (
              <>
                <div style={{ color: '#34a02e' }} className="text-3xl mb-2">✓</div>
                <div className="font-semibold text-gray-800 mb-1">Proposal Accepted</div>
                <p className="text-sm text-gray-500">Thank you, {acceptName}! We&apos;ll be in touch shortly to arrange your deposit and confirm your build slot.</p>
              </>
            ) : (
              <>
                <div className="text-3xl mb-2">💬</div>
                <div className="font-semibold text-gray-800 mb-1">Request Received</div>
                <p className="text-sm text-gray-500">We&apos;ll review your feedback and be in touch with a revised proposal.</p>
              </>
            )}
          </div>
        )}

        {/* Query form */}
        <QueryForm token={token} />

        {/* Contact details */}
        <div className="text-center pb-4">
          <p className="text-xs text-gray-400">Or call us on <a href="tel:01932640242" className="text-gray-600 font-medium">01932 640242</a></p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 py-6 text-center">
        <p className="text-xs text-gray-400">The Green Rooms · Lyne Lane, Lyne, Surrey KT16 0AN</p>
        <p className="text-xs text-gray-400 mt-1">01932 640242 · thegreenrooms.com</p>
      </div>
    </div>
  )
}
