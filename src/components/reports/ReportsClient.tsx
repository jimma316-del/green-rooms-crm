'use client'

import { useState } from 'react'
import { Users, Globe, ExternalLink, TrendingUp, Eye, MousePointerClick, Clock } from 'lucide-react'

interface Contact {
  id: string
  properties: {
    firstname?: string
    lastname?: string
    email?: string
    phone?: string
    hs_analytics_source?: string
    hs_analytics_last_url?: string
    hs_analytics_num_page_views?: string
    hs_analytics_num_visits?: string
    hs_analytics_last_visit_timestamp?: string
    hs_analytics_first_visit_timestamp?: string
    hs_latest_source?: string
    hs_latest_source_data_1?: string
    createdate?: string
    lastmodifieddate?: string
  }
  crmLead: { id: string; name: string; stage: string } | null
}

interface Source {
  source: string
  count: number
}

interface Props {
  contacts: Contact[]
  sources: Source[]
  totalContacts: number
}

function formatSource(src: string): string {
  const map: Record<string, string> = {
    ORGANIC_SEARCH: 'Organic Search',
    DIRECT_TRAFFIC: 'Direct',
    REFERRALS: 'Referral',
    SOCIAL_MEDIA: 'Social Media',
    EMAIL_MARKETING: 'Email',
    PAID_SEARCH: 'Paid Search',
    OTHER_CAMPAIGNS: 'Campaign',
    OFFLINE: 'Offline',
  }
  return map[src] ?? src.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())
}

function formatDate(ts: string | undefined): string {
  if (!ts) return '—'
  const d = new Date(Number(ts))
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatUrl(url: string | undefined): string {
  if (!url) return '—'
  try {
    const u = new URL(url)
    return u.pathname === '/' ? 'Homepage' : u.pathname
  } catch {
    return url
  }
}

const STAGE_LABELS: Record<string, string> = {
  new_lead: 'New Lead',
  in_conversation: 'In Conversation',
  quote_sent: 'Quote Sent',
  followup: 'No Response',
  job_booked: 'Job Booked',
  completed: 'Completed',
  lost: 'Lost',
}

const STAGE_COLOURS: Record<string, string> = {
  new_lead: 'bg-blue-100 text-blue-700',
  in_conversation: 'bg-yellow-100 text-yellow-700',
  quote_sent: 'bg-orange-100 text-orange-700',
  followup: 'bg-gray-100 text-gray-600',
  job_booked: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-600',
}

export default function ReportsClient({ contacts, sources, totalContacts }: Props) {
  const [search, setSearch] = useState('')

  const filtered = contacts.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    const { firstname, lastname, email } = c.properties
    return (
      firstname?.toLowerCase().includes(q) ||
      lastname?.toLowerCase().includes(q) ||
      email?.toLowerCase().includes(q) ||
      c.crmLead?.name.toLowerCase().includes(q)
    )
  })

  const crmMatches = contacts.filter(c => c.crmLead).length

  return (
    <div className="px-4 md:px-6 py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">HubSpot visitor data — identified contacts who visited the website</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Identified contacts</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalContacts}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <MousePointerClick className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">In CRM</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{crmMatches}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Total page views</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {contacts.reduce((sum, c) => sum + Number(c.properties.hs_analytics_num_page_views ?? 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Total visits</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {contacts.reduce((sum, c) => sum + Number(c.properties.hs_analytics_num_visits ?? 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Traffic sources */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-800 text-sm">Traffic sources</h2>
          </div>
          <div className="space-y-2">
            {sources.length === 0 && <p className="text-sm text-gray-400">No data</p>}
            {sources.map(({ source, count }) => {
              const pct = totalContacts > 0 ? Math.round((count / totalContacts) * 100) : 0
              return (
                <div key={source}>
                  <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                    <span>{formatSource(source)}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Contacts list */}
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 text-sm">Identified visitors</h2>
            <input
              type="search"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 w-40"
            />
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">No contacts found</p>
            )}
            {filtered.map(contact => {
              const { firstname, lastname, email, hs_analytics_num_visits, hs_analytics_num_page_views, hs_analytics_last_visit_timestamp, hs_latest_source, hs_analytics_last_url } = contact.properties
              const name = [firstname, lastname].filter(Boolean).join(' ') || email || 'Unknown'
              return (
                <div
                  key={contact.id}
                  className={`rounded-lg border p-3 ${contact.crmLead ? 'border-orange-200 bg-orange-50/40' : 'border-gray-100'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                      {email && <p className="text-xs text-gray-400 truncate">{email}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {contact.crmLead && (
                        <a
                          href={`/leads/${contact.crmLead.id}`}
                          className="text-xs text-orange-600 hover:underline flex items-center gap-1"
                        >
                          {contact.crmLead.name}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {contact.crmLead && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STAGE_COLOURS[contact.crmLead.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STAGE_LABELS[contact.crmLead.stage] ?? contact.crmLead.stage}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {hs_analytics_num_visits && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {hs_analytics_num_visits} visit{Number(hs_analytics_num_visits) !== 1 ? 's' : ''}
                      </span>
                    )}
                    {hs_analytics_num_page_views && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {hs_analytics_num_page_views} pages
                      </span>
                    )}
                    {hs_analytics_last_visit_timestamp && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Last: {formatDate(hs_analytics_last_visit_timestamp)}
                      </span>
                    )}
                    {hs_latest_source && (
                      <span className="text-xs text-gray-400">{formatSource(hs_latest_source)}</span>
                    )}
                  </div>
                  {hs_analytics_last_url && (
                    <p className="text-xs text-gray-400 mt-1 truncate">Last page: {formatUrl(hs_analytics_last_url)}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
