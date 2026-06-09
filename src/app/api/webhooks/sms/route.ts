import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const TWIML = '<Response/>'
const XML_HEADERS = { 'Content-Type': 'text/xml' }

function normaliseUkNumber(raw: string): string[] {
  // raw is usually +447XXXXXXXXX from Twilio
  const variants = [
    raw,                           // +447911123456
    raw.replace('+44', '0'),       // 07911123456
    raw.replace('+44', '44'),      // 447911123456
    raw.replace('+', ''),          // 447911123456
  ]
  return [...new Set(variants)]
}

export async function POST(req: NextRequest) {
  const text = await req.text()
  const params = new URLSearchParams(text)

  const from = params.get('From') ?? ''
  const body = params.get('Body') ?? ''
  const messageSid = params.get('MessageSid') ?? ''

  console.log(`[SMS Inbound] Received from=${from} sid=${messageSid} body="${body}"`)

  if (!from || !body) {
    console.warn('[SMS Inbound] Missing From or Body — ignoring')
    return new NextResponse(TWIML, { headers: XML_HEADERS })
  }

  const admin = createAdminClient()
  const possibleNumbers = normaliseUkNumber(from)
  console.log(`[SMS Inbound] Looking up numbers:`, possibleNumbers)

  const { data: lead, error: leadError } = await admin
    .from('leads')
    .select('id, name')
    .in('mobile', possibleNumbers)
    .limit(1)
    .maybeSingle()

  if (leadError) {
    console.error('[SMS Inbound] Lead lookup error:', leadError)
  }

  if (lead) {
    const { error: insertError } = await admin.from('activities').insert({
      lead_id: lead.id,
      created_by: null,
      type: 'sms_inbound',
      body,
      metadata: { from, message_sid: messageSid },
    })
    if (insertError) {
      console.error(`[SMS Inbound] Failed to insert activity:`, insertError)
    } else {
      console.log(`[SMS Inbound] Saved — lead ${lead.id} (${lead.name})`)
    }
  } else {
    console.warn(`[SMS Inbound] No lead matched for ${from} (tried: ${possibleNumbers.join(', ')})`)
  }

  return new NextResponse(TWIML, { headers: XML_HEADERS })
}
