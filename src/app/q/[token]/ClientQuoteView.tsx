'use client'

import { useState } from 'react'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'

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

interface Props {
  token: string; versionId: string; quoteRef: string; versionNumber: number; status: string
  customerName: string; siteAddress?: string; totalPence: number; coverLetter: string | null
  sections: Section[]; paymentSchedule: PaymentMilestone[]; preparedDate: string
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

export function ClientQuoteView({
  token, versionId, quoteRef, versionNumber, status,
  customerName, siteAddress, totalPence, coverLetter,
  sections, paymentSchedule, preparedDate,
}: Props) {
  const [response, setResponse] = useState<'accept' | 'changes' | null>(
    status === 'accepted' ? 'accept' : status === 'rejected' ? 'changes' : null
  )
  const [changesNote, setChangesNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(status === 'accepted' || status === 'rejected')

  const netPence = Math.round(totalPence / 1.2)
  const vatPence = totalPence - netPence

  async function submitResponse(action: 'accept' | 'changes') {
    setSubmitting(true)
    try {
      await fetch(`/api/client-quote/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: changesNote }),
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
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Cover letter */}
        {coverLetter && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{coverLetter}</div>
          </div>
        )}

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

        {/* Response section */}
        {!submitted ? (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-1">Ready to proceed?</h2>
            <p className="text-sm text-gray-500 mb-4">Let us know if you&apos;re happy with this proposal or if you&apos;d like any changes.</p>
            <div className="flex gap-3">
              <button
                onClick={() => submitResponse('accept')}
                disabled={submitting}
                style={{ background: '#34a02e' }}
                className="flex-1 text-white font-semibold text-sm py-3 rounded-xl disabled:opacity-50"
              >
                ✓ Accept Proposal
              </button>
              <button
                onClick={() => setResponse('changes')}
                disabled={submitting}
                className="flex-1 border border-gray-200 text-gray-700 font-medium text-sm py-3 rounded-xl hover:bg-gray-50 disabled:opacity-50"
              >
                Request Changes
              </button>
            </div>
            {response === 'changes' && (
              <div className="mt-4 space-y-3">
                <textarea
                  value={changesNote}
                  onChange={e => setChangesNote(e.target.value)}
                  placeholder="Tell us what you&apos;d like to change or discuss…"
                  rows={4}
                  className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-green-400 resize-none"
                />
                <button
                  onClick={() => submitResponse('changes')}
                  disabled={submitting || !changesNote.trim()}
                  className="w-full bg-gray-800 text-white font-medium text-sm py-3 rounded-xl disabled:opacity-40"
                >
                  {submitting ? 'Sending…' : 'Send to The Green Rooms'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-5 text-center">
            {response === 'accept' ? (
              <>
                <div style={{ color: '#34a02e' }} className="text-2xl mb-2">✓</div>
                <div className="font-semibold text-gray-800 mb-1">Proposal Accepted</div>
                <p className="text-sm text-gray-500">Thank you! We&apos;ll be in touch shortly to arrange your deposit and confirm your build date.</p>
              </>
            ) : (
              <>
                <div className="text-2xl mb-2">💬</div>
                <div className="font-semibold text-gray-800 mb-1">Request Received</div>
                <p className="text-sm text-gray-500">We&apos;ll review your feedback and be in touch with a revised proposal.</p>
              </>
            )}
          </div>
        )}

        {/* Download PDF */}
        <div className="text-center pb-6">
          <a
            href={`/api/client-quote/${token}/pdf`}
            target="_blank"
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Download PDF copy
          </a>
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
