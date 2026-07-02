import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(req: NextRequest) {
  // Verify this is a legitimate Vercel cron request
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, name, mobile, postcode')
    .not('calculator_data', 'is', null)
    .not('mobile', 'is', null)
    .is('sms_sent_at', null)
    .lte('created_at', cutoff)
    .neq('pipeline', 'lost')

  if (error) {
    console.error('SMS cron query error:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const results = { sent: 0, skipped: 0, failed: 0 }

  for (const lead of leads ?? []) {
    const phone = formatUkMobile(lead.mobile ?? '')
    if (!phone) { results.skipped++; continue }

    const firstName = (lead.name ?? 'there').split(' ')[0]

    let message: string | null = null

    if (lead.postcode) {
      const miles = await distanceFromBase(lead.postcode)
      if (miles === null) {
        // Postcode lookup failed — skip rather than guess
        results.skipped++
        continue
      }
      if (miles <= 15) {
        message = MESSAGE_CLOSE(firstName)
      } else if (miles <= 25) {
        message = MESSAGE_FAR(firstName)
      } else {
        // Outside 20 miles — don't send
        results.skipped++
        await supabase.from('leads').update({ sms_sent_at: new Date().toISOString() }).eq('id', lead.id)
        continue
      }
    } else {
      // No postcode — skip
      results.skipped++
      continue
    }

    const ok = await sendSms(phone, message)

    if (ok) {
      await supabase.from('leads').update({ sms_sent_at: new Date().toISOString() }).eq('id', lead.id)
      await supabase.from('activities').insert({
        lead_id: lead.id,
        created_by: lead.id,
        type: 'sms_sent',
        body: 'Automated follow-up SMS sent',
      })
      results.sent++
    } else {
      results.failed++
    }
  }

  console.log('SMS cron results:', results)
  return NextResponse.json(results)
}
