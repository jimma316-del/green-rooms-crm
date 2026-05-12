import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  // Map common Webflow field names to CRM schema
  const name = body.name || body.full_name || body['Name'] || body['Full Name'] || 'Unknown'
  const email = body.email || body['Email'] || null
  const phone = body.phone || body.mobile || body['Phone'] || body['Mobile'] || null
  const message = body.message || body.notes || body['Message'] || null
  const postcode = body.postcode || body['Postcode'] || null
  const project = body.project_type || body['Project Type'] || null

  const supabase = createAdminClient()

  const { data: lead, error } = await supabase.from('leads').insert({
    name,
    email,
    mobile: phone,
    notes: message,
    postcode: postcode?.toUpperCase(),
    project_type: project,
    lead_source: 'website_form',
    stage: 'new_lead',
    pipeline: 'sales',
    is_hot: false,
    tags: ['website_form'],
  }).select().single()

  if (error) {
    console.error('Webhook lead insert error:', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }

  // Log creation activity
  await supabase.from('activities').insert({
    lead_id: lead.id,
    created_by: lead.id,
    type: 'lead_created',
    body: 'Lead created from website contact form',
    metadata: { raw: body },
  })

  return NextResponse.json({ success: true, lead_id: lead.id })
}
