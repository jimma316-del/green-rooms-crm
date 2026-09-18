export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { QuotesDashboardClient } from '@/components/quotes/QuotesDashboardClient'
import { notFound } from 'next/navigation'

export default async function QuotesDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  // Load all quotes with their current version and lead info
  const { data: rows } = await adminAny
    .from('quotes')
    .select(`
      id, quote_ref, created_at,
      leads (
        id, name, email, address, postcode
      ),
      quote_versions (
        id, version_number, status, total_pence, is_current,
        created_at, sent_at, viewed_at, responded_at, client_token
      )
    `)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quotes = (rows ?? []).map((q: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const versions: any[] = q.quote_versions ?? []
    const current = versions.find((v: { is_current: boolean }) => v.is_current)
      ?? versions.sort((a: { version_number: number }, b: { version_number: number }) => b.version_number - a.version_number)[0]
    return { ...q, currentVersion: current }
  })

  return (
    <div className="px-4 md:px-6 py-6 max-w-6xl">
      <QuotesDashboardClient quotes={quotes} />
    </div>
  )
}
