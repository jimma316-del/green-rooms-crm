'use client'

import { useState, useTransition, useEffect, type MouseEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { STAGE_CONFIG, SALES_STAGES, PROJECT_STAGES } from '@/types'
import type { Stage } from '@/types'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger,
} from '@/components/ui/select'
import { Flame, Phone, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Search, X, Trash2, Download, Mail, MailCheck, MessageSquare, BookOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatDistanceToNow, formatShortDate } from '@/utils/date'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Lead {
  id: string
  name: string
  mobile: string | null
  email: string | null
  address: string | null
  postcode: string | null
  stage: string
  pipeline: string
  is_hot: boolean
  lead_source: string | null
  updated_at: string
  created_at: string
  first_contact_at: string | null
  marketing_consent: boolean
  distance_miles: number | null
  sms_sent_at: string | null
  brochures_sent: boolean
  approx_size_sqm: number | null
  tags: string[]
  tasks: Array<{ id: string; title: string; due_date: string | null; completed_at: string | null }> | null
}

function brochureType(tags: string[], sqm: number | null, distance: number | null, pipeline: string): 'R' | 'P' | null {
  // Only show for leads within SMS range (≤20 miles) and not lost — same criteria as automated SMS
  if (pipeline === 'lost' || distance === null || distance > 25) return null
  if (tags.includes('canopy') || tags.includes('hidden_storage')) return 'R'
  if (sqm !== null && sqm > 15) return 'R'
  return 'P'
}

interface Props {
  leads: Lead[]
  total: number
  page: number
  pageSize: number
  duplicateEmails?: Set<string>
}

