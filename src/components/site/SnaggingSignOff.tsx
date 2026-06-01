'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, MapPin, ArrowLeft, Camera, X, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  leadId: string
  name: string
  address: string
}

interface MediaFile {
  file: File
  preview: string
  type: 'image' | 'video'
}

export function SnaggingSignOff({ leadId, name, address }: Props) {
  const [confirmed, setConfirmed] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [media, setMedia] = useState<MediaFile[]>([])
  const [uploadStatus, setUploadStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  function handleFiles(files: FileList | null) {
    if (!files) return
    const newMedia: MediaFile[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue
      newMedia.push({
        file,
        preview: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'video' : 'image',
      })
    }
    setMedia(prev => [...prev, ...newMedia])
  }

  function removeMedia(index: number) {
    setMedia(prev => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmed) return
    setLoading(true)

    // Upload media files to Supabase Storage
    const mediaUrls: string[] = []
    if (media.length > 0) {
      setUploadStatus(`Uploading media (0/${media.length})…`)
      for (let i = 0; i < media.length; i++) {
        const { file } = media[i]
        const ext = file.name.split('.').pop()
        const path = `${leadId}/${Date.now()}-${i}.${ext}`
        const { data, error } = await supabase.storage
          .from('snagging-media')
          .upload(path, file, { upsert: false })
        if (!error && data) {
          const { data: urlData } = supabase.storage.from('snagging-media').getPublicUrl(data.path)
          mediaUrls.push(urlData.publicUrl)
        }
        setUploadStatus(`Uploading media (${i + 1}/${media.length})…`)
      }
    }

    setUploadStatus('')
    const res = await fetch(`/api/leads/${leadId}/snagging-sign-off`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, mediaUrls }),
    })

    if (res.ok) {
      setDone(true)
    }
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

          {/* Photo / video upload */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Photos / videos <span className="text-gray-400 font-normal">(optional)</span>
            </p>

            {/* Previews */}
            {media.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {media.map((m, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    {m.type === 'image' ? (
                      <img src={m.preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={m.preview} className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = 'image/*'; fileInputRef.current.click() } }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Camera className="w-4 h-4" /> Add photo
              </button>
              <button
                type="button"
                onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = 'image/*,video/*'; fileInputRef.current.click() } }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4" /> Add video
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!confirmed || loading}
            className="w-full py-3 bg-[#1a4731] text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-opacity"
          >
            {loading ? (uploadStatus || 'Saving…') : 'Confirm Snagging Complete'}
          </button>
        </form>
      </div>
    </div>
  )
}
