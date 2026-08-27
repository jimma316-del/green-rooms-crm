'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, Plug, PlugZap, RefreshCw, ChevronRight } from 'lucide-react'

interface Account {
  account_id: string
  code: string | null
  name: string
  type: string
  class: string | null
}

interface Props {
  connected: boolean
  orgName: string | null
  connectedAt: string | null
  lastSyncAt: string | null
  lastSyncError: string | null
  tokenExpiresAt: string | null
  flashError?: string | null
  flashConnected?: boolean
}

const CLASS_LABELS: Record<string, string> = {
  REVENUE: 'Revenue',
  EXPENSE: 'Expense',
  ASSET: 'Asset',
  LIABILITY: 'Liability',
  EQUITY: 'Equity',
}

const CLASS_COLOURS: Record<string, string> = {
  REVENUE: 'bg-emerald-50 text-emerald-700',
  EXPENSE: 'bg-rose-50 text-rose-700',
  ASSET: 'bg-blue-50 text-blue-700',
  LIABILITY: 'bg-orange-50 text-orange-700',
  EQUITY: 'bg-purple-50 text-purple-700',
}

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Xero login was cancelled or access was denied.',
  invalid_state: 'Security check failed — please try connecting again.',
  token_exchange: 'Could not exchange authorisation code. Check your Xero app settings.',
  tenant_fetch: 'Connected but could not retrieve your Xero organisation.',
  no_tenant: 'No Xero organisation found. Make sure your Xero account has at least one organisation.',
  save_failed: 'Connection established but failed to save — please try again.',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function XeroSettings({
  connected,
  orgName,
  connectedAt,
  lastSyncAt,
  lastSyncError,
  tokenExpiresAt,
  flashError,
  flashConnected,
}: Props) {
  const router = useRouter()
  const [disconnecting, setDisconnecting] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [accountsError, setAccountsError] = useState<string | null>(null)

  async function handleDisconnect() {
    if (!confirm('Disconnect Xero? This will clear all cached account and financial data.')) return
    setDisconnecting(true)
    await fetch('/api/xero/disconnect', { method: 'POST' })
    router.refresh()
  }

  async function loadAccounts() {
    setLoadingAccounts(true)
    setAccountsError(null)
    const res = await fetch('/api/xero/accounts')
    const json = await res.json()
    setLoadingAccounts(false)
    if (!res.ok) {
      setAccountsError(json.error ?? 'Failed to fetch accounts')
      return
    }
    setAccounts(json.accounts ?? [])
  }

  // Group accounts by class for display
  const grouped = accounts
    ? accounts.reduce<Record<string, Account[]>>((acc, a) => {
        const key = a.class ?? 'OTHER'
        if (!acc[key]) acc[key] = []
        acc[key].push(a)
        return acc
      }, {})
    : null

  return (
    <div className="space-y-4">

      {/* Flash messages */}
      {flashConnected && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Xero connected successfully!
        </div>
      )}
      {flashError && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {ERROR_MESSAGES[flashError] ?? `Connection error: ${flashError}`}
        </div>
      )}

      {/* Connection status card */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${connected ? 'bg-emerald-50' : 'bg-gray-100'}`}>
              {connected ? (
                <PlugZap className="w-5 h-5 text-emerald-600" />
              ) : (
                <Plug className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {connected ? orgName ?? 'Xero Connected' : 'Xero Not Connected'}
              </p>
              {connected && connectedAt && (
                <p className="text-xs text-gray-400 mt-0.5">Connected {fmt(connectedAt)}</p>
              )}
              {!connected && (
                <p className="text-xs text-gray-400 mt-0.5">Link your Xero account to enable financial reporting</p>
              )}
            </div>
          </div>

          {connected ? (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="shrink-0 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          ) : (
            <a
              href="/api/xero/connect"
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-[#13B5EA] text-white text-sm font-semibold rounded-lg hover:bg-[#0fa3d8] transition-colors"
            >
              Connect Xero
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {connected && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-400 mb-0.5">Last sync</p>
              <p className="text-gray-700">{lastSyncAt ? fmt(lastSyncAt) : 'Never'}</p>
            </div>
            <div>
              <p className="text-gray-400 mb-0.5">Token expires</p>
              <p className="text-gray-700">{tokenExpiresAt ? fmt(tokenExpiresAt) : '—'}</p>
            </div>
            {lastSyncError && (
              <div className="col-span-2">
                <p className="text-gray-400 mb-0.5">Last sync error</p>
                <p className="text-red-600">{lastSyncError}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Diagnostic: accounts */}
      {connected && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Chart of Accounts</h2>
              <p className="text-xs text-gray-400 mt-0.5">Verify the connection is working and preview your Xero accounts</p>
            </div>
            <button
              onClick={loadAccounts}
              disabled={loadingAccounts}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loadingAccounts ? 'animate-spin' : ''}`} />
              {accounts ? 'Refresh' : 'Load from Xero'}
            </button>
          </div>

          {accountsError && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {accountsError}
            </div>
          )}

          {!accounts && !accountsError && !loadingAccounts && (
            <p className="text-sm text-gray-400 text-center py-6">Click &quot;Load from Xero&quot; to fetch your chart of accounts and confirm the connection is working.</p>
          )}

          {loadingAccounts && (
            <div className="flex items-center justify-center py-10 text-sm text-gray-400">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Fetching accounts from Xero…
            </div>
          )}

          {grouped && Object.keys(grouped).length > 0 && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">{accounts!.length} active accounts loaded from Xero</p>
              {Object.entries(grouped).map(([cls, accs]) => (
                <div key={cls}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${CLASS_COLOURS[cls] ?? 'bg-gray-100 text-gray-600'}`}>
                      {CLASS_LABELS[cls] ?? cls}
                    </span>
                    <span className="text-xs text-gray-400">{accs.length} accounts</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-gray-400 border-b border-gray-100">
                          <th className="pb-1.5 pr-4 font-medium w-16">Code</th>
                          <th className="pb-1.5 pr-4 font-medium">Name</th>
                          <th className="pb-1.5 font-medium">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accs.map((a) => (
                          <tr key={a.account_id} className="border-b border-gray-50 last:border-0">
                            <td className="py-1.5 pr-4 text-gray-400 font-mono">{a.code ?? '—'}</td>
                            <td className="py-1.5 pr-4 text-gray-700">{a.name}</td>
                            <td className="py-1.5 text-gray-400">{a.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Setup instructions (only shown when not connected) */}
      {!connected && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Setup Instructions</h2>
          <ol className="space-y-3 text-sm text-gray-600">
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-semibold">1</span>
              <span>Go to <strong>developer.xero.com</strong> → My Apps → New App</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-semibold">2</span>
              <span>Choose <strong>Web app</strong> (OAuth 2.0). Enter any company name.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-semibold">3</span>
              <div>
                <span>Set the redirect URI to:</span>
                <code className="block mt-1 px-3 py-1.5 bg-gray-50 rounded text-xs font-mono text-gray-700 break-all">
                  https://green-rooms-crm.vercel.app/api/xero/callback
                </code>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-semibold">4</span>
              <span>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong>.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-semibold">5</span>
              <div>
                <span>Add these three environment variables in <strong>Vercel → Settings → Environment Variables</strong>:</span>
                <div className="mt-1.5 space-y-1 font-mono text-xs bg-gray-50 rounded p-2">
                  <p className="text-gray-700">XERO_CLIENT_ID=<span className="text-gray-400">your-client-id</span></p>
                  <p className="text-gray-700">XERO_CLIENT_SECRET=<span className="text-gray-400">your-client-secret</span></p>
                  <p className="text-gray-700">XERO_REDIRECT_URI=https://green-rooms-crm.vercel.app/api/xero/callback</p>
                </div>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-semibold">6</span>
              <span>Redeploy the CRM (or push any change), then click <strong>Connect Xero</strong> above.</span>
            </li>
          </ol>
          <p className="mt-4 text-xs text-gray-400">
            Note: Xero refresh tokens expire after 60 days. You will need to reconnect if you do not sync within that window.
          </p>
        </div>
      )}
    </div>
  )
}
