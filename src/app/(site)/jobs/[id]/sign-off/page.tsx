export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignOffForm } from '@/components/leads/SignOffForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SiteSignOffPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lead } = await supabase
    .from('leads')
    .select('id, name, address, postcode, email, delivery_info')
    .eq('id', id)
    .single()

  if (!lead) notFound()

  const address = [lead.address, lead.postcode].filter(Boolean).join('\n')
  const deliveryInfo = (lead.delivery_info ?? {}) as Record<string, unknown>
  const buildApproval = (deliveryInfo.build_approval ?? null) as { initials: string; signed_at: string } | null

  return (
    <SignOffForm
      leadId={lead.id}
      customerName={lead.name}
      address={address}
      customerEmail={lead.email ?? null}
      backHref="/jobs"
      buildApproval={buildApproval}
    />
  )
}
