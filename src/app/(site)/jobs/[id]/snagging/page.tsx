import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SnaggingSignOff } from '@/components/site/SnaggingSignOff'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SnaggingPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lead } = await supabase
    .from('leads')
    .select('id, name, address, postcode, snagging_signed_off_at')
    .eq('id', id)
    .single()

  if (!lead) notFound()
  if (lead.snagging_signed_off_at) redirect('/jobs')

  return (
    <SnaggingSignOff
      leadId={id}
      name={lead.name}
      address={[lead.address, lead.postcode].filter(Boolean).join(', ')}
    />
  )
}