function StageCell({ lead }: { lead: Lead }) {
  const supabase = createClient()
  const router = useRouter()
  const [stage, setStage] = useState(lead.stage)
  const [saving, setSaving] = useState(false)
  const cfg = STAGE_CONFIG[stage as Stage]

  async function changeStage(newStage: string | null) {
    if (!newStage || newStage === stage) return
    setSaving(true)
    const newPipeline = STAGE_CONFIG[newStage as Stage]?.pipeline ?? 'sales'
    const clearHot = newPipeline === 'project' || newPipeline === 'lost' || newStage === 'job_booked'
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('leads').update({ stage: newStage, pipeline: newPipeline, ...(clearHot ? { is_hot: false } : {}) }).eq('id', lead.id)
    if (newStage === 'quoting') {
      await supabase.from('tasks').insert({
        lead_id: lead.id,
        created_by: user!.id,
        assigned_to: user!.id,
        title: 'Prepare quote',
        type: 'quote',
        priority: 'high',
        due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
      })
      toast.success('Stage updated — quote task created')
    } else if (newStage === 'quote_sent') {
      await Promise.all([
        supabase.from('tasks').insert({
          lead_id: lead.id,
          created_by: user!.id,
          assigned_to: user!.id,
          title: 'Quote follow up',
          type: 'whatsapp',
          priority: 'normal',
          due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
        }),
        supabase.from('tasks')
          .update({ completed_at: new Date().toISOString(), completed_by: user!.id })
          .eq('lead_id', lead.id)
          .in('title', [`${lead.name} Quote`, `${lead.name} Site Visit`, 'Prepare quote'])
          .is('completed_at', null),
      ])
      toast.success('Stage updated — follow-up task set for 48hrs')
    } else {
      toast.success('Stage updated')
    }
    setStage(newStage)
    setSaving(false)
    router.refresh()
  }

  return (
    <Select value={stage} onValueChange={changeStage} disabled={saving}>
      <SelectTrigger
        size="sm"
        className={cn(
          'h-auto py-0.5 px-2 rounded-full border-0 shadow-none focus-visible:ring-0 text-[10px] font-medium w-auto gap-1',
          cfg?.color ?? 'bg-gray-100 text-gray-600'
        )}
      >
        <span>{cfg?.label ?? stage}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel className="text-[10px] uppercase tracking-wide text-gray-400">Sales</SelectLabel>
          {SALES_STAGES.map(s => (
            <SelectItem key={s} value={s}>{STAGE_CONFIG[s]?.label ?? s}</SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel className="text-[10px] uppercase tracking-wide text-gray-400">Project</SelectLabel>
          {PROJECT_STAGES.map(s => (
            <SelectItem key={s} value={s}>{STAGE_CONFIG[s]?.label ?? s}</SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel className="text-[10px] uppercase tracking-wide text-gray-400">Other</SelectLabel>
          <SelectItem value="parked">Parked</SelectItem>
          <SelectItem value="out_of_area">Out Of Area</SelectItem>
          <SelectItem value="lost">Lost</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function BrochuresCell({ lead }: { lead: Lead }) {
  const supabase = createClient()
  const [sent, setSent] = useState(lead.brochures_sent)
  const type = brochureType(lead.tags ?? [], lead.approx_size_sqm, lead.distance_miles, lead.pipeline)

  async function toggle(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const next = !sent
    setSent(next)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('leads') as any).update({ brochures_sent: next }).eq('id', lead.id)
  }

  if (!type) {
    return <span className="text-gray-200">—</span>
  }

  return (
    <button
      onClick={toggle}
      title={sent ? 'Brochures sent — click to unmark' : 'Mark brochures as sent'}
      className="flex flex-col items-center gap-0.5"
    >
      <BookOpen className={cn('w-3.5 h-3.5', sent ? 'text-purple-500' : 'text-gray-200 hover:text-gray-400')} />
      <span className={cn(
        'text-[9px] font-bold leading-none',
        type === 'R' ? 'text-green-600' : 'text-blue-500'
      )}>{type}</span>
    </button>
  )
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

export function LeadsTable({ leads, total, page, pageSize, duplicateEmails }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  const currentSort = searchParams.get('sort') ?? 'first_contact_at'
  const currentDir = searchParams.get('dir') ?? 'desc'

  // Restore last sort from localStorage when arriving without sort params in URL
  useEffect(() => {
    if (searchParams.get('sort')) return
    try {
      const saved = localStorage.getItem('leads_sort')
      if (saved) {
        const { sort, dir } = JSON.parse(saved)
        const params = new URLSearchParams(searchParams.toString())
        params.set('sort', sort)
        params.set('dir', dir)
        router.replace(`${pathname}?${params.toString()}`)
      }
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isMarketingFilter = searchParams.get('marketing') === 'true'
  const allSelected = leads.length > 0 && leads.every(l => selected.has(l.id))

  function toggleMarketingFilter() {
    const params = new URLSearchParams(searchParams.toString())
    if (isMarketingFilter) {
      params.delete('marketing')
    } else {
      params.set('marketing', 'true')
      params.delete('page')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  function emailSelected() {
    const emails = leads
      .filter(l => selected.has(l.id) && l.email)
      .map(l => l.email!)
    if (!emails.length) {
      toast.error('No email addresses for selected leads')
      return
    }
    navigator.clipboard.writeText(emails.join(', ')).then(() => {
      toast.success(`${emails.length} email address${emails.length > 1 ? 'es' : ''} copied — paste into your BCC field`)
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(leads.map(l => l.id)))
    }
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function exportCSV() {
    const selectedLeads = leads.filter(l => selected.has(l.id))
    const rows = [
      ['Name', 'Address Line 1', 'Address Line 2', 'City', 'Postcode'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...selectedLeads.map(l => [l.name, l.address ?? '', (l as any).address_line_2 ?? '', (l as any).city ?? '', l.postcode ?? '']),
    ]
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'green-rooms-leads.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function deleteSelected() {
    if (!confirm(`Delete ${selected.size} lead${selected.size > 1 ? 's' : ''}? This cannot be undone.`)) return
    setDeleting(true)
    const { error } = await supabase.from('leads').delete().in('id', [...selected])
    if (error) {
      toast.error('Failed to delete leads')
    } else {
      toast.success(`${selected.size} lead${selected.size > 1 ? 's' : ''} deleted`)
      setSelected(new Set())
      router.refresh()
    }
    setDeleting(false)
  }

  function updateSearch(value: string) {
    setSearch(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('q', value)
      params.delete('page')
    } else {
      params.delete('q')
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`${pathname}?${params.toString()}`)
  }

  function sortBy(field: string) {
    const params = new URLSearchParams(searchParams.toString())
    let newDir: string
    if (currentSort === field) {
      newDir = currentDir === 'asc' ? 'desc' : 'asc'
      params.set('dir', newDir)
    } else {
      newDir = field === 'first_contact_at' ? 'desc' : 'asc'
      params.set('sort', field)
      params.set('dir', newDir)
    }
    params.delete('page')
    try { localStorage.setItem('leads_sort', JSON.stringify({ sort: field, dir: newDir })) } catch {}
    router.push(`${pathname}?${params.toString()}`)
  }

  function SortIcon({ field }: { field: string }) {
    if (currentSort !== field) return <ChevronUp className="w-3 h-3 ml-1 opacity-20 inline" />
    return currentDir === 'asc'
      ? <ChevronUp className="w-3 h-3 ml-1 inline text-[var(--primary)]" />
      : <ChevronDown className="w-3 h-3 ml-1 inline text-[var(--primary)]" />
  }

  const totalPages = Math.ceil(total / pageSize)
  const pageNumbers = getPageNumbers(page, totalPages)

  return (
    <div>
      {/* Search + filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search name, email, phone, postcode…"
            className="pl-9 pr-8"
            value={search}
            onChange={e => updateSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => updateSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={toggleMarketingFilter}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors whitespace-nowrap',
            isMarketingFilter
              ? 'bg-green-50 border-green-300 text-green-700 font-medium'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          )}
        >
          <MailCheck className="w-4 h-4" />
          Marketing opt-in
          {isMarketingFilter && <X className="w-3 h-3 ml-0.5" />}
        </button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
          <span className="text-sm text-gray-700">{selected.size} selected</span>
          <button
            onClick={emailSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            Email selected
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={deleteSelected}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? 'Deleting…' : 'Delete selected'}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm text-gray-400 hover:text-gray-600 ml-auto">
            Cancel
          </button>
        </div>
      )}

      {/* Table */}
      <div className={cn('bg-white rounded-xl border border-gray-100 overflow-hidden', isPending && 'opacity-60')}>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-gray-300 text-[var(--primary)]" />
                </th>
                <th className="text-left px-4 py-3">
                  <button
                    onClick={() => sortBy('name')}
                    className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700"
                  >
                    Name <SortIcon field="name" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3">
                  <button
                    onClick={() => sortBy('address')}
                    className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700"
                  >
                    Location <SortIcon field="address" />
                  </button>
                </th>
                <th className="text-left px-4 py-3">
                  <button
                    onClick={() => sortBy('stage')}
                    className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700"
                  >
                    Stage <SortIcon field="stage" />
                  </button>
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" title="SMS sent">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" title="Brochures sent">
                  <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Task</th>
                <th className="text-left px-4 py-3">
                  <button
                    onClick={() => sortBy('distance_miles')}
                    className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700"
                  >
                    Distance <SortIcon field="distance_miles" />
                  </button>
                </th>
                <th className="text-left px-4 py-3">
                  <button
                    onClick={() => sortBy('first_contact_at')}
                    className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700"
                  >
                    Joined <SortIcon field="first_contact_at" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" title="Marketing opt-in">
                  <MailCheck className="w-3.5 h-3.5 text-gray-400" />
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-gray-400 text-sm">No leads found</td>
                </tr>
              ) : leads.map(lead => {
                const cfg = STAGE_CONFIG[lead.stage as Stage]
                return (
                  <tr key={lead.id} className={cn('hover:bg-gray-50/50 transition-colors', selected.has(lead.id) && 'bg-blue-50/40')}>
                    <td className="px-4 py-3 w-8">
                      <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)} className="rounded border-gray-300" />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/leads/${lead.id}`} className="flex items-center gap-2 group">
                        {lead.is_hot && <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                        <span className="font-medium text-gray-900 group-hover:text-[var(--primary)]">{lead.name}</span>
                        {lead.email && duplicateEmails?.has(lead.email) && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium shrink-0">Dup</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {lead.mobile && (
                        <a href={`tel:${lead.mobile}`} className="flex items-center gap-1 text-xs text-gray-600 hover:text-[var(--primary)]">
                          <Phone className="w-3 h-3" />{lead.mobile}
                        </a>
                      )}
                      {lead.email && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[150px]">{lead.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {lead.address ?? lead.postcode ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StageCell lead={lead} />
                    </td>
                    <td className="px-4 py-3 w-8">
                      {lead.sms_sent_at
                        ? <span title={`SMS sent ${new Date(lead.sms_sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}><MessageSquare className="w-3.5 h-3.5 text-blue-500" /></span>
                        : <span className="text-gray-200">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 w-8">
                      <BrochuresCell lead={lead} />
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[160px]">
                      {(() => {
                        const open = (lead.tasks ?? [])
                          .filter(t => !t.completed_at)
                          .sort((a, b) => {
                            if (!a.due_date) return 1
                            if (!b.due_date) return -1
                            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                          })
                        if (!open.length) return <span className="text-gray-300">—</span>
                        const task = open[0]
                        const overdue = task.due_date && new Date(task.due_date) < new Date()
                        return (
                          <span className={cn('truncate block', overdue ? 'text-red-500 font-medium' : 'text-gray-600')}>
                            {task.title}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {lead.distance_miles != null
                        ? <span className={lead.distance_miles > 100 ? 'text-red-400' : ''}>{lead.distance_miles} mi</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatShortDate(lead.created_at)}</td>
                    <td className="px-4 py-3 w-8">
                      {lead.marketing_consent
                        ? <MailCheck className="w-3.5 h-3.5 text-green-500" />
                        : <span className="text-gray-200">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 w-8">
                      <button onClick={() => { setSelected(new Set([lead.id])); }} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition-all" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="md:hidden divide-y divide-gray-50">
          {leads.length === 0 ? (
            <p className="px-4 py-10 text-center text-gray-400 text-sm">No leads found</p>
          ) : leads.map(lead => {
            const cfg = STAGE_CONFIG[lead.stage as Stage]
            return (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50">
                <div>
                  <div className="flex items-center gap-1.5">
                    {lead.is_hot && <Flame className="w-3.5 h-3.5 text-orange-500" />}
                    <span className="font-medium text-gray-900 text-sm">{lead.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {lead.address ?? lead.postcode ?? ''}{(lead.address || lead.postcode) && lead.mobile ? ' · ' : ''}{lead.mobile ?? ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg?.color ?? 'bg-gray-100 text-gray-600'}`}>
                    {cfg?.label ?? lead.stage}
                  </span>
                  <span className="text-[10px] text-gray-400">{formatShortDate(lead.first_contact_at ?? lead.created_at)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-2 mt-4 text-sm">
          <p className="text-gray-500">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pageNumbers.map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1.5 text-gray-400 select-none">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={cn(
                    'min-w-[32px] h-8 px-2 rounded-lg text-sm border transition-colors',
                    p === page
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  )}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
