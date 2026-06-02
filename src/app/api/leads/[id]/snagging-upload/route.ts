import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Step 1: generate a signed upload URL so the client can upload directly to Supabase
// (bypasses Vercel's 4.5 MB request-body limit)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const filename = new URL(req.url).searchParams.get('filename') ?? 'file'
    const ext = filename.split('.').pop() ?? 'jpg'
    const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const admin = createAdminClient()
    const { data, error } = await admin.storage.from('snagging-media').createSignedUploadUrl(path)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: urlData } = admin.storage.from('snagging-media').getPublicUrl(path)

    return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path, publicUrl: urlData.publicUrl })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

// Step 2: record the activity after the client has uploaded directly to Supabase
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { url } = await req.json() as { url: string }
    if (!url) return NextResponse.json({ error: 'No url provided' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin.from('activities').insert({
      lead_id: id,
      created_by: null,
      type: 'snagging_photo',
      body: null,
      metadata: { url },
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ url })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()
  const { url } = await req.json() as { url: string }

  const path = url.split('/snagging-media/').pop()
  if (path) await admin.storage.from('snagging-media').remove([path])

  await admin.from('activities')
    .delete()
    .eq('lead_id', id)
    .eq('type', 'snagging_photo')
    .contains('metadata', { url })

  return NextResponse.json({ ok: true })
}
