'use client'

import { useState } from 'react'
import { Calendar, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Lead {
  id: string
  name: string
  mobile: string | null
  address: string | null
  city: string | null
  postcode: string | null
  stage: string
  pipeline: string
  site_visit_date: string | null
  job_date: string | null
  job_end_date: string | null
}

const PRE_VISIT_STAGES = ['new_lead']

function toCalendarDate(iso: string) {
  // Format: YYYYMMDDTHHmmss / YYYYMMDD
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}00`
  )
}

function fullAddress(lead: Lead) {
  return [lead.address, lead.city, lead.postcode].filter(Boolean).join(', ')
}

function siteVisitCalendarUrl(lead: Lead, date: string) {
  const start = toCalendarDate(date)
  const end = toCalendarDate(new Date(new Date(date).getTime() + 60 * 60 * 1000).toISOString())
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${lead.name} – Site Visit`,
    dates: `${start}/${end}`,
    details: [lead.mobile, fullAddress(lead)].filter(Boolean).join(' | '),
    location: fullAddress(lead),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

function jobCalendarUrl(lead: Lead, startDate: string, endDate: string) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  const start = fmt(new Date(startDate))
  const end = fmt(new Date(endDate + 'T00:00:00'))
  // Google Calendar end date for all-day events is exclusive, so add 1 day
  const endExclusive = new Date(endDate + 'T00:00:00')
  endExclusive.setDate(endExclusive.getDate() + 1)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${lead.name} – Job`,
    dates: `${start}/${fmt(endExclusive)}`,
    details: [lead.mobile, fullAddress(lead)].filter(Boolean).join(' | '),
    location: fullAddress(lead),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

export function LeadDates({ lead }: { lead: Lead }) {
  const supabase = createClient()
  const router = useRouter()

  const toLocalInput = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const [siteVisit, setSiteVisit] = useState(toLocalInput(lead.site_visit_date))
  const [jobDate, setJobDate] = useState(lead.job_date ?? '')
  const [jobEndDate, setJobEndDate] = useState(lead.job_end_date ?? '')
  const [saving, setSaving] = useState<'site' | 'job' | null>(null)

  async function save(field: 'site_visit_date' | 'job_date', value: string) {
    setSaving(field === 'site_visit_date' ? 'site' : 'job')
    const shouldAdvanceStage =
      field === 'site_visit_date' && value && PRE_VISIT_STAGES.includes(lead.stage)

    const update = field === 'site_visit_date'
      ? {
          site_visit_date: value ? new Date(value).toISOString() : null,
          ...(shouldAdvanceStage ? { stage: 'site_survey_booked', pipeline: 'sales' } : {}),
        }
      : { job_date: jobDate || null, job_end_date: jobEndDate || null }
    const { error } = await supabase
      .from('leads')
      .update(update)
      .eq('id', lead.id)
    if (error) {
      toast.error('Failed to save date')
      setSaving(null)
      return
    }

    // Auto-create a quote task when a site visit date is set
    if (field === 'site_visit_date' && value) {
      const { data: { user } } = await supabase.auth.getUser()
      const taskTitle = `${lead.name} Site Visit`
      // Only create if no incomplete task with this exact title exists
      const { data: existing } = await supabase
        .from('tasks')
        .select('id')
        .eq('lead_id', lead.id)
        .eq('title', taskTitle)
        .is('completed_at', null)
        .limit(1)

      if (!existing?.length) {
        await supabase.from('tasks').insert({
          lead_id: lead.id,
          created_by: user!.id,
          assigned_to: user!.id,
          title: taskTitle,
          type: 'in_person_meeting',
          priority: 'high',
          due_date: new Date(value).toISOString(),
        })
        toast.success('Date saved — site visit task created')
      } else {
        // Update the existing task's due date to match the new visit date
        await supabase.from('tasks')
          .update({ due_date: new Date(value).toISOString() })
          .eq('id', existing[0].id)
        toast.success('Date saved — site visit task updated')
      }
    } else {
      toast.success('Date saved')
    }

    router.refresh()
    setSaving(null)
  }

  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <h2 className="text-sm font-semibold text-[var(--primary)] mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-400" /> Dates
      </h2>

      <div className="space-y-4">
        {/* Site visit */}
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Site Visit</p>
          <input
            type="datetime-local"
            value={siteVisit}
            onChange={e => setSiteVisit(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => save('site_visit_date', siteVisit)}
              disabled={saving === 'site'}
              className="text-xs px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {saving === 'site' ? 'Saving…' : 'Save'}
            </button>
            {siteVisit && (
              <a
                href={siteVisitCalendarUrl(lead, new Date(siteVisit).toISOString())}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                <ExternalLink className="w-3 h-3" /> Add to Google Calendar
              </a>
            )}
          </div>
        </div>

        {/* Job date */}
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Job Dates</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-gray-400 mb-1">Start</p>
              <input
                type="date"
                value={jobDate}
                onChange={e => setJobDate(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">End</p>
              <input
                type="date"
                value={jobEndDate}
                min={jobDate}
                onChange={e => setJobEndDate(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => save('job_date', jobDate)}
              disabled={saving === 'job'}
              className="text-xs px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {saving === 'job' ? 'Saving…' : 'Save'}
            </button>
            {jobDate && jobEndDate && (
              <a
                href={jobCalendarUrl(lead, jobDate, jobEndDate)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                <ExternalLink className="w-3 h-3" /> Add to Google Calendar
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
