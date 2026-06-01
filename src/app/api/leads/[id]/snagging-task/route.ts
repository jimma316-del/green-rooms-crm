import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { taskId, notes } = await req.json() as { taskId: string | null; notes: string }
  const admin = createAdminClient()

  if (taskId) {
    // Update existing task
    const { error } = await admin
      .from('tasks')
      .update({ notes: notes.trim() || null })
      .eq('id', taskId)
      .eq('lead_id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, taskId })
  } else {
    // Find an admin user to assign the task to
    const { data: adminUser } = await admin.from('users').select('id').in('role', ['admin', 'sales']).limit(1).single()
    const userId = adminUser?.id
    if (!userId) return NextResponse.json({ error: 'No admin user found' }, { status: 500 })

    // Create a new snagging task for leads moved manually (no task exists)
    const { data, error } = await admin
      .from('tasks')
      .insert({
        lead_id: id,
        created_by: userId,
        assigned_to: userId,
        title: 'Snagging',
        type: 'snagging',
        notes: notes.trim() || null,
        priority: 'normal',
      })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, taskId: data.id })
  }
}
