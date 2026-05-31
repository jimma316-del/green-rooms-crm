'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ClipboardCheck, MapPin, List, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Job {
  id: string
  name: string
  address: string
  stage: string
  stageLabel: string
  stageColor: string
  jobDate: string | null
  jobEndDate: string | null
}

// ── Calendar helpers ─────────────────────────────────────────────

function parseDate(s: string) {
  // job_date is stored as 'YYYY-MM-DD'
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function jobsOnDay(jobs: Job[], day: Date): Job[] {
  return jobs.filter(j => {
    if (!j.jobDate) return false
    const start = parseDate(j.jobDate)
    const end = j.jobEndDate ? parseDate(j.jobEndDate) : start
    return day >= start && day <= end
  })
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
  // Monday-first: 0=Mon … 6=Sun
  const startOffset = (firstDay.getDay() + 6) % 7

  const monthName = firstDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-base font-semibold text-gray-900">{monthName}</h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="bg-gray-50 min-h-[72px]" />
          const isToday = sameDay(day, today)
          const dayJobs = jobsOnDay(jobs, day)
          return (
            <div
              key={i}
              className={cn(
                'bg-white min-h-[72px] p-1',
                isToday && 'bg-green-50'
              )}
            >
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
                    className="block text-[10px] leading-tight bg-green-700 text-white rounded px-1 py-0.5 truncate hover:bg-green-800"
                    title={job.name}
                  >
                    {job.name}
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend - jobs with no date */}
      {jobs.filter(j => !j.jobDate).length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-gray-400 mb-2">Not yet scheduled:</p>
          <div className="space-y-1">
            {jobs.filter(j => !j.jobDate).map(job => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}/sign-off`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-green-400 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">{job.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${job.stageColor}`}>{job.stageLabel}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── List view ────────────────────────────────────────────────────

function ListView({ jobs }: { jobs: Job[] }) {
  if (!jobs.length) {
    return <div className="text-center py-16 text-gray-400 text-sm">No active jobs at the moment</div>
  }

  // Split: scheduled vs unscheduled
  const scheduled = jobs.filter(j => j.jobDate).sort((a, b) => a.jobDate!.localeCompare(b.jobDate!))
  const unscheduled = jobs.filter(j => !j.jobDate)

  function formatDateRange(start: string, end: string | null) {
    const s = parseDate(start)
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    if (!end || end === start) return fmt(s)
    return `${fmt(s)} – ${fmt(parseDate(end))}`
  }

  return (
    <div className="space-y-2">
      {scheduled.map(job => (
        <Link
          key={job.id}
          href={`/jobs/${job.id}/sign-off`}
          className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-green-400 hover:shadow-sm transition-all active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{job.name}</p>
              {job.address && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                  <p className="text-xs text-gray-500 truncate">{job.address}</p>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${job.stageColor}`}>
                  {job.stageLabel}
                </span>
                {job.jobDate && (
                  <span className="text-xs text-gray-500">
                    {formatDateRange(job.jobDate, job.jobEndDate)}
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 bg-green-700 text-white text-xs font-medium px-3 py-2 rounded-lg">
              <ClipboardCheck className="w-4 h-4" />
              Sign off
            </div>
          </div>
        </Link>
      ))}

      {unscheduled.length > 0 && (
        <>
          <p className="text-xs text-gray-400 pt-2 pb-1">Not yet scheduled</p>
          {unscheduled.map(job => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}/sign-off`}
              className="block bg-white rounded-xl border border-dashed border-gray-200 p-4 hover:border-green-400 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{job.name}</p>
                  {job.address && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                      <p className="text-xs text-gray-500 truncate">{job.address}</p>
                    </div>
                  )}
                  <span className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${job.stageColor}`}>
                    {job.stageLabel}
                  </span>
                </div>
                <div className="shrink-0 flex items-center gap-1.5 bg-green-700 text-white text-xs font-medium px-3 py-2 rounded-lg">
                  <ClipboardCheck className="w-4 h-4" />
                  Sign off
                </div>
              </div>
            </Link>
          ))}
        </>
      )}
    </div>
  )
}

// ── Main export ──────────────────────────────────────────────────

export function JobsClient({ jobs }: { jobs: Job[] }) {
  const [view, setView] = useState<'list' | 'calendar'>('list')

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500">{jobs.length} in project pipeline</p>
        </div>
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
      </div>

      {view === 'list' ? <ListView jobs={jobs} /> : <CalendarView jobs={jobs} />}
    </div>
  )
}
