export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TermsClient } from '@/components/quotes/TermsClient'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function TermsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: versions } = await (admin as any)
    .from('tc_versions')
    .select('id, version_tag, content_html, is_current, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="px-4 md:px-6 py-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Terms &amp; Conditions</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage the T&amp;Cs included in all PDF quotes</p>
        </div>
      </div>

      <TermsClient initialVersions={versions ?? []} />
    </div>
  )
}
