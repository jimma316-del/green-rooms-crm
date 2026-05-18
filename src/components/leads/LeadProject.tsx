'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MapPin, FileText, Pencil, Check, X, ExternalLink } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface Lead {
  id: string
  address: string | null
  postcode: string | null
  notes: string | null
  calculator_data: Record<string, unknown> | null
  xero_quote_url: string | null
  xero_invoice_url: string | null
}

function extractCalcFields(data: Record<string, unknown>): Record<string, string> {
  // Try to pull the actual form fields from the Webflow payload structure
  const fields = (data?.payload as Record<string, unknown>)?.data ?? data
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(fields as Record<string, unknown>)) {
    if (v !== null && v !== undefined && typeof v !== 'object') {
      result[k] = String(v)
    }
  }
  return result
}

export function LeadProject({ lead }: { lead: Lead }) {
  const router = useRouter()
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    notes: lead.notes ?? '',
    xero_quote_url: lead.xero_quote_url ?? '',
    xero_invoice_url: lead.xero_invoice_url ?? '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('leads').update({
      notes: form.notes || null,
      xero_quote_url: form.xero_quote_url || null,
      xero_invoice_url: form.xero_invoice_url || null,
    }).eq('id', lead.id)

    if (error) {
      toast.error('Failed to save')
    } else {
      toast.success('Project details saved')
      setEditing(false)
      router.refresh()
    }
    setSaving(false)
  }

  function cancel() {
    setForm({
      notes: lead.notes ?? '',
      xero_quote_url: lead.xero_quote_url ?? '',
      xero_invoice_url: lead.xero_invoice_url ?? '',
    })
    setEditing(false)
  }

  const calcFields = lead.calculator_data ? extractCalcFields(lead.calculator_data) : null
  const hasData = lead.address || lead.postcode || lead.notes || lead.calculator_data || lead.xero_quote_url || lead.xero_invoice_url

  if (editing) {
    return (
      <div className="bg-white rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold text-[var(--primary)] mb-3">Project Details</h2>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Notes</p>
            <Textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Project requirements, access notes, etc."
            />
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Xero Links</p>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">Quote URL</p>
              <Input
                type="url"
                value={form.xero_quote_url}
                onChange={e => set('xero_quote_url', e.target.value)}
                placeholder="https://go.xero.com/Quotes/..."
              />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">Invoice URL</p>
              <Input
                type="url"
                value={form.xero_invoice_url}
                onChange={e => set('xero_invoice_url', e.target.value)}
                placeholder="https://go.xero.com/Invoices/..."
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={cancel}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--primary)]">Project Details</h2>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
      </div>

      {!hasData ? (
        <button onClick={() => setEditing(true)} className="text-sm text-gray-400 underline hover:text-gray-600">
          Add project details
        </button>
      ) : (
        <div className="space-y-2.5">
          {(lead.address || lead.postcode) && (
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                {lead.address && <p>{lead.address}</p>}
                {lead.postcode && <p className="font-mono">{lead.postcode}</p>}
              </div>
            </div>
          )}

          {lead.notes && (
            <div className="flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {(lead.xero_quote_url || lead.xero_invoice_url) && (
            <div className="flex items-center gap-2 flex-wrap">
              {lead.xero_quote_url && (
                <a
                  href={lead.xero_quote_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Xero Quote
                </a>
              )}
              {lead.xero_invoice_url && (
                <a
                  href={lead.xero_invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Xero Invoice
                </a>
              )}
            </div>
          )}

          {calcFields && Object.keys(calcFields).length > 0 && (
            <details className="mt-2 pt-2 border-t border-gray-50 group">
              <summary className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide cursor-pointer select-none list-none flex items-center gap-1">
                <span className="transition-transform group-open:rotate-90">▶</span>
                Calculator Submission
              </summary>
              <div className="space-y-1 mt-2">
                {Object.entries(calcFields).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="text-gray-700 font-medium text-right ml-4">{v}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
