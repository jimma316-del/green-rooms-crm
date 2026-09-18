import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'

// GET /api/quote-templates
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('quote_templates')
    .select('*')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data ?? [] })
}

// POST /api/quote-templates
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const body = await req.json() as { name: string; description?: string; default_config?: object }
  if (!body.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const defaultConfig = body.default_config ?? {
    sections: [],
    payment_schedule: [
      { milestone: 'deposit',    label: 'Deposit on booking',         percentage: 10 },
      { milestone: 'day_1',      label: 'Day 1 — materials delivery', percentage: 50 },
      { milestone: 'plastering', label: 'Plastering / second fix',    percentage: 30 },
      { milestone: 'completion', label: 'Balance on completion',      percentage: 10 },
    ],
  }

  const { data: template, error } = await adminAny
    .from('quote_templates')
    .insert({ id: randomUUID(), name: body.name.trim(), description: body.description ?? null, default_config: defaultConfig, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template }, { status: 201 })
}
