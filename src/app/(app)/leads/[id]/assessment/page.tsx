import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AssessmentForm } from '@/components/leads/AssessmentForm'
import type { SiteAssessment } from '@/types/assessment'

interface Props { params: Promise<{ id: string }> }

export default async function AssessmentPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = createAdminClient()

  const [{ data: lead }, { data: assessment }] = await Promise.all([
    admin.from('leads').select('id, name').eq('id', id).single(),
    admin.from('site_assessments').select('*').eq('lead_id', id).single(),
  ])

  if (!lead) notFound()

  return (
    <div>
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <a href={`/leads/${id}`} className="text-xs text-gray-500 hover:text-gray-700">← {lead.name}</a>
      </div>
      <AssessmentForm leadId={id} initial={assessment as SiteAssessment | null} />
    </div>
  )
}
