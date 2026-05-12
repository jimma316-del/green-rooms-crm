import type { ActivityType } from '@/types'

export function activityIcon(type: string): string {
  const icons: Record<string, string> = {
    note: '📝',
    call: '📞',
    email: '✉️',
    sms: '💬',
    whatsapp: '📱',
    stage_change: '🔄',
    task_created: '✅',
    task_completed: '☑️',
    file_uploaded: '📎',
    quote_created: '📄',
    quote_sent: '📤',
    payment_recorded: '💰',
    lead_created: '🌱',
  }
  return icons[type] ?? '•'
}

export function activityLabel(type: string): string {
  const labels: Record<string, string> = {
    note: 'Note added',
    call: 'Call logged',
    email: 'Email sent',
    sms: 'SMS sent',
    whatsapp: 'WhatsApp sent',
    stage_change: 'Stage changed',
    task_created: 'Task created',
    task_completed: 'Task completed',
    file_uploaded: 'File uploaded',
    quote_created: 'Quote created',
    quote_sent: 'Quote sent',
    payment_recorded: 'Payment recorded',
    lead_created: 'Lead created',
  }
  return labels[type] ?? type
}
