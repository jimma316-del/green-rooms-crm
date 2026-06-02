import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CATEGORIES = ['job_spec', 'cut_list', 'elevation'] as const
type Category = typeof CATEGORIES[number]

type FileEntry = { url: string; name: string; uploaded_at: string }
type JobFiles = Partial<Record<Category, FileEntry[]>>

async function requireUploader() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!profile || profile.role === 'site') return null
  return user
}

// GET: return a signed upload URL (direct-to-Supabase, bypasses Vercel limit)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUploader()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const url = new URL(req.url)
  const filename = url.searchParams.get('filename') ?? 'file'
  const category = url.searchParams.get('category') as Category
  if (!CATEGORIES.includes(category)) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })

  const ext = filename.split('.').pop() ?? 'pdf'
  const path = `${id}/${category}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from('job-files').createSignedUploadUrl(path)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: urlData } = admin.storage.from('job-files').getPublicUrl(path)
  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path, publicUrl: urlData.publicUrl })
}

// POST: record a successfully uploaded file
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUploader()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { category, filename, url } = await req.json() as { category: Category; filename: string; url: string }
  if (!CATEGORIES.includes(category)) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })

  const admin = createAdminClient()
  const { data: lead } = await admin.from('leads').select('job_files').eq('id', id).single()
  const jobFiles = ((lead?.job_files ?? {}) as JobFiles)
  if (!jobFiles[category]) jobFiles[category] = []
  jobFiles[category]!.push({ url, name: filename, uploaded_at: new Date().toISOString() })

  const { error } = await admin.from('leads').update({ job_files: jobFiles }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE: remove a file from storage and the lead record
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUploader()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { category, url } = await req.json() as { category: Category; url: string }

  const admin = createAdminClient()

  const storagePath = url.split('/job-files/').pop()
  if (storagePath) await admin.storage.from('job-files').remove([storagePath])

  const { data: lead } = await admin.from('leads').select('job_files').eq('id', id).single()
  const jobFiles = ((lead?.job_files ?? {}) as JobFiles)
  if (jobFiles[category]) {
    jobFiles[category] = jobFiles[category]!.filter(f => f.url !== url)
  }

  const { error } = await admin.from('leads').update({ job_files: jobFiles }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
