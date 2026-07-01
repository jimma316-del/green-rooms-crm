import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { QuoteBuilder } from '@/components/leads/QuoteBuilder'
import type { SiteAssessment, LeadQuote } from '@/types/assessment'

interface Props { params: Promise<{ id: string }> }

export default async function QuotePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any
  const [{ data: lead }, { data: assessment }, { data: quotes }] = await Promise.all([
    admin.from('leads').select('id, name').eq('id', id).single(),
    adminAny.from('site_assessments').select('*').eq('lead_id', id).single(),
    adminAny.from('lead_quotes').select('id').eq('lead_id', id).order('created_at', { ascending: false }).limit(1),
  ])

  if (!lead) notFound()

  // If a quote already exists, redirect to it
  if (quotes && quotes.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    redirect(`/leads/${id}/quote/${(quotes[0] as any).id}`)
  }

  return (
    <div>
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <a href={`/leads/${id}`} className="text-xs text-gray-500 hover:text-gray-700">← {lead.name}</a>
      </div>
      <QuoteBuilder
        leadId={id}
        leadName={lead.name}
        assessment={assessment as SiteAssessment | null}
        existingQuote={null}
      />
    </div>
  )
}
