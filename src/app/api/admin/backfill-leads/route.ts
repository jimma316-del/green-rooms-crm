import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { distanceFromHQ } from '@/lib/postcode'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: leads } = await admin
    .from('leads')
    .select('id, postcode, distance_miles, city')
    .not('postcode', 'is', null)

  if (!leads?.length) return NextResponse.json({ updated: 0 })

  let updated = 0
  let failed = 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const lead of leads as any[]) {
    const needsDistance = lead.distance_miles === null
    const needsCity = !lead.city
    if (!needsDistance && !needsCity) continue

    try {
      const clean = lead.postcode!.replace(/\s+/g, '').toUpperCase()
      const res = await fetch(`https://api.postcodes.io/postcodes/${clean}`)
      if (!res.ok) { failed++; continue }
      const json = await res.json()
      const result = json.result
      if (!result) { failed++; continue }

      const updateData: Record<string, unknown> = {}

      if (needsDistance) {
        const miles = await distanceFromHQ(lead.postcode!)
        if (miles !== null) updateData.distance_miles = parseFloat(miles.toFixed(1))
      }

      if (needsCity) {
        const city = result.admin_district || null
        if (city) updateData.city = city
      }

      if (Object.keys(updateData).length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin.from('leads') as any).update(updateData).eq('id', lead.id)
        updated++
      }
    } catch {
      failed++
    }
  }

  return NextResponse.json({ updated, failed, total: leads.length })
}
