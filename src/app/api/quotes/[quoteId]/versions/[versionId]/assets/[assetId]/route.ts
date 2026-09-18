import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Params { params: Promise<{ quoteId: string; versionId: string; assetId: string }> }

// PATCH /api/quotes/[quoteId]/versions/[versionId]/assets/[assetId]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { versionId, assetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const body = await req.json()
  const { data: asset, error } = await adminAny
    .from('quote_assets')
    .update(body)
    .eq('id', assetId)
    .eq('quote_version_id', versionId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ asset })
}

// DELETE /api/quotes/[quoteId]/versions/[versionId]/assets/[assetId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { versionId, assetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const { error } = await adminAny
    .from('quote_assets')
    .delete()
    .eq('id', assetId)
    .eq('quote_version_id', versionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
