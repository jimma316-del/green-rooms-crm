import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { QuoteBuilder } from '@/components/leads/QuoteBuilder'
import type { SiteAssessment, LeadQuote } from '@/types/assessment'

interface Props { params: Promise<{ id: string; quoteId: string }> }

export default async function QuoteDetailPage({ params }: Props) {
  const { id, quoteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any
  const [{ data: lead }, { data: assessment }, { data: quote }] = await Promise.all([
    admin.from('leads').select('id, name').eq('id', id).single(),
    adminAny.from('site_assessments').select('*').eq('lead_id', id).single(),
    adminAny.from('lead_quotes').select('*').eq('id', quoteId).eq('lead_id', id).single(),
  ])

  if (!lead || !quote) notFound()

  return (
    <div>
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-4">
        <a href={`/leads/${id}`} className="text-xs text-gray-500 hover:text-gray-700">← {lead.name}</a>
        <span className="text-xs text-gray-300">|</span>
        <a href={`/leads/${id}/quote/${quoteId}/print`} target="_blank"
          className="text-xs text-[var(--primary)] hover:underline">
          Preview Proposal ↗
        </a>
      </div>
      <QuoteBuilder
        leadId={id}
        leadName={lead.name}
        assessment={assessment as SiteAssessment | null}
        existingQuote={quote as LeadQuote}
      />
    </div>
  )
}
