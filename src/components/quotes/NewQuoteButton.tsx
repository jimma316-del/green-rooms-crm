'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  leadId: string
  hasAssessment: boolean
}

export function NewQuoteButton({ leadId, hasAssessment }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function create() {
    setLoading(true)
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, from_assessment: hasAssessment }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create quote')
      const { quoteId } = data
      router.push(`/leads/${leadId}/quotes/${quoteId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create quote')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={create}
      disabled={loading}
      className="flex flex-col gap-1 p-3 rounded-lg border border-gray-200 hover:border-[var(--primary)] hover:bg-gray-50 transition-colors text-left w-full disabled:opacity-50"
    >
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quote</span>
      <span className="text-sm text-gray-400">{loading ? 'Creating…' : 'Not created'}</span>
      <span className="text-xs text-[var(--primary)]">
        {hasAssessment ? 'Build quote ↗' : 'Build quote ↗'}
      </span>
    </button>
  )
}
