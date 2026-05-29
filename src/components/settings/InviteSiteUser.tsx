'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function InviteSiteUser() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/admin/invite-site-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    })

    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Failed to send invite')
    } else {
      toast.success(`Invite sent to ${email}`)
      setEmail('')
      setName('')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleInvite} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="site-name">Name</Label>
        <Input
          id="site-name"
          placeholder="e.g. Dave (Site Team)"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="site-email">Email</Label>
        <Input
          id="site-email"
          type="email"
          placeholder="dave@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading} className="gap-2 bg-green-700 hover:bg-green-800 text-white">
        <UserPlus className="w-4 h-4" />
        {loading ? 'Sending…' : 'Send Invite'}
      </Button>
      <p className="text-xs text-gray-400">
        They&apos;ll receive an email to set their password. They can only access the sign-off sheet — not the full CRM.
      </p>
    </form>
  )
}
