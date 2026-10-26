import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    payment_1_amount: number | null
    payment_1_due: string | null
    payment_2_amount: number | null
    payment_2_due: string | null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('leads') as any)
    .update({
      payment_1_amount: body.payment_1_amount,
      payment_1_due:    body.payment_1_due,
      payment_2_amount: body.payment_2_amount,
      payment_2_due:    body.payment_2_due,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
