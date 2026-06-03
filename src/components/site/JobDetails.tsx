'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, FileText, Trash2, Loader2, ExternalLink, Save, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type FileEntry = { url: string; name: string; uploaded_at: string }
type Category = 'cut_list' | 'elevation'

type DeliveryKey = 'doors_windows' | 'champion' | 'sips' | 'cladding' | 'rubber_roof' | 'plasterboard'
type BuildApproval = { initials: string; signed_at: string } | null
type DeliveryInfo = Partial<Record<DeliveryKey, string | null>> & { notes?: string; build_approval?: BuildApproval }

const DELIVERY_ITEMS: { key: DeliveryKey; label: string }[] = [
  { key: 'doors_windows', label: 'Doors & Windows' },
  { key: 'champion',      label: 'Champion' },
  { key: 'sips',          label: 'SIPs' },
  { key: 'cladding',      label: 'Cladding' },
  { key: 'rubber_roof',   label: 'Rubber Roof' },
  { key: 'plasterboard',  label: 'Plasterboard' },
]

interface Props {
  leadId: string
  name: string
  address: string
  canUpload: boolean
  jobFiles: Partial<Record<Category, FileEntry[]>>
  deliveryInfo: DeliveryInfo
  jobSpecUrl: string | null
  buildApproval: BuildApproval
}

