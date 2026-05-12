import { Phone, Mail, MapPin, User, Tag } from 'lucide-react'
import { LEAD_SOURCE_LABELS } from '@/types'
import type { LeadSource } from '@/types'

interface Lead {
  name: string
  mobile: string | null
  email: string | null
  address: string | null
  postcode: string | null
  lead_source: string | null
  source_referrer: string | null
  tags: string[]
}

export function LeadContact({ lead }: { lead: Lead }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Contact Details</h2>
      <div className="space-y-2.5">
        <Row icon={<User className="w-4 h-4 text-gray-400" />} label="Name" value={lead.name} />
        {lead.mobile && (
          <a href={`tel:${lead.mobile}`} className="flex items-center gap-2.5 group">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 group-hover:text-[var(--primary)]">{lead.mobile}</span>
          </a>
        )}
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 group">
            <Mail className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 group-hover:text-[var(--primary)] truncate">{lead.email}</span>
          </a>
        )}
        {(lead.address || lead.postcode) && (
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              {lead.address && <p>{lead.address}</p>}
              {lead.postcode && <p className="font-mono">{lead.postcode}</p>}
            </div>
          </div>
        )}
        {lead.lead_source && (
          <Row
            icon={<Tag className="w-4 h-4 text-gray-400" />}
            label="Source"
            value={LEAD_SOURCE_LABELS[lead.lead_source as LeadSource] ?? lead.lead_source}
          />
        )}
        {lead.source_referrer && (
          <Row icon={<User className="w-4 h-4 text-gray-400" />} label="Referred by" value={lead.source_referrer} />
        )}
        {lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {lead.tags.map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">{label}</p>
        <p className="text-sm text-gray-700 truncate">{value}</p>
      </div>
    </div>
  )
}
