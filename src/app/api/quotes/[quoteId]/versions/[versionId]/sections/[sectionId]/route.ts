import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recalcVersionTotal } from '@/app/api/quotes/route'

interface Params { params: Promise<{ quoteId: string; versionId: string; sectionId: string }> }

// PATCH /api/quotes/[quoteId]/versions/[versionId]/sections/[sectionId]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { sectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['title', 'sort_order', 'show_subtotal', 'notes']
  const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('quote_sections')
    .update(patch)
    .eq('id', sectionId)
    .select('id, title, sort_order, show_subtotal, notes')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ section: data })
}

// DELETE /api/quotes/[quoteId]/versions/[versionId]/sections/[sectionId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { versionId, sectionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  // Cascade delete is set on quote_line_items, but we do it explicitly to be safe
  await adminAny.from('quote_line_items').delete().eq('section_id', sectionId)
  const { error } = await adminAny.from('quote_sections').delete().eq('id', sectionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recalculate version total
  await recalcVersionTotal(adminAny, versionId)

  return NextResponse.json({ success: true })
}
