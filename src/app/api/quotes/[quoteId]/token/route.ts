import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

interface Params { params: Promise<{ quoteId: string }> }

// POST /api/quotes/[quoteId]/token
// Generates (or returns existing) a client-facing share token for a version
export async function POST(req: NextRequest, { params }: Params) {
  const { quoteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { versionId } = await req.json()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminAny = admin as any

  // Check the version belongs to this quote
  const { data: version } = await adminAny
    .from('quote_versions')
    .select('id, client_token')
    .eq('id', versionId)
    .eq('quote_id', quoteId)
    .single()

  if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Return existing token or generate a new one
  let token = version.client_token
  if (!token) {
    token = crypto.randomBytes(24).toString('base64url')
    await adminAny.from('quote_versions').update({ client_token: token }).eq('id', versionId)
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://green-rooms-crm.vercel.app'
  return NextResponse.json({ token, url: `${baseUrl}/q/${token}` })
}
