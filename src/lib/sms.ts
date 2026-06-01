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
  // Normalise to 10-digit subscriber number (starts with 7)
  // Handles: 07xxx (11), 447xxx (12), 7xxx (10 - missing leading 0),
  //          440 7xxx (13 - +44(0)7 format), and similar variants
  let subscriber: string | null = null
  if (digits.startsWith('4407') && digits.length === 13) {
    subscriber = digits.slice(3)   // strip 440
  } else if (digits.startsWith('447') && digits.length === 12) {
    subscriber = digits.slice(2)   // strip 44
  } else if (digits.startsWith('07') && digits.length === 11) {
    subscriber = digits.slice(1)   // strip 0
  } else if (digits.startsWith('7') && digits.length === 10) {
    subscriber = digits             // already subscriber
  }
  if (subscriber) return '+44' + subscriber
  return null
}
