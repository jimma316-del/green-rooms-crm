import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AssessmentQuoteClient } from '@/components/leads/AssessmentQuoteClient'
import { generateXeroLineItems } from '@/lib/quote-generator'
import type { SiteAssessment } from '@/types/assessment'

interface Props { params: Promise<{ id: string }> }

export default async function AssessmentQuotePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const [{ data: lead }, { data: assessment }] = await Promise.all([
    adminAny.from('leads').select('id, name, email, address, postcode').eq('id', id).single(),
    adminAny.from('site_assessments').select('*').eq('lead_id', id).single(),
  ])

  if (!lead) notFound()
  if (!assessment) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 mb-4">No site assessment found for this lead.</p>
        <a href={`/leads/${id}/assessment`} className="text-sm text-[var(--primary)] font-medium hover:underline">
          Start assessment →
        </a>
      </div>
    )
  }

  const lineItems = generateXeroLineItems(assessment as unknown as Partial<SiteAssessment>)

  return (
    <AssessmentQuoteClient
      leadId={id}
      leadName={lead.name}
      initialItems={lineItems}
    />
  )
}
