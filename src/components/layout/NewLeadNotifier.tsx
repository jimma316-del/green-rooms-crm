'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function NewLeadNotifier() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('new-lead-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads' },
        (payload) => {
          const lead = payload.new as { id: string; name: string; lead_source: string | null; stage: string }

          const isWebsiteEnquiry = lead.lead_source === 'website_form'
          const isShowroomBooking = lead.lead_source === 'showroom_booking'

          if (!isWebsiteEnquiry && !isShowroomBooking) return

          const label = isShowroomBooking ? 'Showroom booking' : 'Site visit request'
          const emoji = isShowroomBooking ? '🏡' : '📍'

          toast(`${emoji} New ${label}`, {
            description: lead.name,
            duration: Infinity,
            action: {
              label: 'View lead',
              onClick: () => {
                router.push(`/leads/${lead.id}`)
                router.refresh()
              },
            },
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
