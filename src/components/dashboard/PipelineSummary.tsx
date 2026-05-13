import Link from 'next/link'
import { STAGE_CONFIG, SALES_STAGES, PROJECT_STAGES } from '@/types'
import type { Stage } from '@/types'

interface StageRow { stage: string; pipeline: string }

export function PipelineSummary({ leads }: { leads: StageRow[] }) {
  const counts: Record<string, number> = {}
  for (const l of leads) {
    counts[l.stage] = (counts[l.stage] ?? 0) + 1
  }

  return (
    <div className="mt-4 bg-white rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--primary)]">Sales Pipeline</h2>
        <Link href="/pipeline" className="text-xs text-[var(--primary)] hover:underline">View board →</Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SALES_STAGES.map(stage => {
          const cfg = STAGE_CONFIG[stage as Stage]
          const count = counts[stage] ?? 0
          return (
            <Link
              key={stage}
              href={`/pipeline?stage=${stage}`}
              className="flex flex-col items-center min-w-[80px] px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <span className={`text-lg font-bold ${count > 0 ? 'text-[var(--primary)]' : 'text-gray-300'}`}>
                {count}
              </span>
              <span className="text-[10px] text-gray-500 leading-tight mt-0.5 whitespace-nowrap">{cfg.label}</span>
            </Link>
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-3 mb-3">
        <h2 className="text-sm font-semibold text-[var(--primary)]">Project Pipeline</h2>
        <Link href="/pipeline?view=project" className="text-xs text-[var(--primary)] hover:underline">View board →</Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PROJECT_STAGES.map(stage => {
          const cfg = STAGE_CONFIG[stage as Stage]
          const count = counts[stage] ?? 0
          return (
            <Link
              key={stage}
              href={`/pipeline?view=project&stage=${stage}`}
              className="flex flex-col items-center min-w-[80px] px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              <span className={`text-lg font-bold ${count > 0 ? 'text-[var(--primary)]' : 'text-gray-300'}`}>
                {count}
              </span>
              <span className="text-[10px] text-gray-500 leading-tight mt-0.5 whitespace-nowrap">{cfg.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
