'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ClipboardCheck, MapPin, List, CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, Archive, Wrench, MessageCircle, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Job {
  id: string
  name: string
  address: string
  mobile: string | null
  stage: string
  stageLabel: string
  stageColor: string
  jobDate: string | null
  jobEndDate: string | null
  signedOffAt: string | null
}

interface SnaggingJob {
  id: string
  name: string
  address: string
  mobile: string | null
  jobDate: string | null
  jobEndDate: string | null
  taskDescription: string | null
}

interface ArchivedJob {
  id: string
  name: string
  address: string
  jobDate: string | null
  signedOffAt: string | null
}

interface Props {
  jobs: Job[]
  snagging: SnaggingJob[]
  archive: ArchivedJob[]
}

// ── Date helpers ──────────────────────────────────────────────────

function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function formatDateRange(start: string, end: string | null) {
  const s = parseDate(start)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  if (!end || end === start) return fmt(s)
  return `${fmt(s)} – ${fmt(parseDate(end))}`
}

function formatDate(s: string) {
  return parseDate(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function jobsOnDay(jobs: Job[], day: Date): Job[] {
  return jobs.filter(j => {
    if (!j.jobDate) return false
    const start = parseDate(j.jobDate)
    const end = j.jobEndDate ? parseDate(j.jobEndDate) : start
    return day >= start && day <= end
  })
}

const byDate = (a: { jobDate: string | null }, b: { jobDate: string | null }) => {
  if (!a.jobDate && !b.jobDate) return 0
  if (!a.jobDate) return 1
  if (!b.jobDate) return -1
  return a.jobDate < b.jobDate ? -1 : 1
}

// ── Calendar view ────────────────────────────────────────────────

function CalendarView({ jobs }: { jobs: Job[] }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7
  const monthName = firstDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-base font-semibold text-gray-900">{monthName}</h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="bg-gray-50 min-h-[72px]" />
          const isToday = sameDay(day, today)
          const dayJobs = jobsOnDay(jobs, day)
          return (
            <div key={i} className={cn('bg-white min-h-[72px] p-1', isToday && 'bg-green-50')}>
              <p className={cn(
                'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1',
                isToday ? 'bg-green-700 text-white' : 'text-gray-500'
              )}>
                {day.getDate()}
              </p>
              <div className="space-y-0.5">
                {dayJobs.map(job => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}/sign-off`}
                    className={cn(
                      'block text-[10px] leading-tight rounded px-1 py-0.5 truncate',
                      job.signedOffAt ? 'bg-green-100 text-green-700' : 'bg-green-700 text-white hover:bg-green-800'
                    )}
                    title={job.name}
                  >
                    {job.signedOffAt ? '✓ ' : ''}{job.name}
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Job card ─────────────────────────────────────────────────────

function JobCard({ job }: { job: Job }) {
  const signedOff = !!job.signedOffAt
  const waNumber = job.mobile?.replace(/\D/g, '')
  const waFormatted = waNumber
    ? (waNumber.startsWith('44') ? waNumber : `44${waNumber.replace(/^0/, '')}`)
    : null

  return (
    <div className={cn(
      'bg-white rounded-xl border p-4 transition-all',
      signedOff ? 'border-green-200 opacity-60' : 'border-gray-200'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/leads/${job.id}`} className="font-semibold text-gray-900 hover:text-green-700 transition-colors">
              {job.name}
            </Link>
            {waFormatted && (
              <a
                href={`https://wa.me/${waFormatted}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-500 hover:text-green-600 shrink-0"
                title="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            )}
          </div>
          {job.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 mt-0.5 group"
            >
              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
              <p className="text-xs text-gray-500 truncate group-hover:text-green-700 group-hover:underline">{job.address}</p>
            </a>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${job.stageColor}`}>{job.stageLabel}</span>
            {job.jobDate && (
              <span className="text-xs text-gray-500">{formatDateRange(job.jobDate, job.jobEndDate)}</span>
            )}
          </div>
        </div>
        <div className="shrink-0 flex flex-col gap-2 items-end">
          <Link
            href={`/jobs/${job.id}/details`}
            className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FileText className="w-4 h-4" /> Job Details
          </Link>
          {signedOff ? (
            <div className="flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-medium px-3 py-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4" /> Signed off
            </div>
          ) : (
            <Link
              href={`/jobs/${job.id}/sign-off`}
              className="flex items-center gap-1.5 bg-orange-500 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              <ClipboardCheck className="w-4 h-4" /> Sign off
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Snagging card ────────────────────────────────────────────────

function SnaggingCard({ job }: { job: SnaggingJob }) {
  const waNumber = job.mobile?.replace(/\D/g, '')
  const waFormatted = waNumber
    ? (waNumber.startsWith('44') ? waNumber : `44${waNumber.replace(/^0/, '')}`)
    : null

  return (
    <div className="bg-white rounded-xl border border-orange-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{job.name}</span>
            {waFormatted && (
              <a
                href={`https://wa.me/${waFormatted}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-500 hover:text-green-600 shrink-0"
                title="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            )}
          </div>
          {job.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 mt-0.5 group"
            >
              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
              <p className="text-xs text-gray-500 truncate group-hover:text-orange-600 group-hover:underline">{job.address}</p>
            </a>
          )}
          {job.taskDescription && (
            <p className="text-xs text-gray-600 mt-1.5 leading-snug">{job.taskDescription}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {job.jobDate ? formatDateRange(job.jobDate, job.jobEndDate) : <span className="text-gray-300">Date TBC</span>}
          </p>
        </div>
        <div className="shrink-0 flex flex-col gap-2 items-end">
          <Link
            href={`/jobs/${job.id}/snagging`}
            className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Wrench className="w-4 h-4" /> Snagging Details
          </Link>
          <Link
            href={`/jobs/${job.id}/snagging`}
            className="flex items-center gap-1.5 bg-orange-500 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            <ClipboardCheck className="w-4 h-4" /> Sign off
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Archive card ──────────────────────────────────────────────────

function ArchiveCard({ job }: { job: ArchivedJob }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 opacity-70">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-700">{job.name}</p>
          {job.address && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
              <p className="text-xs text-gray-400 truncate">{job.address}</p>
            </div>
          )}
          {job.signedOffAt && (
            <p className="text-xs text-gray-400 mt-1.5">
              Completed {formatDate(job.signedOffAt.slice(0, 10))}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-1.5 bg-gray-100 text-gray-500 text-xs font-medium px-3 py-2 rounded-lg">
          <CheckCircle2 className="w-4 h-4" /> Done
        </div>
      </div>
    </div>
  )
}

// ── List view ────────────────────────────────────────────────────

function ListView({ jobs }: { jobs: Job[] }) {
  if (!jobs.length) {
    return <div className="text-center py-16 text-gray-400 text-sm">No active jobs at the moment</div>
  }

  return (
    <div className="space-y-2">
      {[...jobs].sort(byDate).map(job => <JobCard key={job.id} job={job} />)}
    </div>
  )
}

// ── Snagging view ────────────────────────────────────────────────

function SnaggingView({ snagging, archive }: { snagging: SnaggingJob[]; archive: ArchivedJob[] }) {
  const [showArchive, setShowArchive] = useState(false)

  if (showArchive) {
    return (
      <div>
        <button
          onClick={() => setShowArchive(false)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Snagging
        </button>
        <h2 className="font-semibold text-gray-900 mb-3">Archive</h2>
        {archive.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No archived jobs yet</div>
        ) : (
          <div className="space-y-2">
            {archive.map(job => <ArchiveCard key={job.id} job={job} />)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {snagging.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No jobs in snagging</div>
      ) : (
        <div className="space-y-2">
          {[...snagging].sort(byDate).map(job => <SnaggingCard key={job.id} job={job} />)}
        </div>
      )}
      {archive.length > 0 && (
        <button
          onClick={() => setShowArchive(true)}
          className="mt-6 w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
        >
          <Archive className="w-4 h-4" />
          View Archive ({archive.length})
        </button>
      )}
    </div>
  )
}

// ── Main export ──────────────────────────────────────────────────

export function JobsClient({ jobs, snagging, archive }: Props) {
  const [tab, setTab] = useState<'jobs' | 'snagging'>('jobs')
  const [view, setView] = useState<'list' | 'calendar'>('list')

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Jobs</h1>
        {tab === 'jobs' && (
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setView('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setView('calendar')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                view === 'calendar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Calendar
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setTab('jobs')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            tab === 'jobs'
              ? 'border-green-700 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Active Jobs
          <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{jobs.length}</span>
        </button>
        <button
          onClick={() => setTab('snagging')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            tab === 'snagging'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Snagging
          {snagging.length > 0 && (
            <span className="ml-1.5 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">{snagging.length}</span>
          )}
        </button>
      </div>

      {tab === 'jobs'
        ? view === 'list'
          ? <ListView jobs={jobs} />
          : <CalendarView jobs={jobs} />
        : <SnaggingView snagging={snagging} archive={archive} />
      }
    </div>
  )
}
