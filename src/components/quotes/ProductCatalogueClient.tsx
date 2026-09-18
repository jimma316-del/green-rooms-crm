'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Check, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'

export interface CatalogueProduct {
  id: string
  category: string
  sku: string | null
  name: string
  description: string | null
  unit: string
  base_price_pence: number
  vat_rate: number
  sort_order: number
  is_active: boolean
  is_size_banded: boolean
}

interface Props { initialProducts: CatalogueProduct[] }

const CATEGORIES = [
  { value: 'room_shell', label: 'Room Shell' },
  { value: 'cladding', label: 'Cladding' },
  { value: 'window', label: 'Windows' },
  { value: 'bifold', label: 'Bi-fold / Sliding Doors' },
  { value: 'door', label: 'External Doors' },
  { value: 'internal_door', label: 'Internal Doors' },
  { value: 'ceiling', label: 'Ceiling' },
  { value: 'wall', label: 'Walls' },
  { value: 'floor', label: 'Flooring' },
  { value: 'electrics', label: 'Electrical' },
  { value: 'extras', label: 'Extras' },
  { value: 'delivery', label: 'Delivery' },
]

const UNITS = ['item', 'each', 'm2', 'linear_m', 'day']
const UNIT_LABELS: Record<string, string> = { item: 'item', each: 'each', m2: 'm²', linear_m: 'linear m', day: 'day' }

