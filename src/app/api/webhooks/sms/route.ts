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

  if (!from || !body) {
    return new NextResponse(TWIML, { headers: XML_HEADERS })
  }

  const admin = createAdminClient()
  const possibleNumbers = normaliseUkNumber(from)

  // Find the lead whose mobile matches any of the number variants
  const { data: lead } = await admin
    .from('leads')
    .select('id, name')
    .in('mobile', possibleNumbers)
    .limit(1)
    .maybeSingle()

  if (lead) {
    await admin.from('activities').insert({
      lead_id: lead.id,
      type: 'sms_inbound',
      body,
      metadata: { from, message_sid: messageSid },
    })
    console.log(`[SMS Inbound] Matched to lead ${lead.id} (${lead.name}): ${body}`)
  } else {
    console.warn(`[SMS Inbound] No lead matched for ${from}: ${body}`)
  }

  return new NextResponse(TWIML, { headers: XML_HEADERS })
}
