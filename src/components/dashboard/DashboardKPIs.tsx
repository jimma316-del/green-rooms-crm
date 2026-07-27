import Link from 'next/link'
import { Users, CalendarCheck, FileText, MapPin, HardHat, Send, MessageCircle, Clock } from 'lucide-react'

interface KPIs {
  newLeads: number
  todayTasks: number
  quotesWaiting: number
  siteVisitsBooked: number
  jobsInProgress: number
  quoteSent: number
  inConversation: number
  followUp: number
}

const cards = [
  {
    key: 'todayTasks' as const,
    label: "Today's Tasks",
    sublabel: 'due today',
    icon: CalendarCheck,
    href: '/tasks',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    key: 'newLeads' as const,
    label: 'New Leads',
    sublabel: 'this week',
    icon: Users,
    href: '/leads?stage=new_lead',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    key: 'siteVisitsBooked' as const,
    label: 'Site Visits Booked',
    sublabel: 'upcoming visits',
    icon: MapPin,
    href: '/leads?stage=site_survey_booked',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    key: 'quotesWaiting' as const,
    label: 'Quotes To Prepare',
    sublabel: 'in quoting stage',
    icon: FileText,
    href: '/leads?stage=quoting',
    color: 'bg-orange-50 text-orange-600',
  },
  {
    key: 'quoteSent' as const,
    label: 'Quote Sent',
    sublabel: 'awaiting response',
    icon: Send,
    href: '/leads?stage=quote_sent',
    color: 'bg-yellow-50 text-yellow-600',
  },
  {
    key: 'inConversation' as const,
    label: 'In Conversation',
    sublabel: 'active discussions',
    icon: MessageCircle,
    href: '/leads?stage=in_conversation',
    color: 'bg-teal-50 text-teal-600',
  },
  {
    key: 'followUp' as const,
    label: 'Follow Up',
    sublabel: 'needs chasing',
    icon: Clock,
    href: '/leads?stage=followup',
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    key: 'jobsInProgress' as const,
    label: 'Jobs Booked',
    sublabel: 'booked & in build',
    icon: HardHat,
    href: '/pipeline?view=project',
    color: 'bg-green-50 text-green-600',
  },
]

export function DashboardKPIs({ kpis }: { kpis: KPIs }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map(({ key, label, sublabel, icon: Icon, href, color }) => (
        <Link
          key={key}
          href={href}
          className="bg-white rounded-xl border border-border p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--primary)] leading-none">{kpis[key]}</p>
            <p className="text-xs font-medium text-gray-700 mt-1 leading-tight">{label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{sublabel}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
