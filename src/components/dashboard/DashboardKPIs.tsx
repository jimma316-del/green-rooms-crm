import Link from 'next/link'
import { Users, CalendarCheck, FileText, PiggyBank, HardHat } from 'lucide-react'

interface KPIs {
  newLeads: number
  todayTasks: number
  quotesWaiting: number
  depositsOut: number
  jobsInProgress: number
}

const cards = [
  {
    key: 'newLeads' as const,
    label: 'New Leads',
    sublabel: 'this week',
    icon: Users,
    href: '/leads?stage=new_lead',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    key: 'todayTasks' as const,
    label: "Today's Tasks",
    sublabel: 'due today',
    icon: CalendarCheck,
    href: '/tasks',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    key: 'quotesWaiting' as const,
    label: 'Quotes Waiting',
    sublabel: '> 48hrs no response',
    icon: FileText,
    href: '/leads?stage=quote_sent',
    color: 'bg-orange-50 text-orange-600',
  },
  {
    key: 'depositsOut' as const,
    label: 'Deposits Outstanding',
    sublabel: 'awaiting payment',
    icon: PiggyBank,
    href: '/leads?stage=deposit_requested',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    key: 'jobsInProgress' as const,
    label: 'Jobs In Progress',
    sublabel: 'booked & in build',
    icon: HardHat,
    href: '/pipeline?view=project',
    color: 'bg-green-50 text-green-600',
  },
]

export function DashboardKPIs({ kpis }: { kpis: KPIs }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(({ key, label, sublabel, icon: Icon, href, color }) => (
        <Link
          key={key}
          href={href}
          className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 leading-none">{kpis[key]}</p>
            <p className="text-xs font-medium text-gray-700 mt-1 leading-tight">{label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{sublabel}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
