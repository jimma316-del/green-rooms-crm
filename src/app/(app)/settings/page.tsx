import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('*').eq('id', user!.id).single()

  return (
    <div className="px-4 md:px-6 py-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Your Account</h2>
        <div className="space-y-3 text-sm text-gray-700">
          <div><span className="text-gray-400">Name: </span>{profile?.full_name}</div>
          <div><span className="text-gray-400">Email: </span>{user?.email}</div>
          <div><span className="text-gray-400">Role: </span><span className="capitalize">{profile?.role}</span></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 mt-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Webhook Configuration</h2>
        <p className="text-sm text-gray-500 mb-3">Use these endpoints in your Webflow site:</p>
        <div className="space-y-2 text-xs font-mono bg-gray-50 p-3 rounded-lg">
          <p className="text-gray-700">POST /api/webhooks/webflow-contact</p>
          <p className="text-gray-700">POST /api/webhooks/webflow-calculator</p>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Add header: <code className="font-mono">x-webhook-secret: [your secret]</code>
        </p>
      </div>
    </div>
  )
}
