import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Params { params: Promise<{ quoteId: string; versionId: string }> }

// GET: return a signed upload URL for a quote photo
export async function GET(req: NextRequest, { params }: Params) {
  const { quoteId, versionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const filename = req.nextUrl.searchParams.get('filename') ?? 'photo.jpg'
  const ext = filename.split('.').pop() ?? 'jpg'
  const storagePath = `${quoteId}/${versionId}/${Date.now()}.${ext}`

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from('quote-assets').createSignedUploadUrl(storagePath)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: publicData } = admin.storage.from('quote-assets').getPublicUrl(storagePath)

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: storagePath,
    publicUrl: publicData.publicUrl,
  })
}

// POST: record a successfully uploaded photo in quote_assets
export async function POST(req: NextRequest, { params }: Params) {
  const { quoteId: _quoteId, versionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { path, caption, sort_order } = body as { path: string; caption?: string; sort_order?: number }
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const { data: signedUrlData } = await admin.storage.from('quote-assets').createSignedUrl(path, 60 * 60 * 24 * 365)
  const imageUrl = signedUrlData?.signedUrl ?? path

  const { data: asset, error } = await adminAny
    .from('quote_assets')
    .insert({
      quote_version_id: versionId,
      asset_type: 'photo',
      image_url: imageUrl,
      caption: caption ?? null,
      sort_order: sort_order ?? 0,
      include_in_pdf: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ asset })
}
