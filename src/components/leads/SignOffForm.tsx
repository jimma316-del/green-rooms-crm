'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, ChevronLeft, ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SignaturePad, type SignaturePadHandle } from './SignaturePad'
import { cn } from '@/lib/utils'

const SECTIONS = [
  {
    id: 'structure',
    label: 'Structure',
    items: [
      { id: 'build_location', label: 'Build location and screw height approved by customer' },
      { id: 'windows_doors_smooth', label: 'Windows and Doors open smoothly' },
    ],
  },
  {
    id: 'electrics',
    label: 'Electrics',
    items: [
      { id: 'swa_cable', label: 'SWA Cable run agreed with customer' },
      { id: 'electrics_tested', label: 'Electrics tested and working. Awaiting certificate' },
    ],
  },
  {
    id: 'finish_interior',
    label: 'Finish – Interior',
    items: [
      { id: 'sockets_switches', label: 'Sockets & switches – No visible marks, plaster chips filled & sanded' },
      { id: 'plastering', label: 'Plastering completed to high standard' },
      { id: 'flooring', label: 'Flooring – No visible marks' },
      { id: 'skirting', label: 'Skirting – Filled and sanded' },
      { id: 'caulking', label: 'Caulking – professional finish' },
    ],
  },
  {
    id: 'finish_exterior',
    label: 'Finish – Exterior',
    items: [
      { id: 'ext_windows_doors', label: 'Windows and Doors – No visible marks' },
      { id: 'workmanship', label: 'Workmanship – Pins sunk, screws flush, tight mitres' },
      { id: 'metal_cladding', label: 'Metal cladding – cleaned, screws in-line and panels tight' },
      { id: 'silicone', label: 'Silicone around windows & doors – professional finish' },
    ],
  },
  {
    id: 'cleaning',
    label: 'Cleaning',
    items: [
      { id: 'cladding_decking', label: 'Cladding / decking – No visible marks' },
      { id: 'glass_cleaned', label: 'Glass cleaned, track clear of debris, frames clean' },
      { id: 'site_cleared', label: 'Site cleared of any rubbish' },
      { id: 'tools_removed', label: 'All tools and surplus material removed' },
    ],
  },
]

type CheckValue = 'yes' | 'no' | null

interface Props {
  leadId: string
  customerName: string
  address: string
  customerEmail: string | null
}

function YesNoToggle({
  value,
  onChange,
}: {
  value: CheckValue
  onChange: (v: CheckValue) => void
}) {
  return (
    <div className="flex gap-2 shrink-0">
      <button
        type="button"
        onClick={() => onChange(value === 'yes' ? null : 'yes')}
        className={cn(
          'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
          value === 'yes'
            ? 'bg-green-600 border-green-600 text-white'
            : 'bg-white border-gray-300 text-gray-500 hover:border-green-400 hover:text-green-600'
        )}
      >
        <CheckCircle2 className="w-4 h-4" />
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(value === 'no' ? null : 'no')}
        className={cn(
          'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
          value === 'no'
            ? 'bg-red-500 border-red-500 text-white'
            : 'bg-white border-gray-300 text-gray-500 hover:border-red-400 hover:text-red-500'
        )}
      >
        <XCircle className="w-4 h-4" />
        No
      </button>
    </div>
  )
}

