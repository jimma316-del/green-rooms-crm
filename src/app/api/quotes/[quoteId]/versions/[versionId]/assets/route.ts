import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'

interface Params { params: Promise<{ quoteId: string; versionId: string }> }

// GET /api/quotes/[quoteId]/versions/[versionId]/assets
export async function GET(_req: NextRequest, { params }: Params) {
  const { versionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('quote_assets')
    .select('*')
    .eq('quote_version_id', versionId)
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assets: data ?? [] })
}

// POST /api/quotes/[quoteId]/versions/[versionId]/assets — save elevation SVG
export async function POST(req: NextRequest, { params }: Params) {
  const { versionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const body = await req.json() as {
    asset_type: string
    elevation_face?: string
    svg_data?: string
    caption?: string
    width_mm?: number
    height_mm?: number
    sort_order?: number
  }

  const { data: asset, error } = await adminAny
    .from('quote_assets')
    .insert({
      id: randomUUID(),
      quote_version_id: versionId,
      asset_type: body.asset_type ?? 'elevation_svg',
      elevation_face: body.elevation_face ?? null,
      svg_data: body.svg_data ?? null,
      caption: body.caption ?? null,
      width_mm: body.width_mm ?? null,
      height_mm: body.height_mm ?? null,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ asset }, { status: 201 })
}
