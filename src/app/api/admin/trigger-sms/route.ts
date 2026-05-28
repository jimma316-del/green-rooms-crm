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

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: leads, error } = await admin
    .from('leads')
    .select('id, name, mobile, postcode')
    .not('calculator_data', 'is', null)
    .not('mobile', 'is', null)
    .is('sms_sent_at', null)
    .lte('created_at', cutoff)
    .neq('pipeline', 'lost')

  if (error) return NextResponse.json({ error: 'Query failed', detail: error.message }, { status: 500 })

  const results = { sent: 0, skipped: 0, failed: 0, leads: [] as string[] }

  for (const lead of leads ?? []) {
    const phone = formatUkMobile(lead.mobile ?? '')
    if (!phone || !lead.postcode) { results.skipped++; continue }

    const miles = await distanceFromBase(lead.postcode)
    if (miles === null) { results.skipped++; continue }

    const firstName = (lead.name ?? 'there').split(' ')[0]
    let message: string
    if (miles <= 12) {
      message = MESSAGE_CLOSE(firstName)
    } else if (miles <= 20) {
      message = MESSAGE_FAR(firstName)
    } else {
      results.skipped++
      continue
    }

    const ok = await sendSms(phone, message)
    if (ok) {
      await admin.from('leads').update({ sms_sent_at: new Date().toISOString() }).eq('id', lead.id)
      await admin.from('activities').insert({
        lead_id: lead.id,
        created_by: user.id,
        type: 'sms_sent',
        body: 'Automated follow-up SMS sent (manual trigger)',
      })
      results.sent++
      results.leads.push(lead.name ?? lead.id)
    } else {
      results.failed++
    }
  }

  return NextResponse.json(results)
}
