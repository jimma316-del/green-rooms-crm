import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, TEAM_EMAIL } from '@/lib/email'

interface Params { params: Promise<{ token: string }> }

// POST /api/client-quote/[token]/respond
// Public endpoint — no auth required, identified by token
export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params
  const { action, note, acceptedByName } = await req.json() as {
    action: 'accept' | 'changes'
    note?: string
    acceptedByName?: string
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const { data: version } = await adminAny
    .from('quote_versions')
    .select(`id, status, quote_id, quotes(quote_ref, lead_id, leads(name, email))`)
    .eq('client_token', token)
    .single()

  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (version.status === 'accepted' || version.status === 'rejected') {
    return NextResponse.json({ error: 'Already responded' }, { status: 409 })
  }

  // Capture IP for acceptance audit trail
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown'

  const newStatus = action === 'accept' ? 'accepted' : 'rejected'
  const updateData: Record<string, string | null> = {
    status: newStatus,
    responded_at: new Date().toISOString(),
  }
  if (action === 'accept') {
    updateData.accepted_by_name = acceptedByName ?? null
    updateData.accepted_at = new Date().toISOString()
    updateData.acceptance_ip = ip
  }

  await adminAny.from('quote_versions').update(updateData).eq('id', version.id)

  const quote = version.quotes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lead = (quote as any).leads as { name: string; email: string | null }

  const subject = action === 'accept'
    ? `✓ Quote Accepted — ${lead.name} (${quote.quote_ref})`
    : `💬 Changes Requested — ${lead.name} (${quote.quote_ref})`

  const html = action === 'accept'
    ? `<p><strong>${acceptedByName || lead.name}</strong> has accepted the proposal <strong>${quote.quote_ref}</strong>.</p>
       ${acceptedByName ? `<p>Signed as: <em>${acceptedByName}</em></p>` : ''}
       <p>You can now send the deposit invoice.</p>
       <p><a href="https://green-rooms-crm.vercel.app/leads/${quote.lead_id}">View in CRM →</a></p>`
    : `<p><strong>${lead.name}</strong> has requested changes to proposal <strong>${quote.quote_ref}</strong>.</p>
       ${note ? `<p>Their note: <em>${note}</em></p>` : ''}
       <p><a href="https://green-rooms-crm.vercel.app/leads/${quote.lead_id}">View in CRM →</a></p>`

  await sendEmail({ to: TEAM_EMAIL, subject, html })

  await admin.from('activities').insert({
    lead_id: quote.lead_id,
    created_by: null,
    type: 'note',
    body: action === 'accept'
      ? `${acceptedByName || lead.name} accepted quote ${quote.quote_ref}`
      : `${lead.name} requested changes on quote ${quote.quote_ref}${note ? `: "${note}"` : ''}`,
  })

  return NextResponse.json({ success: true })
}
