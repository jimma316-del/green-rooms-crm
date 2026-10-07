import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { xeroFetch } from '@/lib/xero'
import type { XeroLineItem } from '@/lib/quote-generator'

interface Params { params: Promise<{ id: string }> }

// POST /api/leads/[id]/xero-quote
// Creates a draft Xero quote from assessment line items
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const { lineItems, expiryDays = 30 } = await req.json() as {
    lineItems: XeroLineItem[]
    expiryDays?: number
  }

  if (!lineItems?.length) return NextResponse.json({ error: 'No line items' }, { status: 400 })

  // Load lead for contact info
  const { data: lead } = await adminAny
    .from('leads')
    .select('id, name, email, xero_contact_id')
    .eq('id', id)
    .single()

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const today = new Date().toISOString().slice(0, 10)
  const expiryDate = new Date(Date.now() + expiryDays * 86400000).toISOString().slice(0, 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contactPayload: any = lead.xero_contact_id
    ? { ContactID: lead.xero_contact_id }
    : { Name: lead.name, EmailAddress: lead.email ?? '' }

  const xeroLineItems = lineItems
    .filter(li => li.included)
    .map(li => ({
      Description: li.description,
      Quantity: 1,
      UnitAmount: li.unitAmount.toFixed(2),
      TaxType: 'OUTPUT2',
      AccountCode: '200',
    }))

  const quotePayload = {
    Contact: contactPayload,
    Date: today,
    ExpiryDate: expiryDate,
    Status: 'DRAFT',
    Title: `Garden Room — ${lead.name}`,
    LineAmountTypes: 'EXCLUSIVE',
    CurrencyCode: 'GBP',
    LineItems: xeroLineItems,
  }

  let xeroRes: Response
  try {
    xeroRes = await xeroFetch('/Quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Quotes: [quotePayload] }),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Xero not connected'
    return NextResponse.json({ error: msg }, { status: 503 })
  }

  if (!xeroRes.ok) {
    const body = await xeroRes.text()
    // 403 = missing scope (needs accounting.transactions)
    if (xeroRes.status === 403) {
      return NextResponse.json({ error: 'scope_missing', detail: body }, { status: 403 })
    }
    return NextResponse.json({ error: `Xero error: ${body}` }, { status: 502 })
  }

  const xeroData = await xeroRes.json()
  const q = xeroData.Quotes?.[0]
  if (!q) return NextResponse.json({ error: 'Xero returned no quote' }, { status: 502 })

  // Log activity
  await admin.from('activities').insert({
    lead_id: id,
    created_by: user.id,
    type: 'note',
    body: `Xero quote ${q.QuoteNumber} created as draft (${q.QuoteID})`,
  })

  return NextResponse.json({
    quoteId: q.QuoteID,
    quoteNumber: q.QuoteNumber,
    status: q.Status,
  })
}
