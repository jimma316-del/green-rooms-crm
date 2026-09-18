'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Upload, Trash2, X } from 'lucide-react'

interface PhotoAsset {
  id: string
  image_url: string
  caption: string | null
  include_in_pdf: boolean
}

interface Props {
  quoteId: string
  versionId: string
  initialPhotos?: PhotoAsset[]
}

export function QuotePhotosTab({ quoteId, versionId, initialPhotos = [] }: Props) {
  const [photos, setPhotos] = useState<PhotoAsset[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    setUploading(true)
    try {
      // 1. Get signed upload URL
      const urlRes = await fetch(
        `/api/quotes/${quoteId}/versions/${versionId}/photos?filename=${encodeURIComponent(file.name)}`
      )
      if (!urlRes.ok) throw new Error('Failed to get upload URL')
      const { signedUrl, path, token } = await urlRes.json()

      // 2. Upload direct to Supabase Storage
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!uploadRes.ok) {
        // Try with token param format
        const altRes = await fetch(`${signedUrl}&token=${token}`, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })
        if (!altRes.ok) throw new Error('Upload failed')
      }

      // 3. Record in DB
      const recordRes = await fetch(`/api/quotes/${quoteId}/versions/${versionId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, caption: file.name.replace(/\.[^.]+$/, ''), sort_order: photos.length }),
      })
      if (!recordRes.ok) throw new Error('Failed to record photo')
      const { asset } = await recordRes.json()
      setPhotos(p => [...p, asset])
      toast.success('Photo uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function deletePhoto(id: string) {
    if (!confirm('Remove this photo?')) return
    try {
      await fetch(`/api/quotes/${quoteId}/versions/${versionId}/assets/${id}`, { method: 'DELETE' })
      setPhotos(p => p.filter(ph => ph.id !== id))
      toast.success('Photo removed')
    } catch {
      toast.error('Delete failed')
    }
  }

  async function togglePdf(id: string, val: boolean) {
    try {
      await fetch(`/api/quotes/${quoteId}/versions/${versionId}/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ include_in_pdf: val }),
      })
      setPhotos(p => p.map(ph => ph.id === id ? { ...ph, include_in_pdf: val } : ph))
    } catch { toast.error('Update failed') }
  }

  async function updateCaption(id: string, caption: string) {
    try {
      await fetch(`/api/quotes/${quoteId}/versions/${versionId}/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      })
      setPhotos(p => p.map(ph => ph.id === id ? { ...ph, caption } : ph))
    } catch { toast.error('Update failed') }
  }

  function handleFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach(f => {
      if (f.type.startsWith('image/')) uploadFile(f)
    })
  }

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          uploading ? 'border-[var(--primary)] bg-green-50' : 'border-gray-200 hover:border-[var(--primary)] hover:bg-gray-50'
        }`}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        <Upload size={28} className={`mx-auto mb-3 ${uploading ? 'text-[var(--primary)]' : 'text-gray-300'}`} />
        <p className="text-sm font-medium text-gray-600">
          {uploading ? 'Uploading…' : 'Drop photos here or click to select'}
        </p>
        <p className="text-xs text-gray-400 mt-1">Site photos, renders, existing space — for the proposal PDF</p>
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map(photo => (
            <div key={photo.id} className="group relative bg-white border border-gray-100 rounded-xl overflow-hidden">
              {/* Image */}
              <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.image_url}
                  alt={photo.caption ?? 'Site photo'}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Overlay controls */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={() => deletePhoto(photo.id)}
                  className="bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
                >
                  <X size={12} />
                </button>
              </div>

              {/* Caption + PDF toggle */}
              <div className="p-2 space-y-1.5">
                <input
                  defaultValue={photo.caption ?? ''}
                  onBlur={e => { if (e.target.value !== photo.caption) updateCaption(photo.id, e.target.value) }}
                  placeholder="Caption…"
                  className="w-full text-xs border-0 outline-none text-gray-600 placeholder:text-gray-300 bg-transparent"
                />
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={photo.include_in_pdf}
                    onChange={e => togglePdf(photo.id, e.target.checked)}
                    className="rounded w-3 h-3"
                  />
                  <span className="text-[10px] text-gray-400">Include in PDF</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && !uploading && (
        <p className="text-center text-xs text-gray-400 py-4">
          No photos yet. Upload site photos or renders to include in the proposal PDF.
        </p>
      )}

      {/* Actions */}
      {photos.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-sm text-[var(--primary)] border border-[var(--primary)] hover:bg-green-50 px-3 py-2 rounded-lg"
          >
            <Trash2 size={13} className="hidden" />
            <Upload size={13} /> Add more photos
          </button>
        </div>
      )}
    </div>
  )
}
