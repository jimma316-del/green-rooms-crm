import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  // Extract standard fields — calculator submissions have richer data
  const name = body.name || body.full_name || body['Name'] || 'Calculator Lead'
  const email = body.email || body['Email'] || null
  const phone = body.phone || body.mobile || body['Phone'] || null
  const postcode = body.postcode || body['Postcode'] || null

  // Budget from calculator (may be string like "£25,000")
  let budget_min: number | null = null
  let budget_max: number | null = null
  if (body.estimated_price || body.estimate) {
    const raw = String(body.estimated_price || body.estimate).replace(/[^0-9]/g, '')
    const val = parseInt(raw)
    if (!isNaN(val)) {
      budget_min = Math.round(val * 100 * 0.9)  // -10% for range
      budget_max = Math.round(val * 100 * 1.1)  // +10% for range
    }
  }

  // Approximate size from calculator
  let size: number | null = null
  if (body.size || body.width) {
    const w = parseFloat(String(body.width || body.size || '0'))
    const d = parseFloat(String(body.depth || body.length || '0'))
    if (w > 0 && d > 0) size = w * d
    else if (w > 0) size = w
  }

  // Project type mapping
  const rawType = body.type || body.project_type || body['Project Type'] || ''
  const typeMap: Record<string, string> = {
    'garden room': 'garden_room',
    'office': 'office',
    'home office': 'office',
    'gym': 'gym',
    'fitness': 'gym',
    'golf': 'golf_sim',
    'golf simulator': 'golf_sim',
    'studio': 'studio',
  }
  const project_type = typeMap[rawType.toLowerCase()] || 'garden_room'

  // All calculator data saved verbatim
  const calculator_data = { ...body }

  const supabase = createAdminClient()

  const { data: lead, error } = await supabase.from('leads').insert({
    name,
    email,
    mobile: phone,
    postcode: postcode?.toUpperCase(),
    project_type,
    budget_min,
    budget_max,
    approx_size_sqm: size,
    lead_source: 'calculator',
    stage: 'new_lead',
    pipeline: 'sales',
    is_hot: false,
    tags: ['calculator_lead'],
    calculator_data,
    notes: `Calculator submission. Estimated: ${body.estimated_price || body.estimate || 'N/A'}`,
  }).select().single()

  if (error) {
    console.error('Calculator webhook error:', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }

  await supabase.from('activities').insert({
    lead_id: lead.id,
    created_by: lead.id,
    type: 'lead_created',
    body: 'Lead created from website calculator',
    metadata: { raw: body },
  })

  return NextResponse.json({ success: true, lead_id: lead.id })
}
