'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { LEAD_SOURCE_LABELS } from '@/types'
import type { LeadSource } from '@/types'

interface Props {
  onSuccess: () => void
}

export function NewLeadForm({ onSuccess }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    address: '',
    postcode: '',
    lead_source: 'manual' as LeadSource,
    approx_size_sqm: '',
    notes: '',
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
        setForm(prev => ({
          ...prev,
          address: prev.address || `${data.result.admin_district}, ${data.result.region}`,
        }))
      }
    } catch {
      // silently ignore postcode lookup failures
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setLoading(false); return }

    const payload = {
      name: form.name.trim(),
      mobile: form.mobile || null,
      email: form.email || null,
      address: form.address || null,
      postcode: form.postcode.toUpperCase() || null,
      lead_source: form.lead_source,
      approx_size_sqm: form.approx_size_sqm ? parseFloat(form.approx_size_sqm) : null,
      notes: form.notes || null,
      stage: 'new_lead',
      pipeline: 'sales',
      assigned_to: user.id,
      is_hot: false,
      tags: form.lead_source ? [form.lead_source] : [],
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .insert(payload)
      .select()
      .single()

    if (error) {
      toast.error('Failed to create lead: ' + error.message)
      setLoading(false)
      return
    }

    // Log activity
    await supabase.from('activities').insert({
      lead_id: lead.id,
      created_by: user.id,
      type: 'lead_created',
      body: 'Lead created',
    })

    // Log stage history
    await supabase.from('stage_history').insert({
      lead_id: lead.id,
      from_stage: null,
      to_stage: 'new_lead',
      changed_by: user.id,
    })

    toast.success('Lead created')
    onSuccess()
    router.push(`/leads/${lead.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
        <Input id="name" placeholder="James Smith" value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="mobile">Mobile</Label>
          <Input id="mobile" type="tel" placeholder="07700 900123" value={form.mobile} onChange={e => set('mobile', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="james@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
      </div>

      {/* Address + Postcode */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="address">Address / Town</Label>
          <Input id="address" placeholder="Oxford, Oxfordshire" value={form.address} onChange={e => set('address', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="postcode">Postcode</Label>
          <Input
            id="postcode"
            placeholder="OX4 2AB"
            value={form.postcode}
            onChange={e => set('postcode', e.target.value)}
            onBlur={e => lookupPostcode(e.target.value)}
          />
        </div>
      </div>

      {/* Lead Source */}
      <div className="space-y-1.5">
        <Label>Lead Source</Label>
        <Select value={form.lead_source} onValueChange={v => v && set('lead_source', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(LEAD_SOURCE_LABELS)
              .filter(([v]) => !['website_form', 'calculator'].includes(v))
              .map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Size */}
      <div className="space-y-1.5">
        <Label htmlFor="size">Approximate Size (m²)</Label>
        <Input id="size" type="number" step="0.5" placeholder="20" value={form.approx_size_sqm} onChange={e => set('approx_size_sqm', e.target.value)} />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes / Enquiry Summary</Label>
        <Textarea id="notes" placeholder="What did they enquire about?" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1 bg-[var(--primary)] hover:bg-[var(--primary)]/90" disabled={loading}>
          {loading ? 'Creating…' : 'Create Lead'}
        </Button>
      </div>
    </form>
  )
}
