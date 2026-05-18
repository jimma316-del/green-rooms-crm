import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!,
)

export async function sendSms(to: string, body: string): Promise<boolean> {
  try {
    await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER!,
      to,
      body,
    })
    return true
  } catch (err) {
    console.error('SMS send failed:', err)
    return false
  }
}

export function formatUkMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  // 07xxx → +447xxx
  if (digits.startsWith('07') && digits.length === 11) {
    return '+44' + digits.slice(1)
  }
  // Already international
  if (digits.startsWith('44') && digits.length === 12) {
    return '+' + digits
  }
  if (digits.startsWith('447') && digits.length === 12) {
    return '+' + digits
  }
  return null
}
