import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Params { params: Promise<{ quoteId: string; versionId: string }> }

// POST /api/quotes/[quoteId]/versions/[versionId]/sections
export async function POST(req: NextRequest, { params }: Params) {
  const { versionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('quote_sections')
    .insert({
      quote_version_id: versionId,
      title: body.title ?? 'New Section',
      sort_order: body.sort_order ?? 99,
      notes: body.notes ?? null,
    })
    .select('id, title, sort_order, notes')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ section: { ...data, quote_line_items: [] } })
}
