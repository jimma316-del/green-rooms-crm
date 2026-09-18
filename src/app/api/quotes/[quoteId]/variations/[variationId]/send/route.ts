import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, TEAM_EMAIL } from '@/lib/email'

interface Params { params: Promise<{ quoteId: string; variationId: string }> }
interface VariationLineItem {
  id: string; name: string; description?: string | null
  quantity: number; unit: string
  unit_price_pence: number; line_total_pence: number
}

// POST /api/quotes/[quoteId]/variations/[variationId]/send
export async function POST(req: NextRequest, { params }: Params) {
  const { quoteId, variationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  const body = await req.json() as {
    recipientEmail: string
    recipientName: string
    subject?: string
    bodyText?: string
  }

  if (!body.recipientEmail?.trim()) {
    return NextResponse.json({ error: 'recipientEmail required' }, { status: 400 })
  }

  // Load variation + quote + lead
  const { data: variation } = await adminAny
    .from('quote_variations')
    .select(`*, quotes(quote_ref, lead_id, leads(name, email))`)
    .eq('id', variationId)
    .eq('quote_id', quoteId)
    .single()

  if (!variation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const quote = variation.quotes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lead = (quote as any).leads as { name: string; email: string | null }

  const lineItemsHtml = (variation.line_items as VariationLineItem[]).map(item => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${item.name}${item.description ? `<br><span style="color:#888;font-size:12px;">${item.description}</span>` : ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity} ${item.unit === 'm2' ? 'm²' : item.unit}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">£${(item.unit_price_pence / 100).toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">£${(item.line_total_pence / 100).toFixed(2)}</td>
    </tr>
  `).join('')

  const totalStr = `£${(variation.total_pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`
  const subject = body.subject ?? `Variation Order — ${variation.variation_ref} — The Green Rooms`
  const firstName = body.recipientName.split(' ')[0]

  const html = `
    <!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0;background:#f5f5f5;">
    <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <div style="background:#1a2328;padding:24px 32px;text-align:center;">
        <div style="color:#34a02e;font-size:22px;font-weight:700;letter-spacing:1px;">The Green Rooms</div>
        <div style="color:rgba(255,255,255,0.4);font-size:11px;margin-top:4px;letter-spacing:2px;">BESPOKE GARDEN ROOMS · SURREY</div>
      </div>
      <div style="padding:32px;">
        <p style="color:#1a2328;font-size:15px;margin:0 0 16px;">Dear ${firstName},</p>
        ${body.bodyText
          ? `<p style="color:#444;font-size:14px;line-height:1.6;white-space:pre-line;">${body.bodyText}</p>`
          : `<p style="color:#444;font-size:14px;line-height:1.6;">Please find below details of variation order <strong>${variation.variation_ref}</strong>${variation.title ? ` — ${variation.title}` : ''}.</p>
             ${variation.description ? `<p style="color:#666;font-size:13px;line-height:1.6;font-style:italic;">${variation.description}</p>` : ''}`
        }
        ${variation.line_items.length > 0 ? `
        <table style="width:100%;border-collapse:collapse;margin:24px 0;font-size:13px;">
          <thead>
            <tr style="background:#f8f9fa;">
              <th style="padding:10px 12px;text-align:left;color:#888;font-weight:600;font-size:11px;text-transform:uppercase;">Description</th>
              <th style="padding:10px 12px;text-align:center;color:#888;font-weight:600;font-size:11px;text-transform:uppercase;">Qty</th>
              <th style="padding:10px 12px;text-align:right;color:#888;font-weight:600;font-size:11px;text-transform:uppercase;">Unit Price</th>
              <th style="padding:10px 12px;text-align:right;color:#888;font-weight:600;font-size:11px;text-transform:uppercase;">Total</th>
            </tr>
          </thead>
          <tbody>${lineItemsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:12px;text-align:right;font-weight:700;font-size:15px;color:#1a2328;">Total inc. VAT</td>
              <td style="padding:12px;text-align:right;font-weight:700;font-size:15px;color:#34a02e;">${totalStr}</td>
            </tr>
          </tfoot>
        </table>
        ` : ''}
        <p style="color:#444;font-size:13px;line-height:1.6;margin-top:24px;">Please reply to this email to approve or query this variation order.</p>
        <div style="margin-top:32px;padding-top:24px;border-top:1px solid #eee;">
          <p style="color:#aaa;font-size:11px;">The Green Rooms · Lyne Lane, Lyne, Surrey KT16 0AN<br>01932 640242 · thegreenrooms.com</p>
        </div>
      </div>
    </div>
    </body></html>
  `

  await sendEmail({
    to: body.recipientEmail.trim(),
    cc: TEAM_EMAIL !== body.recipientEmail.trim() ? TEAM_EMAIL : undefined,
    subject,
    html,
  })

  // Mark as sent
  await adminAny
    .from('quote_variations')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', variationId)

  // Log activity
  await admin.from('activities').insert({
    lead_id: quote.lead_id,
    created_by: user.id,
    type: 'note',
    body: `Variation order ${variation.variation_ref} sent to ${body.recipientEmail}`,
  })

  return NextResponse.json({ success: true })
}
