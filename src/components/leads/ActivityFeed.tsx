'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { activityIcon, activityLabel } from '@/utils/activity'
import { formatDateTime } from '@/utils/date'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { ActivityType } from '@/types'

interface Activity {
  id: string
  type: string
  body: string | null
  created_at: string
  users: { full_name: string; avatar_url: string | null } | null
}

interface Props {
  activities: Activity[]
  leadId: string
}

const LOG_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'note', label: '📝 Note' },
  { value: 'call', label: '📞 Call' },
  { value: 'email', label: '✉️ Email' },
  { value: 'sms', label: '💬 SMS' },
  { value: 'whatsapp', label: '📱 WhatsApp' },
]

export function ActivityFeed({ activities, leadId }: Props) {
  const [body, setBody] = useState('')
  const [type, setType] = useState<ActivityType>('note')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function addActivity() {
    if (!body.trim()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('activities').insert({
      lead_id: leadId,
      created_by: user!.id,
      type,
      body: body.trim(),
    })

    if (error) {
      toast.error('Failed to save')
    } else {
      setBody('')
      toast.success('Logged')
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Activity</h2>

      {/* Add activity */}
      <div className="mb-5 space-y-2">
        <div className="flex gap-2">
          <Select value={type} onValueChange={v => setType(v as ActivityType)}>
            <SelectTrigger className="w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOG_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          placeholder={type === 'call' ? 'What was discussed on the call?' : type === 'note' ? 'Add a note…' : `Log ${type}…`}
          rows={2}
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addActivity() }}
        />
        <Button
          size="sm"
          onClick={addActivity}
          disabled={!body.trim() || saving}
          className="bg-[var(--primary)] hover:bg-[var(--primary)]/90"
        >
          {saving ? 'Saving…' : 'Log'}
        </Button>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-sm text-gray-400">No activity yet</p>
        ) : activities.map((activity, i) => (
          <div key={activity.id} className="timeline-item flex gap-3">
            <div className="flex items-start justify-center w-8 h-8 rounded-full bg-gray-50 border border-gray-100 shrink-0 text-base leading-none pt-1.5">
              {activityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs font-medium text-gray-700">
                  {activityLabel(activity.type)}
                  {activity.users && (
                    <span className="text-gray-400 font-normal"> · {activity.users.full_name}</span>
                  )}
                </span>
                <span className="text-[10px] text-gray-400 shrink-0">{formatDateTime(activity.created_at)}</span>
              </div>
              {activity.body && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{activity.body}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
