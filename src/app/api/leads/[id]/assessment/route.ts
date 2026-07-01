import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (createAdminClient() as any)
    .from('site_assessments')
    .select('*')
    .eq('lead_id', id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ assessment: data ?? null })
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const admin = createAdminClient()

  // Upsert by lead_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any
  const { data: existing } = await adminAny
    .from('site_assessments')
    .select('id')
    .eq('lead_id', id)
    .single()

  const payload = {
    lead_id: id,
    created_by: user.id,
    updated_at: new Date().toISOString(),
    ...body,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any, error: any
  if (existing) {
    ;({ data, error } = await adminAny
      .from('site_assessments')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single())
  } else {
    ;({ data, error } = await adminAny
      .from('site_assessments')
      .insert(payload)
      .select()
      .single())
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assessment: data })
}
