import { Resend } from 'resend'

export const FROM_EMAIL = process.env.FROM_EMAIL ?? 'noreply@thegreenrooms.com'
export const TEAM_EMAIL = process.env.TEAM_EMAIL ?? 'info@thegreenrooms.com'

interface SendEmailOptions {
  to: string
  cc?: string
  subject: string
  html: string
  attachments?: Array<{ filename: string; content: Buffer }>
}

export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  const resend = new Resend(process.env.RESEND_API_KEY!)
  try {
    await resend.emails.send({
      from: `The Green Rooms <${FROM_EMAIL}>`,
      to: opts.to,
      cc: opts.cc,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments,
    })
    return true
  } catch (err) {
    console.error('Email send failed:', err)
    return false
  }
}
