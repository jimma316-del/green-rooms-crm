'use client'

import { useState, useRef } from 'react'
import { Plus, Trash2, Loader2, AlertCircle } from 'lucide-react'

interface StockItem {
  id: string
  name: string
  needs_reorder: boolean
  order_index: number
}

interface Props {
  initialItems: StockItem[]
  initialNotes: string
}

export function StockClient({ initialItems, initialNotes }: Props) {
  const [items, setItems] = useState<StockItem[]>(initialItems)
  const [notes, setNotes] = useState(initialNotes)
  const [newItemName, setNewItemName] = useState('')
  const [addingItem, setAddingItem] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const newItemRef = useRef<HTMLInputElement>(null)

  async function toggleReorder(item: StockItem) {
    const updated = !item.needs_reorder
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, needs_reorder: updated } : i))
    await fetch(`/api/stock/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ needs_reorder: updated }),
    })
  }

  async function addItem() {
    if (!newItemName.trim()) return
    setAddingItem(true)
    const res = await fetch('/api/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newItemName.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setItems(prev => [...prev, data])
      setNewItemName('')
      newItemRef.current?.focus()
    }
    setAddingItem(false)
  }

  async function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/stock/${id}`, { method: 'DELETE' })
  }

  async function saveNotes() {
    setSavingNotes(true)
    await fetch('/api/stock', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    setSavingNotes(false)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  const needsReorder = items.filter(i => i.needs_reorder)
  const upToDate = items.filter(i => !i.needs_reorder)

  return (
    <div className="max-w-2xl space-y-6">

      {/* Reorder alert */}
      {needsReorder.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 font-medium">
            {needsReorder.length} item{needsReorder.length > 1 ? 's' : ''} need{needsReorder.length === 1 ? 's' : ''} reordering
          </p>
        </div>
      )}

      {/* Stock list */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <div className="px-5 py-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Stock Items</p>
          <p className="text-xs text-gray-400">Check items that need reordering</p>
        </div>

        {items.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No items yet — add your first item below
          </div>
        )}

        {needsReorder.length > 0 && (
          <>
            {needsReorder.map(item => (
              <StockRow key={item.id} item={item} onToggle={toggleReorder} onDelete={deleteItem} />
            ))}
          </>
        )}

        {upToDate.length > 0 && (
          <>
            {upToDate.map(item => (
              <StockRow key={item.id} item={item} onToggle={toggleReorder} onDelete={deleteItem} />
            ))}
          </>
        )}

        {/* Add item */}
        <div className="px-5 py-3 flex items-center gap-2">
          <input
            ref={newItemRef}
            type="text"
            value={newItemName}
            onChange={e => setNewItemName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            placeholder="Add new item…"
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
          />
          <button
            onClick={addItem}
            disabled={addingItem || !newItemName.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand-header)] text-white text-xs font-medium rounded-lg hover:opacity-90 disabled:opacity-40"
          >
            {addingItem ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-900 mb-3">Other items / sundries</p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={5}
          placeholder="List any other items to order, sundries, one-offs…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600 resize-none"
        />
        <button
          onClick={saveNotes}
          disabled={savingNotes}
          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand-header)] text-white text-xs font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {savingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {notesSaved ? 'Saved!' : savingNotes ? 'Saving…' : 'Save notes'}
        </button>
      </div>
    </div>
  )
}

function StockRow({
  item,
  onToggle,
  onDelete,
}: {
  item: StockItem
  onToggle: (item: StockItem) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <input
        type="checkbox"
        checked={item.needs_reorder}
        onChange={() => onToggle(item)}
        className="w-4 h-4 rounded border-gray-300 accent-amber-500 shrink-0 cursor-pointer"
      />
      <span className={`flex-1 text-sm ${item.needs_reorder ? 'text-amber-700 font-medium' : 'text-gray-700'}`}>
        {item.name}
      </span>
      {item.needs_reorder && (
        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
          Reorder
        </span>
      )}
      <button
        onClick={() => onDelete(item.id)}
        className="p-1 text-gray-300 hover:text-red-400 transition-colors"
        title="Remove item"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
