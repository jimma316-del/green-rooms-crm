export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { JobDetails } from '@/components/site/JobDetails'

type Category = 'job_spec' | 'cut_list' | 'elevation'
type FileEntry = { url: string; name: string; uploaded_at: string }
type DeliveryInfo = {
  doors_windows?: string | null
  champion?: string | null
  sips?: string | null
  cladding?: string | null
  rubber_roof?: string | null
  plasterboard?: string | null
  notes?: string
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function JobDetailsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [{ data: lead }, { data: profile }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('leads')
      .select('id, name, address, address_line_2, city, postcode, job_files, delivery_info, xero_quote_url, payment_1_amount, payment_1_due, payment_2_amount, payment_2_due')
      .eq('id', id)
      .single(),
    supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single(),
  ])

  if (!lead) notFound()

  const address = [lead.address, lead.address_line_2, lead.city, lead.postcode].filter(Boolean).join(', ')
  const canUpload = profile?.role !== 'site'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedLead = lead as any

  return (
    <JobDetails
      leadId={lead.id}
      name={lead.name}
      address={address}
      canUpload={canUpload}
      jobFiles={(lead.job_files ?? {}) as Partial<Record<Category, FileEntry[]>>}
      deliveryInfo={(lead.delivery_info ?? {}) as DeliveryInfo}
      jobSpecUrl={lead.xero_quote_url ?? null}
      payment1Amount={typedLead.payment_1_amount ?? null}
      payment1Due={typedLead.payment_1_due ?? null}
      payment2Amount={typedLead.payment_2_amount ?? null}
      payment2Due={typedLead.payment_2_due ?? null}
    />
  )
}
