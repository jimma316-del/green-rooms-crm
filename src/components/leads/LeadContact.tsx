'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Phone, Mail, MapPin, User, Tag, Pencil, Check, X, MessageSquare } from 'lucide-react'
import { LEAD_SOURCE_LABELS } from '@/types'
import type { LeadSource } from '@/types'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { formatDateTime } from '@/utils/date'

interface Lead {
  id: string
  name: string
  mobile: string | null
  email: string | null
  address: string | null
  city: string | null
  postcode: string | null
  lead_source: string | null
  source_referrer: string | null
  tags: string[]
  sms_sent_at: string | null
  marketing_consent: boolean
}

export function LeadContact({ lead }: { lead: Lead }) {
  const router = useRouter()
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sendingSms, setSendingSms] = useState(false)

  async function sendSms() {
    setSendingSms(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}/sms`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to send SMS')
      } else {
        toast.success(`SMS sent (${data.miles} miles)`)
        router.refresh()
      }
    } catch {
      toast.error('Failed to send SMS')
    }
    setSendingSms(false)
  }

  const [form, setForm] = useState({
    name: lead.name,
    mobile: lead.mobile ?? '',
    email: lead.email ?? '',
    address: lead.address ?? '',
    city: lead.city ?? '',
    postcode: lead.postcode ?? '',
    lead_source: lead.lead_source ?? 'manual',
    source_referrer: lead.source_referrer ?? '',
    marketing_consent: lead.marketing_consent,
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function lookupPostcode(postcode: string) {
    const clean = postcode.trim().replace(/\s+/g, '').toUpperCase()
    if (clean.length < 3) return
    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${clean}`)
      const data = await res.json()
      if (data.result) {
        if (!form.city) set('city', data.result.admin_district)
      }
    } catch {
      // ignore
    }
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    const { error } = await supabase.from('leads').update({
      name: form.name.trim(),
      mobile: form.mobile || null,
      email: form.email || null,
      address: form.address || null,
      city: form.city || null,
      postcode: form.postcode.toUpperCase() || null,
      lead_source: form.lead_source || null,
      source_referrer: form.source_referrer || null,
      marketing_consent: form.marketing_consent,
    }).eq('id', lead.id)

    if (error) {
      toast.error('Failed to save')
    } else {
      toast.success('Contact details saved')
      setEditing(false)
      router.refresh()
    }
    setSaving(false)
  }

  function cancel() {
    setForm({
      name: lead.name,
      mobile: lead.mobile ?? '',
      email: lead.email ?? '',
      address: lead.address ?? '',
      city: lead.city ?? '',
      postcode: lead.postcode ?? '',
      lead_source: lead.lead_source ?? 'manual',
      source_referrer: lead.source_referrer ?? '',
      marketing_consent: lead.marketing_consent,
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="bg-white rounded-xl border border-border p-4">
        <h2 className="text-sm font-semibold text-[var(--primary)] mb-3">Contact Details</h2>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Full Name</p>
            <Input value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Mobile</p>
              <Input type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="07700 900123" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Email</p>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="james@email.com" />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Address</p>
            <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="12 High Street" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">City / Town</p>
              <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Oxford" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Postcode</p>
              <Input
                value={form.postcode}
                onChange={e => set('postcode', e.target.value)}
                onBlur={e => lookupPostcode(e.target.value)}
                placeholder="OX4 2AB"
              />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Lead Source</p>
            <Select value={form.lead_source} onValueChange={v => v && set('lead_source', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LEAD_SOURCE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.lead_source === 'referral' && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Referred by</p>
              <Input value={form.source_referrer} onChange={e => set('source_referrer', e.target.value)} placeholder="Who referred them?" />
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.marketing_consent}
              onChange={e => setForm(prev => ({ ...prev, marketing_consent: e.target.checked }))}
              className="w-4 h-4 rounded accent-[var(--primary)]"
            />
            <span className="text-xs text-gray-700">Opted in to marketing</span>
          </label>
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
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Contact Details</h2>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
      </div>
      <div className="space-y-2.5">
        <Row icon={<User className="w-4 h-4 text-gray-400" />} label="Name" value={lead.name} />
        {lead.mobile && (
          <a href={`tel:${lead.mobile}`} className="flex items-center gap-2.5 group">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 group-hover:text-[var(--primary)]">{lead.mobile}</span>
          </a>
        )}
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 group">
            <Mail className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 group-hover:text-[var(--primary)] truncate">{lead.email}</span>
          </a>
        )}
        {(lead.address || lead.city || lead.postcode) && (
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              {lead.address && <p>{lead.address}</p>}
              {lead.city && <p>{lead.city}</p>}
              {lead.postcode && <p className="font-mono">{lead.postcode}</p>}
            </div>
          </div>
        )}
        {!lead.mobile && !lead.email && !lead.address && !lead.postcode && (
          <button onClick={() => setEditing(true)} className="text-sm text-gray-400 underline hover:text-gray-600">
            Add contact details
          </button>
        )}
        {lead.lead_source && (
          <Row
            icon={<Tag className="w-4 h-4 text-gray-400" />}
            label="Source"
            value={LEAD_SOURCE_LABELS[lead.lead_source as LeadSource] ?? lead.lead_source}
          />
        )}
        {lead.source_referrer && (
          <Row icon={<Tag className="w-4 h-4 text-gray-400" />} label="Heard via" value={lead.source_referrer} />
        )}
        {lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {lead.tags.map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{tag}</span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-0.5">
          <input
            type="checkbox"
            checked={lead.marketing_consent}
            readOnly
            className="w-4 h-4 rounded accent-[var(--primary)] pointer-events-none"
          />
          <span className="text-xs text-gray-500">
            {lead.marketing_consent ? 'Opted in to marketing' : 'Not opted in to marketing'}
          </span>
        </div>

        {lead.mobile && (
          <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
            {lead.sms_sent_at ? (
              <span className="text-[10px] text-green-600 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> SMS sent {formatDateTime(lead.sms_sent_at)}
              </span>
            ) : (
              <span className="text-[10px] text-gray-400">No SMS sent yet</span>
            )}
            <button
              onClick={sendSms}
              disabled={sendingSms}
              className="flex items-center gap-1 text-xs px-2.5 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <MessageSquare className="w-3 h-3" />
              {sendingSms ? 'Sending…' : lead.sms_sent_at ? 'Resend' : 'Send SMS'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">{label}</p>
        <p className="text-sm text-gray-700 truncate">{value}</p>
      </div>
    </div>
  )
}
