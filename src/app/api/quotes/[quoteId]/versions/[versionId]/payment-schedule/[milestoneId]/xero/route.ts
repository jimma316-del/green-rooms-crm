import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { xeroFetch } from '@/lib/xero'

interface Params { params: Promise<{ quoteId: string; versionId: string; milestoneId: string }> }

// POST /api/quotes/[quoteId]/versions/[versionId]/payment-schedule/[milestoneId]/xero
// Creates a Xero invoice for this payment milestone
export async function POST(req: NextRequest, { params }: Params) {
  const { quoteId, versionId, milestoneId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  // Load milestone + version + quote + lead
  const { data: milestone } = await adminAny
    .from('payment_schedules')
    .select(`*, quote_versions(total_pence, quote_id, quotes(quote_ref, lead_id, leads(name, email, xero_contact_id)))`)
    .eq('id', milestoneId)
    .eq('quote_version_id', versionId)
    .single()

  if (!milestone) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
  if (milestone.xero_invoice_id) return NextResponse.json({ error: 'Invoice already exists in Xero' }, { status: 409 })

  const version = milestone.quote_versions
  const quote = version.quotes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lead = (quote as any).leads as { name: string; email: string | null; xero_contact_id: string | null }

  const { dueDate } = await req.json() as { dueDate?: string }

  // Build invoice amount — use amount_pence if set, else percentage of total
  const amountPence = milestone.amount_pence > 0
    ? milestone.amount_pence
    : Math.round(version.total_pence * (milestone.percentage ?? 0) / 100)

  const amountGBP = (amountPence / 100).toFixed(2)
  const netGBP = (amountPence / 1.2 / 100).toFixed(2)
  const vatGBP = (amountPence / 100 - parseFloat(netGBP)).toFixed(2)

  // Build Xero invoice payload
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contactPayload: any = lead.xero_contact_id
    ? { ContactID: lead.xero_contact_id }
    : { Name: lead.name, EmailAddress: lead.email ?? '' }

  const dueDateStr = dueDate ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const invoicePayload = {
    Type: 'ACCREC',
    Contact: contactPayload,
    Reference: quote.quote_ref,
    DueDate: `/Date(${new Date(dueDateStr).getTime()})/`,
    Status: 'DRAFT',
    LineAmountTypes: 'EXCLUSIVE',
    LineItems: [
      {
        Description: `${milestone.label} — ${quote.quote_ref}`,
        Quantity: 1,
        UnitAmount: netGBP,
        TaxType: 'OUTPUT2',
        AccountCode: '200',
      },
    ],
  }

  let xeroRes: Response
  try {
    xeroRes = await xeroFetch('/Invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Invoices: [invoicePayload] }),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Xero not connected'
    return NextResponse.json({ error: msg }, { status: 503 })
  }

  if (!xeroRes.ok) {
    const body = await xeroRes.text()
    return NextResponse.json({ error: `Xero error: ${body}` }, { status: 502 })
  }

  const xeroData = await xeroRes.json()
  const inv = xeroData.Invoices?.[0]
  if (!inv) return NextResponse.json({ error: 'Xero returned no invoice' }, { status: 502 })

  // Save Xero IDs back to milestone
  const { data: updated } = await adminAny
    .from('payment_schedules')
    .update({
      xero_invoice_id: inv.InvoiceID,
      xero_invoice_number: inv.InvoiceNumber,
      xero_pushed_at: new Date().toISOString(),
    })
    .eq('id', milestoneId)
    .select()
    .single()

  // Log activity
  await admin.from('activities').insert({
    lead_id: quote.lead_id,
    created_by: user.id,
    type: 'note',
    body: `Xero invoice ${inv.InvoiceNumber} created for ${milestone.label} (${quote.quote_ref}) — £${amountGBP}`,
  })

  return NextResponse.json({ milestone: updated, xeroInvoiceId: inv.InvoiceID, xeroInvoiceNumber: inv.InvoiceNumber })
}
