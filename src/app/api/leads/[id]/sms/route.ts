import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { distanceFromBase } from '@/lib/postcode'
import { sendSms, formatUkMobile } from '@/lib/sms'

const WA_LINK = 'https://wa.me/441932640242?text=Hi%2C%20I%27d%20like%20to%20discuss%20my%20garden%20room%20project'

const MESSAGE_CLOSE = (firstName: string) => `Hi ${firstName}, thanks for visiting our website and requesting a quote from The Green Rooms!

Would you like me to arrange a site visit with James? He can talk through your project in more detail, have a look at the space, and answer any questions you may have.

WhatsApp us here: ${WA_LINK}

Kind regards,
Natasha
The Green Rooms
www.thegreenrooms.com`

const MESSAGE_FAR = (firstName: string) => `Hi ${firstName}, thanks for visiting our website and requesting a quote from The Green Rooms!

Would you like to come to our showroom to meet James, talk through your project in more detail, and have a look at cladding samples, finishes, and different options in person?

Alternatively, if you're happy with the estimate and ready to move things forward, James would be happy to pop out for a site visit.

WhatsApp us here: ${WA_LINK}

Kind regards,
Natasha
The Green Rooms
www.thegreenrooms.com`

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Verify user is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: lead } = await admin
    .from('leads')
    .select('id, name, mobile, postcode')
    .eq('id', id)
    .single()

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  if (!lead.mobile) return NextResponse.json({ error: 'No mobile number' }, { status: 400 })

  const phone = formatUkMobile(lead.mobile)
  if (!phone) return NextResponse.json({ error: 'Invalid mobile number' }, { status: 400 })

  // Check for custom message in body
  let customMessage: string | null = null
  try {
    const body = await req.json()
    customMessage = body?.message?.trim() || null
  } catch { /* no body */ }

  if (customMessage) {
    // Custom message — always allowed, doesn't update sms_sent_at
    const ok = await sendSms(phone, customMessage)
    if (!ok) return NextResponse.json({ error: 'SMS failed to send' }, { status: 500 })
    await admin.from('activities').insert({
      lead_id: id,
      created_by: user.id,
      type: 'sms_sent',
      body: `Custom SMS sent`,
    })
    return NextResponse.json({ ok: true, custom: true })
  }

  // Automated template — block if already sent
  const { data: currentLead } = await admin.from('leads').select('sms_sent_at, postcode').eq('id', id).single()
  if (currentLead?.sms_sent_at) {
    return NextResponse.json({ error: 'Automated SMS already sent to this customer' }, { status: 409 })
  }

  // Try distance lookup — fall back gracefully if postcode missing or lookup fails
  const firstName = (lead.name ?? 'there').split(' ')[0]
  let miles: number | null = null
  if (currentLead?.postcode) {
    miles = await distanceFromBase(currentLead.postcode)
  }
  // Use close template as default when distance unknown; far template for 12–20 miles
  const message = (miles !== null && miles > 12) ? MESSAGE_FAR(firstName) : MESSAGE_CLOSE(firstName)
  const distanceNote = miles !== null ? `${miles.toFixed(1)} miles` : 'distance unknown'

  const ok = await sendSms(phone, message)
  if (!ok) return NextResponse.json({ error: 'SMS failed to send' }, { status: 500 })

  await admin.from('leads').update({ sms_sent_at: new Date().toISOString() }).eq('id', id)
  await admin.from('activities').insert({
    lead_id: id,
    created_by: user.id,
    type: 'sms_sent',
    body: `Automated SMS sent (${distanceNote} — ${(miles !== null && miles > 12) ? 'showroom' : 'site visit'} template)`,
  })

  return NextResponse.json({ ok: true, miles: miles !== null ? miles.toFixed(1) : null })
}
