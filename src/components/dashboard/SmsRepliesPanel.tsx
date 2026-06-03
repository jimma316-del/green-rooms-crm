'use client'

import Link from 'next/link'
import { useState } from 'react'
import { MessageSquare, Trash2 } from 'lucide-react'

interface SmsReply {
  id: string
  body: string | null
  created_at: string
  lead_id: string
  leads: { name: string; mobile: string | null } | null
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function toWhatsAppNumber(mobile: string): string {
  const digits = mobile.replace(/\D/g, '')
  if (digits.startsWith('447')) return digits
  if (digits.startsWith('07')) return '44' + digits.slice(1)
  if (digits.startsWith('44')) return digits
  return digits
}

export function SmsRepliesPanel({ replies: initial }: { replies: SmsReply[] }) {
  const [replies, setReplies] = useState(initial)

  async function deleteReply(id: string) {
    setReplies(prev => prev.filter(r => r.id !== id))
    await fetch(`/api/activities/${id}`, { method: 'DELETE' })
  }

  if (replies.length === 0) return null

  return (
    <div className="mb-6 bg-amber-50 border-2 border-amber-400 rounded-xl overflow-hidden">
      <div className="bg-amber-400 px-4 py-2.5 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-white" />
        <span className="text-sm font-bold text-white">
          {replies.length} incoming SMS {replies.length === 1 ? 'reply' : 'replies'}
        </span>
      </div>
      <div className="divide-y divide-amber-200">
        {replies.map(reply => {
          const mobile = reply.leads?.mobile
          const waNumber = mobile ? toWhatsAppNumber(mobile) : null

          return (
            <div key={reply.id} className="flex items-start gap-3 px-4 py-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0" />
              <Link href={`/leads/${reply.lead_id}`} className="flex-1 min-w-0 group">
                <p className="text-sm font-bold text-gray-900 group-hover:text-amber-800">
                  {reply.leads?.name ?? 'Unknown sender'}
                </p>
                <p className="text-sm text-gray-700 mt-0.5">{reply.body}</p>
                <p className="text-xs text-amber-600 mt-1">{timeAgo(reply.created_at)}</p>
              </Link>
              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                {waNumber && (
                  <a
                    href={`https://wa.me/${waNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white text-xs font-semibold rounded-lg hover:opacity-90"
                  >
                    <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.112 1.524 5.84L.057 23.882l6.198-1.625A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.368l-.36-.214-3.724.976.993-3.63-.235-.374A9.818 9.818 0 1112 21.818z"/>
                    </svg>
                    Reply
                  </a>
                )}
                <button
                  onClick={() => deleteReply(reply.id)}
                  className="p-1.5 text-amber-400 hover:text-red-500 transition-colors"
                  title="Dismiss"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
