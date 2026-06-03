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
    <div className="mb-6 bg-amber-50 border-2 border-amber-400 rounded-xl overflow-hidden">
      <div className="bg-amber-400 px-4 py-2.5 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-white" />
        <span className="text-sm font-bold text-white">
          {replies.length} incoming SMS {replies.length === 1 ? 'reply' : 'replies'} — tap to open lead
        </span>
      </div>
      <div className="divide-y divide-amber-200">
        {replies.map(reply => (
          <Link
            key={reply.id}
            href={`/leads/${reply.lead_id}`}
            className="flex items-start gap-3 px-4 py-3 hover:bg-amber-100 transition-colors group"
          >
            <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900 group-hover:text-amber-800">
                {reply.leads?.name ?? 'Unknown sender'}
              </p>
              <p className="text-sm text-gray-700 mt-0.5">{reply.body}</p>
            </div>
            <span className="text-xs text-amber-600 shrink-0 mt-0.5 font-medium">{timeAgo(reply.created_at)}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
