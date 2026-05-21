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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: leads } = await (admin as any)
    .from('leads')
    .select('id, postcode, distance_miles, address, city, address_line_2, calculator_data')

  if (!leads?.length) return NextResponse.json({ updated: 0 })

  let updated = 0
  let failed = 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const lead of leads as any[]) {
    const needsDistance = lead.distance_miles === null && lead.postcode
    const needsCity = !lead.city && lead.postcode
    const needsLine2 = !lead.address_line_2 && lead.calculator_data
    const needsAddress = !lead.address && lead.calculator_data

    if (!needsDistance && !needsCity && !needsLine2 && !needsAddress) continue

    try {
      const updateData: Record<string, unknown> = {}

      if (needsLine2 || needsAddress || needsCity) {
        const fields = lead.calculator_data?.fields ?? lead.calculator_data ?? {}

        if (needsAddress) {
          const address = fields['Address Line 1'] || fields['Address 1'] || fields['Address'] || fields['First Line of Address'] || fields['Street Address'] || null
          if (address) updateData.address = address
        }

        if (needsLine2) {
          const line2 = fields['Address Line 2'] || fields['Adress Line 2'] || fields['Address 2'] || null
          if (line2) updateData.address_line_2 = line2
        }

        if (needsCity) {
          const cityFromForm = fields['City Or Town'] || fields['City'] || fields['Town'] || fields['city'] || fields['town'] || null
          if (cityFromForm) updateData.city = cityFromForm
        }
      }

      if ((needsDistance || (needsCity && !updateData.city)) && lead.postcode) {
        const clean = lead.postcode.replace(/\s+/g, '').toUpperCase()
        const res = await fetch(`https://api.postcodes.io/postcodes/${clean}`)
        if (res.ok) {
          const json = await res.json()
          const result = json.result
          if (result) {
            if (needsDistance) {
              const miles = await distanceFromHQ(lead.postcode)
              if (miles !== null) updateData.distance_miles = parseFloat(miles.toFixed(1))
            }
            if (needsCity && !updateData.city) {
              const city = result.admin_district || null
              if (city) updateData.city = city
            }
          }
        }
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
