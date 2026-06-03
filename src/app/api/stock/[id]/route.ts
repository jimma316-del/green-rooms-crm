import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// PATCH: toggle needs_reorder or rename
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const admin = createAdminClient()

  const { error } = await admin.from('stock_items').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // When marking for reorder: create a high-priority task if none exists
  if (body.needs_reorder === true) {
    const { data: item } = await admin.from('stock_items').select('name').eq('id', id).single()
    if (item) {
      const title = `Order: ${item.name}`
      // Check for an existing open task for this stock item
      const { data: existing } = await admin
        .from('tasks')
        .select('id')
        .eq('title', title)
        .eq('type', 'stock')
        .is('completed_at', null)
        .limit(1)
        .maybeSingle()

      if (!existing) {
        const { error: taskErr } = await admin.from('tasks').insert({
          title,
          type: 'stock',
          priority: 'high',
          lead_id: null as unknown as string,
          created_by: user.id,
          assigned_to: user.id,
        })
        if (taskErr) console.error('[Stock] task insert error:', taskErr)
      }
    }
  }

  // When un-marking: complete any open stock task for this item
  if (body.needs_reorder === false) {
    const { data: item } = await admin.from('stock_items').select('name').eq('id', id).single()
    if (item) {
      const title = `Order: ${item.name}`
      await admin
        .from('tasks')
        .update({ completed_at: new Date().toISOString(), completed_by: user.id })
        .eq('title', title)
        .eq('type', 'stock')
        .is('completed_at', null)
    }
  }

  return NextResponse.json({ ok: true })
}

// DELETE: remove item
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const admin = createAdminClient()
  const { error } = await admin.from('stock_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
