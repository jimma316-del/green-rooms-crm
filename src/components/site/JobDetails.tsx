'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, FileText, Trash2, Loader2, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type FileEntry = { url: string; name: string; uploaded_at: string }
type Category = 'job_spec' | 'cut_list' | 'elevation'

interface Props {
  leadId: string
  name: string
  address: string
  canUpload: boolean
  jobFiles: Partial<Record<Category, FileEntry[]>>
}

const SECTIONS: { key: Category; label: string; description: string }[] = [
  { key: 'job_spec',  label: 'Job Spec',           description: 'Full project specification document' },
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

export function JobDetails({ leadId, name, address, canUpload, jobFiles: initialJobFiles }: Props) {
  const router = useRouter()
  const [jobFiles, setJobFiles] = useState(initialJobFiles)

  function onFilesChange(cat: Category, files: FileEntry[]) {
    setJobFiles(prev => ({ ...prev, [cat]: files }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1a4731] text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 hover:opacity-70">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-sm">Job Details</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-bold text-gray-900 text-lg">{name}</p>
          {address && <p className="text-sm text-gray-500 mt-0.5">{address}</p>}
          {!canUpload && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg mt-3">
              View only — contact admin or sales to upload files
            </p>
          )}
        </div>

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
