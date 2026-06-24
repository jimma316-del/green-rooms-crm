import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Webflow wraps form fields inside payload.data
  const fields = body?.payload?.data ?? body?.Payload?.data ?? body

  // If this is a calculator submission, ignore it — the calculator endpoint handles it
  if (fields['Desired Width In Meters']) {
    return NextResponse.json({ skip: true })
  }

  const firstName = fields['First Name 2'] || fields['Name'] || fields.name || ''
  const surname = fields['Surname 2'] || fields['Surname'] || ''
  const name = [firstName, surname].filter(Boolean).join(' ') || 'Unknown'
  const email = fields['Email Address 2'] || fields['Email'] || fields.email || null
  const phone = fields['Contact Number 2'] || fields['Phone Number'] || fields.phone || null
  const postcode = fields['Postcode 2'] || fields['Postcode'] || fields.postcode || null
  const message = fields['Message 2'] || fields['Garden Room Project'] || fields.message || null
  const hearAboutUs = fields['Question 2'] || fields['How did you hear about us?'] || null
  const marketingRaw = fields['Form Subscribe 2'] ?? fields['Keep Me Updated'] ?? null
  const marketing_consent = marketingRaw === true || String(marketingRaw).toLowerCase() === 'yes' || String(marketingRaw).toLowerCase() === 'true'

  // Spam filter: UK postcodes follow a known pattern — gibberish fails immediately
  const ukPostcode = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}$/i
  if (postcode && !ukPostcode.test(postcode.trim())) {
    console.log('Spam rejected: invalid UK postcode', postcode)
    return NextResponse.json({ skip: true })
  }

  // Spam filter: UK phone numbers start with 07, 01, 02, 03 or +44
  const ukPhone = /^(\+44|0)[0-9]{9,10}$/
  if (phone && !ukPhone.test(phone.replace(/[\s\-().]/g, ''))) {
    console.log('Spam rejected: non-UK phone number', phone)
    return NextResponse.json({ skip: true })
  }

  // Spam filter: names shouldn't contain long random-looking segments
  // Real first/last names are almost never longer than 18 characters
  const nameParts = name.trim().split(/\s+/)
  const longestPart = Math.max(...nameParts.map(p => p.length))
  if (longestPart > 18) {
    console.log('Spam rejected: suspiciously long name segment', name)
    return NextResponse.json({ skip: true })
  }

  // Spam filter: real names have vowels — random strings often don't
  const vowelRatio = (name.match(/[aeiou]/gi) || []).length / name.replace(/\s/g, '').length
  if (vowelRatio < 0.15) {
    console.log('Spam rejected: name has too few vowels', name, vowelRatio)
    return NextResponse.json({ skip: true })
  }

  const supabase = createAdminClient()

  const { data: lead, error } = await supabase.from('leads').insert({
    name,
    email,
    mobile: phone,
    notes: message || null,
    source_referrer: hearAboutUs,
    postcode: postcode?.toUpperCase(),
    lead_source: 'website_form',
    stage: 'new_lead',
    pipeline: 'sales',
    is_hot: false,
    tags: ['website_form'],
    marketing_consent,
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
