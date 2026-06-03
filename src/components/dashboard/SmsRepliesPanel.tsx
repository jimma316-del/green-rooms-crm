import Link from 'next/link'
import { MessageSquare } from 'lucide-react'

interface SmsReply {
  id: string
  body: string | null
  created_at: string
  lead_id: string
  leads: { name: string } | null
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function SmsRepliesPanel({ replies }: { replies: SmsReply[] }) {
  if (replies.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-amber-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <h2 className="text-sm font-semibold text-gray-900">SMS Replies</h2>
          <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
            {replies.length}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {replies.map(reply => (
          <Link
            key={reply.id}
            href={`/leads/${reply.lead_id}`}
            className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-amber-50 transition-colors group border border-amber-100"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-amber-700">
                {reply.leads?.name ?? 'Unknown'}
              </p>
              <p className="text-xs text-gray-500 truncate">{reply.body}</p>
            </div>
            <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{timeAgo(reply.created_at)}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
