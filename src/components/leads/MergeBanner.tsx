'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Props {
  leadId: string
  duplicate: { id: string; name: string; created_at: string }
}

export function MergeBanner({ leadId, duplicate }: Props) {
  const [merging, setMerging] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const router = useRouter()

  if (dismissed) return null

  async function merge() {
    if (!confirm(`Merge with "${duplicate.name}"? This will keep this lead, copy over any missing data, and permanently delete the other one.`)) return
    setMerging(true)
    const res = await fetch(`/api/leads/${leadId}/merge?with=${duplicate.id}`, { method: 'POST' })
    if (res.ok) {
      toast.success('Leads merged')
      router.refresh()
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Merge failed')
    }
    setMerging(false)
  }

  return (
    <div className="mt-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
      <p className="text-sm text-amber-800 flex-1">
        Duplicate detected — another lead with this email exists:{' '}
        <Link href={`/leads/${duplicate.id}`} className="font-medium underline hover:no-underline">
          {duplicate.name}
        </Link>
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={merge}
          disabled={merging}
          className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
        >
          {merging ? 'Merging…' : 'Merge'}
        </button>
        <button onClick={() => setDismissed(true)} className="text-xs text-amber-600 hover:text-amber-800">
          Dismiss
        </button>
      </div>
    </div>
  )
}
