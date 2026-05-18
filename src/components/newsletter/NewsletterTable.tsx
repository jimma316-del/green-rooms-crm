'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Mail, Trash2, UserPlus, UserMinus, ChevronDown, ChevronUp } from 'lucide-react'
import { formatShortDate } from '@/utils/date'
import { cn } from '@/lib/utils'

interface Subscriber {
  id: string
  name: string
  email: string | null
  mobile: string | null
  address: string | null
  postcode: string | null
  first_contact_at: string | null
  created_at: string
}

interface Props {
  subscribers: Subscriber[]
  eligible: Subscriber[]
}

export function NewsletterTable({ subscribers, eligible }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<Set<string>>(new Set())
  const [showEligible, setShowEligible] = useState(eligible.length > 0)

  const allSelected = subscribers.length > 0 && subscribers.every(s => selected.has(s.id))

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(subscribers.map(s => s.id)))
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function moveToNewsletter(ids: string[]) {
    setLoading(prev => new Set([...prev, ...ids]))
    const { error } = await supabase.from('leads').update({ is_newsletter: true }).in('id', ids)
    if (error) {
      toast.error('Failed to move leads')
    } else {
      toast.success(`${ids.length} lead${ids.length > 1 ? 's' : ''} added to newsletter`)
      startTransition(() => router.refresh())
    }
    setLoading(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next })
  }

  async function removeFromNewsletter(ids: string[]) {
    if (!confirm(`Remove ${ids.length} contact${ids.length > 1 ? 's' : ''} from newsletter? They will return to the leads list.`)) return
    setLoading(prev => new Set([...prev, ...ids]))
    const { error } = await supabase.from('leads').update({ is_newsletter: false }).in('id', ids)
    if (error) {
      toast.error('Failed to remove contacts')
    } else {
      toast.success(`${ids.length} contact${ids.length > 1 ? 's' : ''} removed from newsletter`)
      setSelected(new Set())
      startTransition(() => router.refresh())
    }
    setLoading(prev => { const next = new Set(prev); ids.forEach(id => next.delete(id)); return next })
  }

  function emailSelected() {
    const emails = subscribers
      .filter(s => selected.has(s.id) && s.email)
      .map(s => s.email!)
    if (!emails.length) {
      toast.error('No email addresses for selected contacts')
      return
    }
    navigator.clipboard.writeText(emails.join(', ')).then(() => {
      toast.success(`${emails.length} email address${emails.length > 1 ? 'es' : ''} copied — paste into your BCC field`)
    })
  }

  function emailAll() {
    const emails = subscribers.filter(s => s.email).map(s => s.email!)
    if (!emails.length) {
      toast.error('No email addresses in newsletter list')
      return
    }
    navigator.clipboard.writeText(emails.join(', ')).then(() => {
      toast.success(`All ${emails.length} email addresses copied — paste into your BCC field`)
    })
  }

  return (
    <div className="space-y-6">
      {/* Eligible leads banner */}
      {eligible.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 overflow-hidden">
          <button
            onClick={() => setShowEligible(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                {eligible.length} lead{eligible.length > 1 ? 's' : ''} ready to add
              </span>
              <span className="text-xs text-green-600">
                (marketing opt-in · SMS sent · no response in 7+ days)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={e => { e.stopPropagation(); moveToNewsletter(eligible.map(l => l.id)) }}
                className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Move all to newsletter
              </button>
              {showEligible ? <ChevronUp className="w-4 h-4 text-green-600" /> : <ChevronDown className="w-4 h-4 text-green-600" />}
            </div>
          </button>

          {showEligible && (
            <div className="border-t border-green-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-green-100/60">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-green-700 uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-green-700 uppercase tracking-wide">Email</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-green-700 uppercase tracking-wide">Location</th>
                    <th className="px-4 py-2 w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-100">
                  {eligible.map(lead => (
                    <tr key={lead.id} className="hover:bg-green-100/40">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{lead.name}</td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">{lead.email ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{lead.address ?? lead.postcode ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => moveToNewsletter([lead.id])}
                          disabled={loading.has(lead.id)}
                          className="flex items-center gap-1 ml-auto px-2.5 py-1 text-xs font-medium text-green-700 bg-white border border-green-300 hover:bg-green-50 rounded-lg disabled:opacity-50 transition-colors"
                        >
                          <UserPlus className="w-3 h-3" />
                          Add
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Newsletter subscribers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Subscribers</h2>
          {subscribers.length > 0 && (
            <button
              onClick={emailAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              Email all ({subscribers.filter(s => s.email).length})
            </button>
          )}
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-sm text-gray-700">{selected.size} selected</span>
            <button
              onClick={emailSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              Email selected
            </button>
            <button
              onClick={() => removeFromNewsletter([...selected])}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
            >
              <UserMinus className="w-3.5 h-3.5" />
              Remove selected
            </button>
            <button onClick={() => setSelected(new Set())} className="text-sm text-gray-400 hover:text-gray-600 ml-auto">
              Cancel
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {subscribers.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <Mail className="w-8 h-8 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No newsletter subscribers yet</p>
              {eligible.length === 0 && (
                <p className="text-gray-300 text-xs mt-1">Leads are added automatically when they meet the criteria above</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 w-8">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-gray-300 text-[var(--primary)]" />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">First contact</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {subscribers.map(sub => (
                    <tr key={sub.id} className={cn('hover:bg-gray-50/50 transition-colors', selected.has(sub.id) && 'bg-blue-50/40')}>
                      <td className="px-4 py-3 w-8">
                        <input type="checkbox" checked={selected.has(sub.id)} onChange={() => toggleOne(sub.id)} className="rounded border-gray-300" />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{sub.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{sub.email ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{sub.mobile ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{sub.address ?? sub.postcode ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {formatShortDate(sub.first_contact_at ?? sub.created_at)}
                      </td>
                      <td className="px-4 py-3 w-10">
                        <button
                          onClick={() => removeFromNewsletter([sub.id])}
                          disabled={loading.has(sub.id)}
                          title="Remove from newsletter"
                          className="p-1 text-gray-300 hover:text-red-400 disabled:opacity-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
