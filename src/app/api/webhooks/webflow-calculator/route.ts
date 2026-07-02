import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { distanceFromHQ } from '@/lib/postcode'

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Webflow wraps form fields inside payload.data
  const fields = body?.payload?.data ?? body

  // Only process calculator submissions
  if (!fields['Desired Width In Meters'] && !fields.width) {
    return NextResponse.json({ skip: true })
  }

  // Log incoming field names to help diagnose missing fields
  console.log('Calculator webhook fields:', Object.keys(fields))

  const name = fields['Enter Your Full Name'] || fields['Name 2'] || fields['Name'] || fields.name || 'Calculator Lead'
  const email = fields['Email 2'] || fields['Email'] || fields.email || null
  const phone = fields['Phone 2'] || fields['Phone'] || fields['Contact Number'] || fields['Contact Number 2'] || fields.phone || null
  const postcode = fields['Post Code 2'] || fields['Post Code'] || fields['Postcode 2'] || fields['Postcode'] || fields.postcode || null
  const address = fields['Address Line 1 2'] || fields['Address Line 1'] || fields['Address 2'] || fields['Address'] || fields['First Line of Address'] || fields['Street Address'] || null
  const address_line_2 = fields['Address Line 2 2'] || fields['Address Line 2'] || fields['Adress Line 2'] || null
  const city = fields['City Or Town 2'] || fields['City 2'] || fields['Town 2'] || fields['City Or Town'] || fields['City'] || fields['Town'] || null

  // Budget from calculator e.g. "£14290 (Inc VAT)"
  let budget_min: number | null = null
  let budget_max: number | null = null
  const rawBudget = fields['Estimated Price'] || fields.estimated_price || ''
  if (rawBudget) {
    const raw = String(rawBudget).replace(/[^0-9]/g, '')
    const val = parseInt(raw)
    if (!isNaN(val)) {
      budget_min = Math.round(val * 100 * 0.9)
      budget_max = Math.round(val * 100 * 1.1)
    }
  }

  // Size from width × depth
  let size: number | null = null
  const w = parseFloat(String(fields['Desired Width In Meters'] || fields.width || '0'))
  const d = parseFloat(String(fields['Desired Depth In Meters'] || fields.depth || '0'))
  if (w > 0 && d > 0) size = w * d

  const project_type = 'garden_room'
  const calculator_data = { ...body }

  const structureRaw = String(fields['Structure'] || '').toLowerCase()
  const tags = ['calculator_lead']
  if (structureRaw.includes('canopy')) tags.push('canopy')
  if (structureRaw.includes('hidden')) tags.push('hidden_storage')

  // Calculate distance from KT16 0AN
  let distance_miles: number | null = null
  const cleanPostcode = postcode?.toUpperCase() ?? null
  if (cleanPostcode) {
    distance_miles = await distanceFromHQ(cleanPostcode)
    if (distance_miles !== null) distance_miles = Math.round(distance_miles * 10) / 10
  }

  // Auto-lost if more than 100 miles away
  const tooFar = distance_miles !== null && distance_miles > 100
  const stage = tooFar ? 'out_of_area' : 'new_lead'
  const pipeline = tooFar ? 'lost' : 'sales'

  // Spam filter: UK postcodes follow a known pattern
  const ukPostcode = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}$/i
  if (cleanPostcode && !ukPostcode.test(cleanPostcode.trim())) {
    console.log('Spam rejected: invalid UK postcode', cleanPostcode)
    return NextResponse.json({ skip: true })
  }

  // Spam filter: UK phone numbers start with 07, 01, 02, 03 or +44
  const ukPhone = /^(\+44|0)[0-9]{9,10}$/
  if (phone && !ukPhone.test(String(phone).replace(/[\s\-().]/g, ''))) {
    console.log('Spam rejected: non-UK phone number', phone)
    return NextResponse.json({ skip: true })
  }

  // Spam filter: name segments over 18 chars are almost certainly spam
  const nameParts = name.trim().split(/\s+/)
  const longestPart = Math.max(...nameParts.map((p: string) => p.length))
  if (longestPart > 18) {
    console.log('Spam rejected: suspiciously long name segment', name)
    return NextResponse.json({ skip: true })
  }

  // Spam filter: real names have vowels
  const vowelRatio = (name.match(/[aeiou]/gi) || []).length / name.replace(/\s/g, '').length
  if (name !== 'Calculator Lead' && vowelRatio < 0.15) {
    console.log('Spam rejected: name has too few vowels', name, vowelRatio)
    return NextResponse.json({ skip: true })
  }

  // Check for duplicate email — if found, update existing lead instead of creating
  let existingLeadId: string | null = null
  if (email) {
    const { data: existing } = await createAdminClient()
      .from('leads')
      .select('id, created_at')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (existing) existingLeadId = existing.id
  }

  const supabase = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lead, error } = await (supabase.from('leads') as any).insert({
    name,
    email,
    mobile: phone,
    postcode: cleanPostcode,
    address: address ?? null,
    address_line_2: address_line_2 ?? null,
    city: city ?? null,
    project_type,
    budget_min,
    budget_max,
    approx_size_sqm: size,
    lead_source: 'calculator',
    stage,
    pipeline,
    is_hot: false,
    tags,
    calculator_data,
    distance_miles,
    notes: null,
  }).select().single()

  if (error) {
    console.error('Calculator webhook error:', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }

  await supabase.from('activities').insert({
    lead_id: lead.id,
    created_by: lead.id,
    type: 'lead_created',
    body: tooFar
      ? `Lead created from website calculator — auto-filed as Lost (${distance_miles} miles from KT16 0AN)`
      : 'Lead created from website calculator',
    metadata: { raw: body },
  })

  // Flag if a duplicate email exists
  if (existingLeadId) {
    await supabase.from('activities').insert({
      lead_id: lead.id,
      created_by: lead.id,
      type: 'note',
      body: `Duplicate email detected — another lead exists with this email address (ID: ${existingLeadId})`,
    })
  }

  return NextResponse.json({ success: true, lead_id: lead.id, distance_miles, tooFar })
}
