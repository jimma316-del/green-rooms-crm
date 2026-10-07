'use client'

import { useState, useCallback } from 'react'
import type { XeroLineItem } from '@/lib/quote-generator'
import { calcTotals } from '@/lib/quote-generator'

interface Props {
  leadId: string
  leadName: string
  initialItems: XeroLineItem[]
}

function fmt(n: number) {
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function AssessmentQuoteClient({ leadId, leadName, initialItems }: Props) {
  const [items, setItems] = useState<XeroLineItem[]>(initialItems)
  const [pushing, setPushing] = useState(false)
  const [result, setResult] = useState<{ quoteNumber?: string; error?: string } | null>(null)

  const updateItem = useCallback((id: string, patch: Partial<XeroLineItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))
  }, [])

  const totals = calcTotals(items)

  const pushToXero = async () => {
    setPushing(true)
    setResult(null)
    try {
      const res = await fetch(`/api/leads/${leadId}/xero-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItems: items }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'scope_missing') {
          setResult({ error: 'Xero connection needs updating. Go to Settings → Xero and reconnect to enable quote creation.' })
        } else {
          setResult({ error: data.error || 'Failed to create Xero quote' })
        }
      } else {
        setResult({ quoteNumber: data.quoteNumber })
      }
    } catch {
      setResult({ error: 'Network error — please try again' })
    } finally {
      setPushing(false)
    }
  }

  const copyAsText = () => {
    const included = items.filter(i => i.included)
    const lines = included.map(item => [
      `--- ${item.label} ---`,
      item.description,
      `Amount: ${fmt(item.unitAmount)} (ex VAT)`,
    ].join('\n'))
    lines.push(`\nSubtotal (ex VAT): ${fmt(totals.exVat)}`)
    lines.push(`VAT (20%): ${fmt(totals.vat)}`)
    lines.push(`TOTAL: ${fmt(totals.incVat)}`)
    navigator.clipboard.writeText(lines.join('\n\n'))
      .then(() => alert('Copied to clipboard'))
      .catch(() => alert('Copy failed — please select and copy manually'))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <a href={`/leads/${leadId}/assessment`} className="text-xs text-gray-500 hover:text-gray-700">
          ← Back to assessment
        </a>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">Generate Xero Quote</h1>
        <p className="text-sm text-gray-500 mt-1">
          For <strong>{leadName}</strong>. Review and edit each line item, then push to Xero or copy the text.
        </p>
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-3">
          Prices are approximate (based on assessment data, ex-VAT). Please review and adjust before creating the quote.
        </p>
      </div>

      {/* Line items */}
      <div className="space-y-4">
        {items.map(item => (
          <div
            key={item.id}
            className={`bg-white rounded-xl border transition-colors ${
              item.included ? 'border-gray-200' : 'border-gray-100 opacity-60'
            }`}
          >
            {/* Item header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={item.included}
                  onChange={e => updateItem(item.id, { included: e.target.checked })}
                  className="w-4 h-4 rounded accent-green-600"
                />
                <span className="font-medium text-gray-900 text-sm">{item.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  item.category === 'room'      ? 'bg-green-100 text-green-700' :
                  item.category === 'electrics' ? 'bg-blue-100 text-blue-700'   :
                  item.category === 'mains'     ? 'bg-blue-50 text-blue-600'    :
                  item.category === 'decking'   ? 'bg-orange-100 text-orange-700' :
                  item.category === 'climate'   ? 'bg-purple-100 text-purple-700' :
                  item.category === 'wifi'      ? 'bg-indigo-100 text-indigo-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {item.category}
                </span>
              </div>
              {/* Price */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">£</span>
                <input
                  type="number"
                  value={item.unitAmount}
                  onChange={e => updateItem(item.id, { unitAmount: parseFloat(e.target.value) || 0 })}
                  step="0.01"
                  min="0"
                  className="w-28 text-right text-sm font-medium border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-green-500"
                  disabled={!item.included}
                />
                <span className="text-xs text-gray-400">ex VAT</span>
              </div>
            </div>

            {/* Description textarea */}
            {item.included && (
              <div className="p-4">
                <textarea
                  value={item.description}
                  onChange={e => updateItem(item.id, { description: e.target.value })}
                  rows={item.description.split('\n').length + 1}
                  className="w-full text-xs text-gray-700 font-mono leading-relaxed border border-gray-100 rounded p-3 resize-y focus:outline-none focus:border-green-400 bg-gray-50"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal (ex VAT)</span>
            <span className="font-medium">{fmt(totals.exVat)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>VAT 20%</span>
            <span className="font-medium">{fmt(totals.vat)}</span>
          </div>
          <div className="flex justify-between text-gray-900 font-semibold text-base border-t border-gray-100 pt-2 mt-2">
            <span>Total (inc VAT)</span>
            <span>{fmt(totals.incVat)}</span>
          </div>
        </div>
      </div>

      {/* Result banner */}
      {result && (
        <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${
          result.error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {result.error || `✓ Xero draft quote ${result.quoteNumber} created successfully`}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={copyAsText}
          className="px-4 py-2.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors"
        >
          Copy as text
        </button>
        <button
          onClick={pushToXero}
          disabled={pushing || items.filter(i => i.included).length === 0}
          className="flex-1 px-5 py-2.5 text-sm font-medium bg-[#13B5EA] text-white rounded-lg hover:bg-[#0ea3d4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pushing ? 'Creating in Xero…' : 'Create draft quote in Xero'}
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-400 text-center">
        Creates a DRAFT quote in Xero — you can review, edit, and send from there
      </p>
    </div>
  )
}
