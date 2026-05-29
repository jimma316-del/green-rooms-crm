import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SiteShell } from '@/components/site/SiteShell'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role, full_name').eq('id', user.id).single()
  if (profile?.role !== 'site') redirect('/dashboard')

  return <SiteShell userName={profile?.full_name ?? ''}>{children}</SiteShell>
}