function poundStr(pence: number) {
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function catLabel(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.label ?? cat
}

// ─── Product Form ─────────────────────────────────────────────────────────────
interface ProductFormData {
  category: string; name: string; description: string; sku: string
  unit: string; base_price_pence: number; vat_rate: number; sort_order: number
}

function defaultForm(product?: CatalogueProduct): ProductFormData {
  return {
    category: product?.category ?? 'room_shell',
    name: product?.name ?? '',
    description: product?.description ?? '',
    sku: product?.sku ?? '',
    unit: product?.unit ?? 'item',
    base_price_pence: product?.base_price_pence ?? 0,
    vat_rate: product?.vat_rate ?? 0.2,
    sort_order: product?.sort_order ?? 0,
  }
}

function ProductFormModal({ product, onClose, onSaved }: {
  product?: CatalogueProduct
  onClose: () => void
  onSaved: (p: CatalogueProduct) => void
}) {
  const [form, setForm] = useState<ProductFormData>(defaultForm(product))
  const [saving, setSaving] = useState(false)

  function setField<K extends keyof ProductFormData>(k: K, v: ProductFormData[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const url = product ? `/api/product-catalogue/${product.id}` : '/api/product-catalogue'
      const method = product ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          description: form.description || null,
          sku: form.sku || null,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      const { product: saved } = await res.json()
      onSaved(saved)
      toast.success(product ? 'Product updated' : 'Product created')
      onClose()
    } catch {
      toast.error('Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const priceStr = (form.base_price_pence / 100).toFixed(2)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <span className="font-semibold text-gray-800">{product ? 'Edit Product' : 'New Product'}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Category *</label>
              <select
                value={form.category}
                onChange={e => setField('category', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">SKU</label>
              <input
                value={form.sku}
                onChange={e => setField('sku', e.target.value)}
                placeholder="e.g. WIN-001"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Name *</label>
            <input
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="e.g. Double glazed fixed window"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)] resize-y"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Unit</label>
              <select
                value={form.unit}
                onChange={e => setField('unit', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]"
              >
                {UNITS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Base price (£)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceStr}
                onChange={e => setField('base_price_pence', Math.round(parseFloat(e.target.value || '0') * 100))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)] text-right"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">VAT rate</label>
              <select
                value={form.vat_rate}
                onChange={e => setField('vat_rate', parseFloat(e.target.value))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]"
              >
                <option value={0.2}>20%</option>
                <option value={0.05}>5%</option>
                <option value={0}>0%</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Sort order</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={e => setField('sort_order', parseInt(e.target.value) || 0)}
              className="w-28 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5 border-t border-gray-100 pt-4 shrink-0">
          <button onClick={onClose} className="flex-1 text-sm text-gray-500 border border-gray-200 rounded-lg py-2.5 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 text-sm font-medium text-white bg-[var(--primary)] hover:opacity-90 rounded-lg py-2.5 disabled:opacity-50">
            {saving ? 'Saving…' : product ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Product Row ──────────────────────────────────────────────────────────────
function ProductRow({ product, onEdit, onToggle, onDelete }: {
  product: CatalogueProduct
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div className={`flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 ${!product.is_active ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{product.name}</span>
          {product.sku && <span className="text-xs text-gray-400 font-mono">{product.sku}</span>}
        </div>
        {product.description && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{product.description}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold text-gray-800">
          {product.base_price_pence > 0 ? poundStr(product.base_price_pence) : <span className="text-gray-400 font-normal">manual</span>}
        </div>
        <div className="text-xs text-gray-400">per {UNIT_LABELS[product.unit] ?? product.unit}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-50">
          <Pencil size={13} />
        </button>
        <button onClick={onToggle} title={product.is_active ? 'Deactivate' : 'Activate'}
          className={`p-1.5 rounded hover:bg-gray-50 ${product.is_active ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`}>
          {product.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
        </button>
        <button onClick={onDelete} className="p-1.5 text-gray-300 hover:text-red-500 rounded hover:bg-gray-50">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ProductCatalogueClient({ initialProducts }: Props) {
  const [products, setProducts] = useState<CatalogueProduct[]>(initialProducts)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<CatalogueProduct | undefined>()
  const [filterCat, setFilterCat] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter(p => {
      if (!showInactive && !p.is_active) return false
      if (filterCat !== 'all' && p.category !== filterCat) return false
      if (q && !p.name.toLowerCase().includes(q) && !(p.sku ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [products, filterCat, showInactive, search])

  const byCategory = useMemo(() => {
    const groups: Record<string, CatalogueProduct[]> = {}
    for (const p of filtered) {
      if (!groups[p.category]) groups[p.category] = []
      groups[p.category].push(p)
    }
    return groups
  }, [filtered])

  async function toggleActive(product: CatalogueProduct) {
    try {
      const res = await fetch(`/api/product-catalogue/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !product.is_active }),
      })
      if (!res.ok) throw new Error()
      const { product: updated } = await res.json()
      setProducts(ps => ps.map(p => p.id === updated.id ? updated : p))
      toast.success(updated.is_active ? 'Product activated' : 'Product deactivated')
    } catch {
      toast.error('Failed to update')
    }
  }

  async function deleteProduct(product: CatalogueProduct) {
    if (!confirm(`Deactivate "${product.name}"? It won't be deleted — just hidden from the picker.`)) return
    try {
      await fetch(`/api/product-catalogue/${product.id}`, { method: 'DELETE' })
      setProducts(ps => ps.map(p => p.id === product.id ? { ...p, is_active: false } : p))
      toast.success('Product deactivated')
    } catch {
      toast.error('Failed to deactivate')
    }
  }

  function openEdit(p: CatalogueProduct) {
    setEditProduct(p)
    setShowForm(true)
  }

  function openNew() {
    setEditProduct(undefined)
    setShowForm(true)
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products…"
          className="flex-1 min-w-40 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]"
        />
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <button
          onClick={() => setShowInactive(o => !o)}
          className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition-colors ${showInactive ? 'border-[var(--primary)] text-[var(--primary)] bg-green-50' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          {showInactive ? <Check size={13} /> : null}
          Show inactive
        </button>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-[var(--primary)] hover:opacity-90 px-4 py-2 rounded-lg"
        >
          <Plus size={14} /> New product
        </button>
      </div>

      {/* Products by category */}
      <div className="space-y-6">
        {Object.entries(byCategory).map(([cat, prods]) => (
          <div key={cat} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{catLabel(cat)}</span>
              <span className="text-xs text-gray-400">{prods.length} product{prods.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="px-4">
              {prods.map(p => (
                <ProductRow
                  key={p.id}
                  product={p}
                  onEdit={() => openEdit(p)}
                  onToggle={() => toggleActive(p)}
                  onDelete={() => deleteProduct(p)}
                />
              ))}
            </div>
          </div>
        ))}
        {Object.keys(byCategory).length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No products found</p>
            <button onClick={openNew} className="mt-2 text-sm text-[var(--primary)] hover:opacity-70 font-medium">
              Add your first product →
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <ProductFormModal
          product={editProduct}
          onClose={() => { setShowForm(false); setEditProduct(undefined) }}
          onSaved={saved => {
            setProducts(ps => {
              const exists = ps.find(p => p.id === saved.id)
              return exists ? ps.map(p => p.id === saved.id ? saved : p) : [...ps, saved]
            })
          }}
        />
      )}
    </div>
  )
}
