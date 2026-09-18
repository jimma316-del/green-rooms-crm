import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'

// GET /api/tc-versions
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('tc_versions')
    .select('id, version_tag, content_html, is_current, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ versions: data ?? [] })
}

// POST /api/tc-versions — create new T&C version
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const body = await req.json() as { version_tag: string; content_html: string; make_current?: boolean }
  if (!body.version_tag?.trim()) return NextResponse.json({ error: 'version_tag required' }, { status: 400 })
  if (!body.content_html?.trim()) return NextResponse.json({ error: 'content_html required' }, { status: 400 })

  // If making current, unset any existing current first
  if (body.make_current) {
    await adminAny.from('tc_versions').update({ is_current: false }).eq('is_current', true)
  }

  const { data: version, error } = await adminAny
    .from('tc_versions')
    .insert({
      id: randomUUID(),
      version_tag: body.version_tag.trim(),
      content_html: body.content_html,
      is_current: body.make_current ?? false,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ version }, { status: 201 })
}
