import { Building2, Ruler, PoundSterling, FileText } from 'lucide-react'
import { PROJECT_TYPE_LABELS } from '@/types'
import type { ProjectType } from '@/types'
import { formatBudget } from '@/utils/date'

interface Lead {
  project_type: string | null
  budget_min: number | null
  budget_max: number | null
  approx_size_sqm: number | null
  notes: string | null
  calculator_data: Record<string, unknown> | null
}

export function LeadProject({ lead }: { lead: Lead }) {
  const hasData = lead.project_type || lead.budget_min || lead.approx_size_sqm || lead.notes

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Project Details</h2>

      {!hasData && !lead.calculator_data ? (
        <p className="text-sm text-gray-400">No project details yet</p>
      ) : (
        <div className="space-y-2.5">
          {lead.project_type && (
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700">
                {PROJECT_TYPE_LABELS[lead.project_type as ProjectType] ?? lead.project_type}
              </span>
            </div>
          )}

          {(lead.budget_min || lead.budget_max) && (
            <div className="flex items-center gap-2.5">
              <PoundSterling className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700">
                {lead.budget_min && lead.budget_max
                  ? `${formatBudget(lead.budget_min)} – ${formatBudget(lead.budget_max)}`
                  : formatBudget(lead.budget_min ?? lead.budget_max)}
              </span>
            </div>
          )}

          {lead.approx_size_sqm && (
            <div className="flex items-center gap-2.5">
              <Ruler className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700">{lead.approx_size_sqm} m²</span>
            </div>
          )}

          {lead.notes && (
            <div className="flex items-start gap-2.5 mt-1">
              <FileText className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}

          {lead.calculator_data && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Calculator Submission</p>
              <div className="space-y-1">
                {Object.entries(lead.calculator_data).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="text-gray-700 font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
