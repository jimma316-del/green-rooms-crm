import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoAdvanceSiteVisits, autoAdvanceToAwaitingPayment } from '@/lib/autoAdvance'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  await Promise.all([
    autoAdvanceSiteVisits(supabase),
    autoAdvanceToAwaitingPayment(supabase),
  ])

  return NextResponse.json({ ok: true })
}
