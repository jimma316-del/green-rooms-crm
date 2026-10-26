'use client'

import { useState } from 'react'
import { PoundSterling, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  leadId: string
  payment1Amount: number | null
  payment1Due: string | null
  payment2Amount: number | null
  payment2Due: string | null
}

export function StagedPayments({ leadId, payment1Amount, payment1Due, payment2Amount, payment2Due }: Props) {
  const router = useRouter()

  const [p1Amount, setP1Amount] = useState(payment1Amount ? String(payment1Amount) : '')
  const [p1Due, setP1Due]       = useState(payment1Due ?? '')
  const [p2Amount, setP2Amount] = useState(payment2Amount ? String(payment2Amount) : '')
  const [p2Due, setP2Due]       = useState(payment2Due ?? '')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/leads/${leadId}/staged-payments`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_1_amount: p1Amount ? Math.round(parseFloat(p1Amount)) : null,
        payment_1_due:    p1Due || null,
        payment_2_amount: p2Amount ? Math.round(parseFloat(p2Amount)) : null,
        payment_2_due:    p2Due || null,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 mb-4">
        <PoundSterling className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700">Staged Payments</h2>
      </div>

      <div className="space-y-4">
        {[
          { label: 'Stage 1', amount: p1Amount, setAmount: setP1Amount, due: p1Due, setDue: setP1Due },
          { label: 'Stage 2', amount: p2Amount, setAmount: setP2Amount, due: p2Due, setDue: setP2Due },
        ].map(({ label, amount, setAmount, due, setDue }) => (
          <div key={label}>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">{label}</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Amount</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">£</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                  />
                </div>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Due date</p>
                <input
                  type="date"
                  value={due}
                  onChange={e => setDue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-4 flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saved ? <><Check className="w-3 h-3" /> Saved</> : saving ? 'Saving…' : 'Save payments'}
      </button>
    </div>
  )
}
