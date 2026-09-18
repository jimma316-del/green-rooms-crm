import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, TEAM_EMAIL } from '@/lib/email'

interface Params { params: Promise<{ token: string }> }

// POST /api/client-quote/[token]/message — client sends a query
export async function POST(req: NextRequest, { params }: Params) {
  const { token } = await params
  const { message } = await req.json() as { message: string }
  if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const { data: version } = await adminAny
    .from('quote_versions')
    .select('id, quote_id, quotes(id, quote_ref, lead_id, leads(name, email))')
    .eq('client_token', token)
    .single()

  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const quote = version.quotes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lead = (quote as any).leads as { name: string; email: string | null }

  // Store in quote_messages
  const { error } = await adminAny.from('quote_messages').insert({
    quote_id: quote.id,
    from_client: true,
    message: message.trim(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify team
  await sendEmail({
    to: TEAM_EMAIL,
    subject: `💬 Client Question — ${lead.name} (${quote.quote_ref})`,
    html: `<p><strong>${lead.name}</strong> has sent a question about proposal <strong>${quote.quote_ref}</strong>:</p>
           <blockquote style="border-left:3px solid #34a02e;padding:12px 16px;margin:12px 0;background:#f0f8ef;">
             <p style="margin:0;">${message.trim()}</p>
           </blockquote>
           <p><a href="https://green-rooms-crm.vercel.app/leads/${quote.lead_id}">View in CRM →</a></p>`,
  })

  return NextResponse.json({ success: true })
}
