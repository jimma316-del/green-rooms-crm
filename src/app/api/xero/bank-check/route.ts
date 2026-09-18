import { NextResponse } from 'next/server'
import { xeroFetch } from '@/lib/xero'

export async function GET() {
  const res = await xeroFetch('/Accounts?Type=BANK')
  const json = await res.json()
  const accounts = json.Accounts ?? []

  // Check for recent bank transactions to confirm feeds are active
  const txRes = await xeroFetch('/BankTransactions?pageSize=5&order=Date+DESC')
  const txJson = await txRes.json()
  const recentTx = txJson.BankTransactions ?? []

  return NextResponse.json({
    accounts: accounts.map((a: { Name: string; Code: string; BankAccountNumber?: string }) => ({
      name: a.Name,
      code: a.Code,
      accountNumber: a.BankAccountNumber ?? null,
    })),
    recentTransactionCount: recentTx.length,
    feedsLikelyConnected: recentTx.length > 0,
  })
}
