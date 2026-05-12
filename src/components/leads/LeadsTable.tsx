'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { STAGE_CONFIG } from '@/types'
import type { Stage } from '@/types'
import { Flame, Phone, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatDistanceToNow } from '@/utils/date'
import { cn } from '@/lib/utils'

interface Lead {
  id: string
  name: string
  mobile: string | null
  email: string | null
  postcode: string | null
  stage: string
  pipeline: string
  project_type: string | null
  is_hot: boolean
  lead_source: string | null
  updated_at: string
  created_at: string
  users: { full_name: string } | null
}

interface Props {
  leads: Lead[]
  total: number
  page: number
  pageSize: number
}

export function LeadsTable({ leads, total, page, pageSize }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')

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

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4 max-w-sm">
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

      {/* Table */}
      <div className={cn('bg-white rounded-xl border border-gray-100 overflow-hidden', isPending && 'opacity-60')}>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stage</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">No leads found</td>
                </tr>
              ) : leads.map(lead => {
                const cfg = STAGE_CONFIG[lead.stage as Stage]
                return (
                  <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/leads/${lead.id}`} className="flex items-center gap-2 group">
                        {lead.is_hot && <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                        <span className="font-medium text-gray-900 group-hover:text-[var(--primary)]">{lead.name}</span>
                      </Link>
                      {lead.postcode && <p className="text-xs text-gray-400 mt-0.5 pl-5">{lead.postcode}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {lead.mobile && (
                        <a href={`tel:${lead.mobile}`} className="flex items-center gap-1 text-xs text-gray-600 hover:text-[var(--primary)]">
                          <Phone className="w-3 h-3" />{lead.mobile}
                        </a>
                      )}
                      {lead.email && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[150px]">{lead.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 capitalize">
                      {lead.project_type?.replace('_', ' ') ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg?.color ?? 'bg-gray-100 text-gray-600'}`}>
                        {cfg?.label ?? lead.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{lead.users?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDistanceToNow(lead.updated_at)}</td>
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
                    {lead.postcode ?? ''}{lead.postcode && lead.mobile ? ' · ' : ''}{lead.mobile ?? ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg?.color ?? 'bg-gray-100 text-gray-600'}`}>
                    {cfg?.label ?? lead.stage}
                  </span>
                  <span className="text-[10px] text-gray-400">{formatDistanceToNow(lead.updated_at)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <p className="text-gray-500">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
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
