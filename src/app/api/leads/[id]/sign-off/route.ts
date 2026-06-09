import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, TEAM_EMAIL } from '@/lib/email'

const SECTIONS = [
  {
    label: 'Structure',
    items: [
      { id: 'build_location', label: 'Build location and screw height approved by customer' },
      { id: 'windows_doors_smooth', label: 'Windows and Doors open smoothly' },
    ],
  },
  {
    label: 'Electrics',
    items: [
      { id: 'swa_cable', label: 'SWA Cable run agreed with customer' },
      { id: 'electrics_tested', label: 'Electrics tested and working. Awaiting certificate' },
    ],
  },
  {
    label: 'Finish – Interior',
    items: [
      { id: 'sockets_switches', label: 'Sockets & switches – No visible marks, plaster chips filled & sanded' },
      { id: 'plastering', label: 'Plastering completed to high standard' },
      { id: 'flooring', label: 'Flooring – No visible marks' },
      { id: 'skirting', label: 'Skirting – Filled and sanded' },
      { id: 'caulking', label: 'Caulking – professional finish' },
    ],
  },
  {
    label: 'Finish – Exterior',
    items: [
      { id: 'ext_windows_doors', label: 'Windows and Doors – No visible marks' },
      { id: 'workmanship', label: 'Workmanship – Pins sunk, screws flush, tight mitres' },
      { id: 'metal_cladding', label: 'Metal cladding – cleaned, screws in-line and panels tight' },
      { id: 'silicone', label: 'Silicone around windows & doors – professional finish' },
    ],
  },
  {
    label: 'Cleaning',
    items: [
      { id: 'cladding_decking', label: 'Cladding / decking – No visible marks' },
      { id: 'glass_cleaned', label: 'Glass cleaned, track clear of debris, frames clean' },
      { id: 'site_cleared', label: 'Site cleared of any rubbish' },
      { id: 'tools_removed', label: 'All tools and surplus material removed' },
    ],
  },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function buildEmailHtml(opts: {
  customerName: string
  address: string
  projectDate: string
  checks: Record<string, string>
  customerSatisfied: string
  satisfactionDetails: string
  comments: string
}) {
  const checkRow = (label: string, value: string) => {
    const yes = value === 'yes'
    return `
      <tr>
        <td style="padding:8px 12px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6">${label}</td>
        <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #f3f4f6;font-weight:600;color:${yes ? '#16a34a' : '#dc2626'};font-size:13px">${yes ? '✓ Yes' : '✗ No'}</td>
      </tr>`
  }

  const sections = SECTIONS.map(s => `
    <tr>
      <td colspan="2" style="padding:10px 12px 4px;background:#f9fafb;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">${s.label}</td>
    </tr>
    ${s.items.map(item => checkRow(item.label, opts.checks[item.id] ?? 'no')).join('')}
  `).join('')

  const satisfied = opts.customerSatisfied === 'yes'

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

        <!-- Header -->
        <tr>
          <td style="background:#1a4731;padding:24px 32px">
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em">The Green Rooms</p>
            <p style="margin:4px 0 0;font-size:13px;color:#86efac">www.thegreenrooms.com</p>
          </td>
        </tr>

        <!-- Title -->
        <tr>
          <td style="padding:24px 32px 16px;border-bottom:2px solid #16a34a">
            <p style="margin:0;font-size:18px;font-weight:700;color:#111827">Green Room Completion Sign-off</p>
            <p style="margin:8px 0 0;font-size:13px;color:#6b7280">
              <strong>Customer:</strong> ${opts.customerName}<br>
              ${opts.address ? `<strong>Address:</strong> ${opts.address.replace(/\n/g, '<br>')}<br>` : ''}
              <strong>Project Date:</strong> ${formatDate(opts.projectDate)}
            </p>
          </td>
        </tr>

        <!-- Checklist -->
        <tr>
          <td style="padding:0">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;border-bottom:1px solid #e5e7eb">Item</th>
                <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#9ca3af;border-bottom:1px solid #e5e7eb;width:80px">Completed</th>
              </tr>
              ${sections}
            </table>
          </td>
        </tr>

        <!-- Customer satisfaction -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #e5e7eb">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">Customer Satisfaction</p>
            <p style="margin:0;font-size:13px;color:#374151">
              Works completed to satisfaction:
              <strong style="color:${satisfied ? '#16a34a' : '#dc2626'}">${satisfied ? '✓ Yes' : '✗ No'}</strong>
            </p>
            ${!satisfied && opts.satisfactionDetails ? `<p style="margin:8px 0 0;font-size:13px;color:#6b7280"><em>${opts.satisfactionDetails}</em></p>` : ''}
          </td>
        </tr>

        ${opts.comments ? `
        <!-- Comments -->
        <tr>
          <td style="padding:0 32px 16px;border-top:1px solid #f3f4f6">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">Additional Comments</p>
            <p style="margin:0;font-size:13px;color:#374151">${opts.comments}</p>
          </td>
        </tr>` : ''}

        <!-- Signatures note -->
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#6b7280">
              Customer and project manager signatures are attached to this email as image files.
            </p>
          </td>
        </tr>

        <!-- Confirmation -->
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6">
              The undersigned confirm that all the above works have been completed to the customer's satisfaction and the garden room project has been handed over according to the agreed specifications and quality standards. The guarantee remains in effect should any issues arise.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;background:#1a4731;text-align:center">
            <p style="margin:0;font-size:12px;color:#86efac">The Green Rooms · www.thegreenrooms.com</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    checks: Record<string, string>
    customerSatisfied: string
    satisfactionDetails: string
    comments: string
    projectDate: string
    customerSig: string
    pmSig: string
  }

  const admin = createAdminClient()
  const { data: lead } = await admin
    .from('leads')
    .select('id, name, address, postcode, email')
    .eq('id', id)
    .single()

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const address = [lead.address, lead.postcode].filter(Boolean).join(', ')

  // Convert base64 signatures to buffers
  const toBuffer = (dataUrl: string) =>
    Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64')

  // Upload signatures to storage and get public URLs
  async function uploadSig(dataUrl: string, filename: string): Promise<string | null> {
    const buffer = toBuffer(dataUrl)
    const path = `${id}/${filename}-${Date.now()}.png`
    const { error } = await admin.storage.from('snagging-media').upload(path, buffer, { contentType: 'image/png' })
    if (error) return null
    const { data: { publicUrl } } = admin.storage.from('snagging-media').getPublicUrl(path)
    return publicUrl
  }

  const [customerSigUrl, pmSigUrl] = await Promise.all([
    uploadSig(body.customerSig, 'customer-signature'),
    uploadSig(body.pmSig, 'pm-signature'),
  ])

  const html = buildEmailHtml({
    customerName: lead.name,
    address,
    projectDate: body.projectDate,
    checks: body.checks,
    customerSatisfied: body.customerSatisfied,
    satisfactionDetails: body.satisfactionDetails,
    comments: body.comments,
  })

  // Email the sign-off — send to team always, CC customer if we have their email
  const emailTo = lead.email ?? TEAM_EMAIL
  const emailCc = lead.email ? TEAM_EMAIL : undefined

  const emailOk = await sendEmail({
    to: emailTo,
    cc: emailCc,
    subject: `Sign-off Complete: ${lead.name} – ${new Date(body.projectDate).toLocaleDateString('en-GB')}`,
    html,
    attachments: [
      { filename: 'customer-signature.png', content: toBuffer(body.customerSig) },
      { filename: 'project-manager-signature.png', content: toBuffer(body.pmSig) },
    ],
  })

  // Mark lead as signed off and save sign-off data
  await admin.from('leads').update({
    signed_off_at: new Date().toISOString(),
    sign_off_satisfied: body.customerSatisfied === 'yes',
    sign_off_details: body.satisfactionDetails ?? null,
    sign_off_comments: body.comments ?? null,
    customer_sig_url: customerSigUrl,
    pm_sig_url: pmSigUrl,
  }).eq('id', id)

  // Log activity
  await admin.from('activities').insert({
    lead_id: id,
    created_by: user.id,
    type: 'note',
    body: `Completion sign-off submitted${emailOk ? ' — email sent to customer' : ''}. Customer satisfaction: ${body.customerSatisfied === 'yes' ? 'Yes' : 'No'}${body.comments ? `. Notes: ${body.comments}` : ''}`,
  })

  return NextResponse.json({ ok: true, emailSent: emailOk })
}
