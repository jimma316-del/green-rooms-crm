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
    .select('id, name, address, postcode, email')
    .eq('id', id)
    .single()

  if (!lead) notFound()

  const address = [lead.address, lead.postcode].filter(Boolean).join('\n')

  return (
    <SignOffForm
      leadId={lead.id}
      customerName={lead.name}
      address={address}
      customerEmail={lead.email ?? null}
      backHref="/jobs"
    />
  )
}
