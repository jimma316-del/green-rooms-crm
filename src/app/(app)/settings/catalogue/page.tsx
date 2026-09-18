export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProductCatalogueClient } from '@/components/quotes/ProductCatalogueClient'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function CataloguePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: products } = await (admin as any)
    .from('product_catalogue')
    .select('id, category, sku, name, description, unit, base_price_pence, vat_rate, sort_order, is_active, is_size_banded')
    .order('category')
    .order('sort_order')

  return (
    <div className="px-4 md:px-6 py-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Product Catalogue</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage the products and services available in quotes</p>
        </div>
      </div>

      <ProductCatalogueClient initialProducts={products ?? []} />
    </div>
  )
}
