'use client'

import { useState } from 'react'
import { MessageSquare, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export function SettingsActions() {
  const [running, setRunning] = useState(false)
  const [lastResult, setLastResult] = useState<{ sent: number; skipped: number; failed: number; leads: string[] } | null>(null)

  async function triggerSms() {
    setRunning(true)
    try {
      const res = await fetch('/api/admin/trigger-sms', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.detail ?? data.error ?? 'Failed to run SMS job')
      } else {
        setLastResult(data)
        if (data.sent > 0) {
          toast.success(`SMS run complete — ${data.sent} sent, ${data.skipped} skipped`)
        } else {
          toast.success(`SMS run complete — no eligible leads found (${data.skipped} skipped)`)
        }
      }
    } catch {
      toast.error('Failed to run SMS job')
    }
    setRunning(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mt-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-1">SMS Follow-up</h2>
      <p className="text-xs text-gray-400 mb-4">
        Auto-runs at 9:15am UTC (10:15am UK) on weekdays. Sends to calculator leads created 24h+ ago, within 20 miles, with no prior SMS.
      </p>
      <button
        onClick={triggerSms}
        disabled={running}
        className="flex items-center gap-2 text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
        {running ? 'Running…' : 'Trigger SMS run now'}
      </button>
      {lastResult && (
        <div className="mt-3 text-xs text-gray-500 space-y-1">
          <p><span className="font-medium text-green-600">{lastResult.sent} sent</span> · {lastResult.skipped} skipped · {lastResult.failed} failed</p>
          {lastResult.leads.length > 0 && (
            <p>Sent to: {lastResult.leads.join(', ')}</p>
          )}
        </div>
      )}
    </div>
  )
}
