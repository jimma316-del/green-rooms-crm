import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { JobDetails } from '@/components/site/JobDetails'

type Category = 'job_spec' | 'cut_list' | 'elevation'
type FileEntry = { url: string; name: string; uploaded_at: string }

interface Props {
  params: Promise<{ id: string }>
}

export default async function JobDetailsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [{ data: lead }, { data: profile }] = await Promise.all([
    supabase
      .from('leads')
      .select('id, name, address, postcode, job_files')
      .eq('id', id)
      .single(),
    supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single(),
  ])

  if (!lead) notFound()

  const address = [lead.address, lead.postcode].filter(Boolean).join(', ')
  const canUpload = profile?.role !== 'site'

  return (
    <JobDetails
      leadId={lead.id}
      name={lead.name}
      address={address}
      canUpload={canUpload}
      jobFiles={(lead.job_files ?? {}) as Partial<Record<Category, FileEntry[]>>}
    />
  )
}
