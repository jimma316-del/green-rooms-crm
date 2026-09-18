'use client'

import { useState } from 'react'
import { Plus, Check, Trash2, Eye, X, Edit3 } from 'lucide-react'
import { toast } from 'sonner'

export interface TCVersion {
  id: string
  version_tag: string
  content_html: string
  is_current: boolean
  created_at: string
}

interface Props { initialVersions: TCVersion[] }

// ─── Preview Modal ────────────────────────────────────────────────────────────
function PreviewModal({ version, onClose }: { version: TCVersion; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <span className="font-semibold text-gray-800">T&amp;Cs Preview — {version.version_tag}</span>
            {version.is_current && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Current</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div
          className="overflow-y-auto flex-1 p-6 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: version.content_html }}
        />
      </div>
    </div>
  )
}

// ─── Edit / Create Modal ──────────────────────────────────────────────────────
function EditModal({ version, onClose, onSaved }: {
  version?: TCVersion
  onClose: () => void
  onSaved: (v: TCVersion) => void
}) {
  const [versionTag, setVersionTag] = useState(version?.version_tag ?? '')
  const [contentHtml, setContentHtml] = useState(version?.content_html ?? '')
  const [makeCurrent, setMakeCurrent] = useState(false)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!versionTag.trim()) { toast.error('Version tag required'); return }
    if (!contentHtml.trim()) { toast.error('Content required'); return }
    setSaving(true)
    try {
      const url = version ? `/api/tc-versions/${version.id}` : '/api/tc-versions'
      const method = version ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version_tag: versionTag.trim(), content_html: contentHtml, make_current: makeCurrent, is_current: makeCurrent }),
      })
      if (!res.ok) throw new Error()
      const { version: saved } = await res.json()
      onSaved(saved)
      toast.success(version ? 'T&Cs updated' : 'T&Cs version created')
      onClose()
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <span className="font-semibold text-gray-800">{version ? 'Edit T&Cs' : 'New T&Cs Version'}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Version tag *</label>
            <input
              value={versionTag}
              onChange={e => setVersionTag(e.target.value)}
              placeholder="e.g. v1.0 or 2026-01"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">
              Content HTML * <span className="text-gray-400 font-normal">(paste or type HTML — rendered as-is in PDF and client view)</span>
            </label>
            <textarea
              value={contentHtml}
              onChange={e => setContentHtml(e.target.value)}
              rows={18}
              className="w-full text-xs font-mono border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-[var(--primary)] resize-y"
              placeholder="<h2>Terms &amp; Conditions</h2>&#10;<p>…</p>"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={makeCurrent} onChange={e => setMakeCurrent(e.target.checked)}
              className="rounded border-gray-300 text-[var(--primary)]" />
            <span className="text-sm text-gray-700">Set as current version (used in new quotes)</span>
          </label>
        </div>
        <div className="flex gap-2 px-5 pb-5 border-t border-gray-100 pt-4 shrink-0">
          <button onClick={onClose} className="flex-1 text-sm text-gray-500 border border-gray-200 rounded-lg py-2.5 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 text-sm font-medium text-white bg-[var(--primary)] hover:opacity-90 rounded-lg py-2.5 disabled:opacity-50">
            {saving ? 'Saving…' : version ? 'Save changes' : 'Create version'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Version Row ──────────────────────────────────────────────────────────────
function VersionRow({ version, onPreview, onEdit, onSetCurrent, onDelete }: {
  version: TCVersion
  onPreview: () => void
  onEdit: () => void
  onSetCurrent: () => void
  onDelete: () => void
}) {
  const date = new Date(version.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900">{version.version_tag}</span>
          {version.is_current && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Current</span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Created {date}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onPreview} title="Preview" className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-50">
          <Eye size={14} />
        </button>
        <button onClick={onEdit} title="Edit" className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-50">
          <Edit3 size={13} />
        </button>
        {!version.is_current && (
          <button onClick={onSetCurrent} title="Set as current" className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-gray-50">
            <Check size={14} />
          </button>
        )}
        {!version.is_current && (
          <button onClick={onDelete} title="Delete" className="p-1.5 text-gray-300 hover:text-red-500 rounded hover:bg-gray-50">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function TermsClient({ initialVersions }: Props) {
  const [versions, setVersions] = useState<TCVersion[]>(initialVersions)
  const [preview, setPreview] = useState<TCVersion | null>(null)
  const [editVersion, setEditVersion] = useState<TCVersion | undefined>()
  const [showEdit, setShowEdit] = useState(false)

  async function setCurrent(v: TCVersion) {
    if (!confirm(`Set "${v.version_tag}" as the current T&Cs for all new quotes?`)) return
    try {
      const res = await fetch(`/api/tc-versions/${v.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_current: true }),
      })
      if (!res.ok) throw new Error()
      setVersions(vs => vs.map(x => ({ ...x, is_current: x.id === v.id })))
      toast.success(`${v.version_tag} set as current T&Cs`)
    } catch {
      toast.error('Failed to update')
    }
  }

  async function deleteVersion(v: TCVersion) {
    if (!confirm(`Delete T&Cs version "${v.version_tag}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/tc-versions/${v.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(error ?? 'Failed to delete')
        return
      }
      setVersions(vs => vs.filter(x => x.id !== v.id))
      toast.success('Version deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">The current version is embedded in every PDF quote. Mark a new version as current to apply it going forward.</p>
        <button
          onClick={() => { setEditVersion(undefined); setShowEdit(true) }}
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-[var(--primary)] hover:opacity-90 px-4 py-2 rounded-lg shrink-0 ml-4"
        >
          <Plus size={14} /> New version
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {versions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No T&amp;Cs yet</p>
            <button onClick={() => { setEditVersion(undefined); setShowEdit(true) }} className="mt-2 text-sm text-[var(--primary)] font-medium hover:opacity-70">
              Create first version →
            </button>
          </div>
        ) : (
          <div className="px-4">
            {versions.map(v => (
              <VersionRow
                key={v.id}
                version={v}
                onPreview={() => setPreview(v)}
                onEdit={() => { setEditVersion(v); setShowEdit(true) }}
                onSetCurrent={() => setCurrent(v)}
                onDelete={() => deleteVersion(v)}
              />
            ))}
          </div>
        )}
      </div>

      {preview && <PreviewModal version={preview} onClose={() => setPreview(null)} />}

      {showEdit && (
        <EditModal
          version={editVersion}
          onClose={() => { setShowEdit(false); setEditVersion(undefined) }}
          onSaved={saved => {
            setVersions(vs => {
              const exists = vs.find(v => v.id === saved.id)
              let updated = exists
                ? vs.map(v => v.id === saved.id ? saved : v)
                : [saved, ...vs]
              // If saved is_current, clear others
              if (saved.is_current) {
                updated = updated.map(v => ({ ...v, is_current: v.id === saved.id }))
              }
              return updated
            })
          }}
        />
      )}
    </div>
  )
}
