'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, MapPin, ArrowLeft } from 'lucide-react'

interface Props {
  leadId: string
  name: string
  address: string
}

export function SnaggingSignOff({ leadId, name, address }: Props) {
  const [confirmed, setConfirmed] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmed) return
    setLoading(true)

    const res = await fetch(`/api/leads/${leadId}/snagging-sign-off`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })

    if (res.ok) {
      setDone(true)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Snagging complete</h2>
        <p className="text-sm text-gray-500 mb-6">{name} has been archived.</p>
        <button
          onClick={() => router.push('/jobs')}
          className="px-6 py-2.5 bg-[#1a4731] text-white rounded-lg text-sm font-semibold"
        >
          Back to Jobs
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1a4731] text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 hover:opacity-70">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-sm">Snagging Sign-Off</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="font-bold text-gray-900 text-lg">{name}</h2>
          {address && (
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-sm text-gray-500">{address}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-gray-300 accent-green-700 shrink-0"
              />
              <span className="text-sm text-gray-800 font-medium leading-snug">
                I confirm the client has reviewed all snagging items and is happy that everything has been resolved to their satisfaction.
              </span>
            </label>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any notes about the snagging completion…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={!confirmed || loading}
            className="w-full py-3 bg-[#1a4731] text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-opacity"
          >
            {loading ? 'Saving…' : 'Confirm Snagging Complete'}
          </button>
        </form>
      </div>
    </div>
  )
}
