'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, MapPin, ArrowLeft, Camera, X, Loader2 } from 'lucide-react'

interface Props {
  leadId: string
  name: string
  address: string
  existingPhotos: string[]
}

export function SnaggingSignOff({ leadId, name, address, existingPhotos }: Props) {
  const [confirmed, setConfirmed] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [photos, setPhotos] = useState<string[]>(existingPhotos)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return
    setUploading(true)
    setUploadError(null)

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue

      const body = new FormData()
      body.append('file', file)

      try {
        const res = await fetch(`/api/leads/${leadId}/snagging-upload`, { method: 'POST', body })
        const data = await res.json()
        if (res.ok) {
          setPhotos(prev => [...prev, data.url])
        } else {
          setUploadError(data.error ?? `Upload failed (${res.status})`)
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
      }
    }

    setUploading(false)
  }

  async function removePhoto(url: string) {
    await fetch(`/api/leads/${leadId}/snagging-upload`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    setPhotos(prev => prev.filter(u => u !== url))
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
          className="px-6 py-2.5 bg-[#1a4731] text-white rounded-lg text-sm font-semibold"
        >
          Back to Jobs
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1a4731] text-white px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 hover:opacity-70">
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
          {/* Photos / videos */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Photos & videos</p>
              <span className="text-xs text-gray-400">{photos.length} uploaded</span>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photos.map((url, i) => {
                  const isVideo = url.match(/\.(mp4|mov|webm|avi)(\?|$)/i)
                  return (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      {isVideo ? (
                        <video src={url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(url)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  )
                })}
                {uploading && (
                  <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  </div>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 w-full justify-center py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
              ) : (
                <><Camera className="w-4 h-4" /> Add photos or videos</>
              )}
            </button>
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
            className="w-full py-3 bg-[#1a4731] text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-opacity"
          >
            {loading ? 'Saving…' : 'Confirm Snagging Complete'}
          </button>
        </form>
      </div>
    </div>
  )
}