export function SignOffForm({ leadId, customerName, address, customerEmail }: Props) {
  const router = useRouter()
  const customerSigRef = useRef<SignaturePadHandle>(null)
  const pmSigRef = useRef<SignaturePadHandle>(null)

  const [checks, setChecks] = useState<Record<string, CheckValue>>({})
  const [customerSatisfied, setCustomerSatisfied] = useState<CheckValue>(null)
  const [satisfactionDetails, setSatisfactionDetails] = useState('')
  const [comments, setComments] = useState('')
  const [projectDate, setProjectDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)

  function setCheck(id: string, value: CheckValue) {
    setChecks(prev => ({ ...prev, [id]: value }))
  }

  const allItems = SECTIONS.flatMap(s => s.items)
  const allChecked = allItems.every(item => checks[item.id] !== null && checks[item.id] !== undefined)
  const satisfactionAnswered = customerSatisfied !== null

  async function handleSubmit() {
    if (!allChecked) {
      toast.error('Please mark every item Yes or No before submitting')
      return
    }
    if (!satisfactionAnswered) {
      toast.error('Please answer the customer satisfaction question')
      return
    }
    if (customerSigRef.current?.isEmpty()) {
      toast.error('Customer signature is required')
      return
    }
    if (pmSigRef.current?.isEmpty()) {
      toast.error('Project manager signature is required')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/sign-off`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checks,
          customerSatisfied,
          satisfactionDetails,
          comments,
          projectDate,
          customerSig: customerSigRef.current!.toDataURL(),
          pmSig: pmSigRef.current!.toDataURL(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')

      toast.success(customerEmail ? 'Sign-off complete — email sent to customer' : 'Sign-off complete')
      router.push(`/leads/${leadId}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-green-700" />
          <h1 className="text-xl font-bold text-gray-900">Completion Sign-off</h1>
        </div>
      </div>

      {/* Customer info */}
      <div className="bg-white rounded-xl border border-border p-4 mb-6 space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer</label>
          <p className="text-base font-medium text-gray-900 mt-0.5">{customerName}</p>
        </div>
        {address && (
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Address</label>
            <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-line">{address}</p>
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Project Date</label>
          <input
            type="date"
            value={projectDate}
            onChange={e => setProjectDate(e.target.value)}
            className="mt-0.5 block text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-6 mb-6">
        {SECTIONS.map(section => (
          <div key={section.id} className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-border">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{section.label}</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {section.items.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <p className="text-sm text-gray-700 flex-1 leading-snug">{item.label}</p>
                  <YesNoToggle value={checks[item.id] ?? null} onChange={v => setCheck(item.id, v)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Customer satisfaction */}
      <div className="bg-white rounded-xl border border-border overflow-hidden mb-6">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-border">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Customer Satisfaction</h2>
        </div>
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-700 flex-1">Were all the works completed to your satisfaction?</p>
            <YesNoToggle value={customerSatisfied} onChange={setCustomerSatisfied} />
          </div>
          {customerSatisfied === 'no' && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Please provide details:</label>
              <textarea
                value={satisfactionDetails}
                onChange={e => setSatisfactionDetails(e.target.value)}
                rows={3}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                placeholder="Describe any issues..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Additional comments */}
      <div className="bg-white rounded-xl border border-border p-4 mb-6">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Additional Comments</label>
        <textarea
          value={comments}
          onChange={e => setComments(e.target.value)}
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          placeholder="Any additional notes..."
        />
      </div>

      {/* Confirmation text */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
        <p className="text-xs text-gray-600 leading-relaxed">
          I, the undersigned, confirm that all the above works have been completed to my satisfaction and that the garden room project has been handed over to me according to the agreed specifications and quality standards. Furthermore, I acknowledge that the guarantee will remain in effect should any issues arise.
        </p>
      </div>

      {/* Signatures */}
      <div className="space-y-4 mb-6">
        <div className="bg-white rounded-xl border border-border p-4">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Customer Signature</label>
          <SignaturePad ref={customerSigRef} />
          <button
            type="button"
            onClick={() => customerSigRef.current?.clear()}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Clear
          </button>
        </div>

        <div className="bg-white rounded-xl border border-border p-4">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Project Manager Signature</label>
          <SignaturePad ref={pmSigRef} />
          <button
            type="button"
            onClick={() => pmSigRef.current?.clear()}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-10">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-green-700 hover:bg-green-800 text-white py-3 text-base font-semibold rounded-xl"
        >
          {submitting ? 'Sending…' : customerEmail ? 'Complete & Email Customer' : 'Complete Sign-off'}
        </Button>
      </div>
    </div>
  )
}
