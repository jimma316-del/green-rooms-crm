'use client'

import { useState } from 'react'
import { ClipboardCheck, CheckCircle2, XCircle, X } from 'lucide-react'

interface Props {
  signedOffAt: string
  satisfied: boolean | null
  details: string | null
  comments: string | null
  customerSigUrl: string | null
  pmSigUrl: string | null
}

export function SignOffRecord({ signedOffAt, satisfied, details, comments, customerSigUrl, pmSigUrl }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null)

  const date = new Date(signedOffAt).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <>
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardCheck className="w-4 h-4 text-green-600" />
          <h2 className="text-sm font-semibold text-green-800">Completion Sign-off</h2>
          <span className="ml-auto text-xs text-green-600 font-medium">{date}</span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          {satisfied ? (
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span className="text-sm text-gray-700">
            Customer satisfied: <strong className={satisfied ? 'text-green-700' : 'text-red-600'}>{satisfied ? 'Yes' : 'No'}</strong>
          </span>
        </div>

        {!satisfied && details && (
          <p className="text-xs text-gray-600 bg-white border border-green-100 rounded-lg px-3 py-2 mb-3 italic">{details}</p>
        )}

        {comments && (
          <div className="mb-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Comments</p>
            <p className="text-xs text-gray-600 bg-white border border-green-100 rounded-lg px-3 py-2">{comments}</p>
          </div>
        )}

        {(customerSigUrl || pmSigUrl) && (
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Signatures</p>
            <div className="flex gap-3">
              {customerSigUrl && (
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 mb-1">Customer</p>
                  <button onClick={() => setLightbox(customerSigUrl)} className="w-full">
                    <img
                      src={customerSigUrl}
                      alt="Customer signature"
                      className="w-full h-20 object-contain bg-white border border-green-100 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  </button>
                </div>
              )}
              {pmSigUrl && (
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 mb-1">Project Manager</p>
                  <button onClick={() => setLightbox(pmSigUrl)} className="w-full">
                    <img
                      src={pmSigUrl}
                      alt="Project manager signature"
                      className="w-full h-20 object-contain bg-white border border-green-100 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(null)}>
            <X className="w-6 h-6" />
          </button>
          <img src={lightbox} alt="Signature" className="max-w-full max-h-full rounded-xl bg-white p-4" />
        </div>
      )}
    </>
  )
}