const SECTIONS: { key: Category; label: string; description: string }[] = [
  { key: 'cut_list',  label: 'Cut List',            description: 'Timber and materials cut list' },
  { key: 'elevation', label: 'Elevation Drawings',  description: 'Site elevation and layout drawings' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function FileSection({
  section,
  files,
  leadId,
  canUpload,
  onFilesChange,
}: {
  section: typeof SECTIONS[0]
  files: FileEntry[]
  leadId: string
  canUpload: boolean
  onFilesChange: (cat: Category, files: FileEntry[]) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFile(file: File) {
    setUploading(true)
    setError(null)
    try {
      const res = await fetch(`/api/leads/${leadId}/job-file?filename=${encodeURIComponent(file.name)}&category=${section.key}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to get upload URL'); return }

      const { error: uploadErr } = await supabase.storage
        .from('job-files')
        .uploadToSignedUrl(data.path, data.token, file, { contentType: file.type })
      if (uploadErr) { setError(uploadErr.message); return }

      const recordRes = await fetch(`/api/leads/${leadId}/job-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: section.key, filename: file.name, url: data.publicUrl }),
      })
      if (!recordRes.ok) { setError('Upload succeeded but failed to save'); return }

      onFilesChange(section.key, [...files, { url: data.publicUrl, name: file.name, uploaded_at: new Date().toISOString() }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function removeFile(entry: FileEntry) {
    await fetch(`/api/leads/${leadId}/job-file`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: section.key, url: entry.url }),
    })
    onFilesChange(section.key, files.filter(f => f.url !== entry.url))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{section.label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{section.description}</p>
        </div>
        {canUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 shrink-0"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </>
        )}
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}

      {files.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">No files uploaded yet</p>
      ) : (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
              <FileText className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{f.name}</p>
                <p className="text-[10px] text-gray-400">{formatDate(f.uploaded_at)}</p>
              </div>
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-400 hover:text-[var(--primary)]"
                title="Open file"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              {canUpload && (
                <button
                  onClick={() => removeFile(f)}
                  className="p-1.5 text-gray-300 hover:text-red-500"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BuildApprovalSection({
  leadId,
  initial,
}: {
  leadId: string
  initial: BuildApproval
}) {
  const [approval, setApproval] = useState<BuildApproval>(initial)
  const [initials, setInitials] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    if (!initials.trim()) return
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/leads/${leadId}/build-approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initials: initials.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to save'); setSaving(false); return }
    setApproval(data.build_approval)
    setSaving(false)
  }

  if (approval) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
        <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
          <Check className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-green-900">Build location &amp; screw height approved by customer</p>
          <p className="text-xs text-green-700 mt-0.5">
            Signed: <span className="font-bold">{approval.initials}</span> &nbsp;·&nbsp;{' '}
            {new Date(approval.signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}{' '}
            {new Date(approval.signed_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <p className="text-sm font-semibold text-amber-900 mb-3">Build location &amp; screw height approved by customer</p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={initials}
          onChange={e => setInitials(e.target.value.slice(0, 4).toUpperCase())}
          placeholder="Initials"
          maxLength={4}
          className="w-20 text-sm border border-amber-300 rounded-lg px-2 py-2 text-center uppercase font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-500 bg-white placeholder:font-normal placeholder:text-gray-400"
        />
        <button
          onClick={confirm}
          disabled={saving || !initials.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Confirm
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}

function JobSpecSection({
  leadId,
  canUpload,
  initialUrl,
}: {
  leadId: string
  canUpload: boolean
  initialUrl: string | null
}) {
  const [url, setUrl] = useState(initialUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    await fetch(`/api/leads/${leadId}/xero-link`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() || null }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Job Spec</p>
          <p className="text-xs text-gray-400 mt-0.5">Xero link for the project specification</p>
        </div>
      </div>

      {canUpload ? (
        <div className="space-y-2">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://go.xero.com/..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600"
          />
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[var(--brand-header)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save link'}
          </button>
        </div>
      ) : url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
        >
          <ExternalLink className="w-4 h-4 shrink-0" /> Open Job Spec
        </a>
      ) : (
        <p className="text-xs text-gray-400">No link added yet</p>
      )}
    </div>
  )
}

function DeliverySection({
  leadId,
  canUpload,
  initialInfo,
}: {
  leadId: string
  canUpload: boolean
  initialInfo: DeliveryInfo
}) {
  const [info, setInfo] = useState<DeliveryInfo>(initialInfo)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save(updated: DeliveryInfo) {
    setSaving(true)
    await fetch(`/api/leads/${leadId}/delivery-info`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function setDate(key: DeliveryKey, val: string) {
    const updated = { ...info, [key]: val || null }
    setInfo(updated)
  }

  function setNotes(val: string) {
    setInfo(prev => ({ ...prev, notes: val }))
  }

  function formatDisplay(iso: string) {
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm font-semibold text-gray-900 mb-4">Delivery Dates</p>

      <div className="space-y-3">
        {DELIVERY_ITEMS.map(item => (
          <div key={item.key} className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-700 min-w-0 flex-1">{item.label}</span>
            {canUpload ? (
              <input
                type="date"
                value={info[item.key] ?? ''}
                onChange={e => setDate(item.key, e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600 shrink-0"
              />
            ) : (
              <span className="text-sm text-gray-500 shrink-0">
                {info[item.key] ? formatDisplay(info[item.key]!) : <span className="text-gray-300">Not set</span>}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
        {canUpload ? (
          <textarea
            value={info.notes ?? ''}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Any other delivery notes…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600 resize-none"
          />
        ) : (
          <p className="text-sm text-gray-500 whitespace-pre-wrap">
            {info.notes || <span className="text-gray-300">No notes</span>}
          </p>
        )}
      </div>

      {canUpload && (
        <button
          onClick={() => save(info)}
          disabled={saving}
          className="mt-3 flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[var(--brand-header)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
        </button>
      )}
    </div>
  )
}

export function JobDetails({ leadId, name, address, canUpload, jobFiles: initialJobFiles, deliveryInfo, jobSpecUrl, buildApproval }: Props) {
  const router = useRouter()
  const [jobFiles, setJobFiles] = useState(initialJobFiles)

  function onFilesChange(cat: Category, files: FileEntry[]) {
    setJobFiles(prev => ({ ...prev, [cat]: files }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[var(--brand-header)] text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 hover:opacity-70">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-sm">Job Details</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-bold text-gray-900 text-lg">{name}</p>
          {address && <p className="text-sm text-gray-500 mt-0.5">{address}</p>}
        </div>

        <BuildApprovalSection leadId={leadId} initial={buildApproval} />

        <JobSpecSection leadId={leadId} canUpload={canUpload} initialUrl={jobSpecUrl} />

        <DeliverySection leadId={leadId} canUpload={canUpload} initialInfo={deliveryInfo} />

        {SECTIONS.map(section => (
          <FileSection
            key={section.key}
            section={section}
            files={jobFiles[section.key] ?? []}
            leadId={leadId}
            canUpload={canUpload}
            onFilesChange={onFilesChange}
          />
        ))}
      </div>
    </div>
  )
}
