import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SiteShell } from '@/components/site/SiteShell'
import { AppShell } from '@/components/layout/AppShell'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role, full_name').eq('id', user.id).single()

  // Site team get the minimal layout; everyone else gets the full CRM sidebar
  if (profile?.role === 'site') {
    return <SiteShell userName={profile?.full_name ?? ''}>{children}</SiteShell>
  }

  return <AppShell>{children}</AppShell>
}
