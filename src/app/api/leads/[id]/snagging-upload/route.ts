import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { data, error } = await admin.storage
    .from('snagging-media')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: urlData } = admin.storage.from('snagging-media').getPublicUrl(data.path)
  const url = urlData.publicUrl

  // Save as activity so it persists across page loads
  await admin.from('activities').insert({
    lead_id: id,
    created_by: null,
    type: 'snagging_photo',
    body: null,
    metadata: { url },
  })

  return NextResponse.json({ url })
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
