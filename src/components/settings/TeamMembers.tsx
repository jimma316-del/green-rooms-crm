'use client'

import { useState } from 'react'
import { Trash2, ChevronDown } from 'lucide-react'

interface User {
  id: string
  full_name: string
  email: string
  role: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  sales: 'Sales',
  operations: 'Operations',
  site: 'Site Team',
}

const ROLE_COLOURS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  sales: 'bg-blue-100 text-blue-700',
  operations: 'bg-green-100 text-green-700',
  site: 'bg-gray-100 text-gray-600',
}

export function TeamMembers({ users: initial, currentUserId, isAdmin }: { users: User[]; currentUserId: string; isAdmin?: boolean }) {
  const [users, setUsers] = useState(initial)
  const [changing, setChanging] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function changeRole(userId: string, role: string) {
    setChanging(userId)
    setError(null)
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to update role'); setChanging(null); return }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    setChanging(null)
  }

  async function deleteUser(userId: string, name: string) {
    if (!confirm(`Remove ${name} from the team? This cannot be undone.`)) return
    setDeleting(userId)
    setError(null)
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to delete user'); setDeleting(null); return }
    setUsers(prev => prev.filter(u => u.id !== userId))
    setDeleting(null)
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {users.map(u => {
        const isMe = u.id === currentUserId
        return (
          <div key={u.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-gray-600">
                {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 truncate">
                {u.full_name}
                {isMe && <span className="ml-1.5 text-xs text-gray-400">(you)</span>}
              </p>
              <p className="text-xs text-gray-400 truncate">{u.email}</p>
            </div>
            {isMe || !isAdmin ? (
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLOURS[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                {ROLE_LABELS[u.role] ?? u.role}
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={u.role}
                    disabled={changing === u.id}
                    onChange={e => changeRole(u.id, e.target.value)}
                    className={`appearance-none text-xs px-2 py-1 pr-6 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/30 disabled:opacity-50 ${ROLE_COLOURS[u.role] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    <option value="admin">Admin</option>
                    <option value="sales">Sales</option>
                    <option value="operations">Operations</option>
                    <option value="site">Site Team</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-60" />
                </div>
                <button
                  onClick={() => deleteUser(u.id, u.full_name)}
                  disabled={deleting === u.id}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
