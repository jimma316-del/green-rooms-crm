import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Params { params: Promise<{ quoteId: string; versionId: string; milestoneId: string }> }

// PATCH /api/quotes/[quoteId]/versions/[versionId]/payment-schedule/[milestoneId]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { versionId, milestoneId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const body = await req.json() as {
    label?: string
    percentage?: number
    amount_pence?: number
    due_trigger?: string
    due_date?: string
    paid_at?: string | null
    payment_ref?: string | null
  }

  // If percentage changes, recalculate amount from version total
  const updates: Record<string, unknown> = { ...body }

  if (body.percentage !== undefined) {
    const { data: version } = await adminAny
      .from('quote_versions')
      .select('total_pence')
      .eq('id', versionId)
      .single()
    if (version) {
      updates.amount_pence = Math.round(version.total_pence * body.percentage / 100)
    }
  }

  const { data: milestone, error } = await adminAny
    .from('payment_schedules')
    .update(updates)
    .eq('id', milestoneId)
    .eq('quote_version_id', versionId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ milestone })
}
