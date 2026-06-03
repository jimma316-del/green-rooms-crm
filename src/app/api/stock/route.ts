import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// POST: add a new stock item
export async function POST(req: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name } = await req.json() as { name: string }
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: last } = await admin.from('stock_items').select('order_index').order('order_index', { ascending: false }).limit(1).single()
  const order_index = (last?.order_index ?? -1) + 1

  const { data, error } = await admin.from('stock_items').insert({ name: name.trim(), order_index }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH: update notes
export async function PATCH(req: NextRequest) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { notes } = await req.json() as { notes: string }
  const admin = createAdminClient()
  const { error } = await admin.from('stock_notes').upsert({ id: 1, notes: notes ?? '' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
