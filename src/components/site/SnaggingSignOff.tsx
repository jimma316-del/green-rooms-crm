'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, MapPin, ArrowLeft, Camera, ImagePlus, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  leadId: string
  name: string
  address: string
}

export function SnaggingSignOff({ leadId, name, address }: Props) {
  const [confirmed, setConfirmed] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    if (photos.length >= 3) return
    setUploading(true)
    setUploadError(null)
    const supabase = createClient()
    try {
      const urlRes = await fetch(`/api/leads/${leadId}/snagging-upload?filename=${encodeURIComponent(file.name)}`)
      const urlData = await urlRes.json()
      if (!urlRes.ok) { setUploadError(urlData.error ?? 'Failed to get upload URL'); return }

      const { error: uploadErr } = await supabase.storage
        .from('snagging-media')
        .uploadToSignedUrl(urlData.path, urlData.token, file, { contentType: file.type })
      if (uploadErr) { setUploadError(uploadErr.message); return }

      setPhotos(prev => [...prev, urlData.publicUrl])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmed) return
    setLoading(true)
    const res = await fetch(`/api/leads/${leadId}/snagging-sign-off`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, mediaUrls: photos }),
    })
    if (res.ok) setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Snagging complete</h2>
        <p className="text-sm text-gray-500 mb-6">{name} has been archived.</p>
        <button
          onClick={() => router.push('/jobs')}
          className="px-6 py-2.5 bg-[var(--brand-header)] text-white rounded-lg text-sm font-semibold"
        >
          Back to Jobs
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[var(--brand-header)] text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/jobs?tab=snagging')} className="p-1 hover:opacity-70">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-sm">Snagging Sign-Off</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <h2 className="font-bold text-gray-900 text-lg">{name}</h2>
          {address && (
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-sm text-gray-500">{address}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Completion photos <span className="text-gray-400 font-normal">(up to 3, optional)</span>
            </p>
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photos.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img src={url} alt="Completion" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {uploading ? (
              <div className="flex items-center justify-center gap-2 py-2.5 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
              </div>
            ) : photos.length < 3 ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
                >
                  <Camera className="w-4 h-4" /> Camera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
                >
                  <ImagePlus className="w-4 h-4" /> Gallery
                </button>
              </div>
            ) : null}
            {uploadError && (
              <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{uploadError}</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-gray-300 accent-green-700 shrink-0"
              />
              <span className="text-sm text-gray-800 font-medium leading-snug">
                I confirm the client has reviewed all snagging items and is happy that everything has been resolved to their satisfaction.
              </span>
            </label>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any notes about the snagging completion…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={!confirmed || loading || uploading}
            className="w-full py-3 bg-[var(--brand-header)] text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-opacity"
          >
            {loading ? 'Saving…' : 'Confirm Snagging Complete'}
          </button>
        </form>
      </div>
    </div>
  )
}
