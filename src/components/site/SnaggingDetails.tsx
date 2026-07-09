'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MapPin, ArrowLeft, Camera, X, Loader2, Play, Pencil, Check, ClipboardCheck, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SnaggingTask {
  id: string
  title: string
  notes: string | null
  due_date: string | null
}

interface Props {
  leadId: string
  name: string
  address: string
  existingPhotos: string[]
  task: SnaggingTask | null
}

function isVideo(url: string) {
  return /\.(mp4|mov|webm|avi|m4v|hevc)(\?|$)/i.test(url)
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const video = isVideo(url)
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
        <X className="w-5 h-5 text-white" />
      </button>
      {video ? (
        <video src={url} controls autoPlay className="max-w-full max-h-full" onClick={e => e.stopPropagation()} />
      ) : (
        <img src={url} alt="" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
      )}
    </div>
  )
}

export function SnaggingDetails({ leadId, name, address, existingPhotos, task }: Props) {
  const [photos, setPhotos] = useState<string[]>(existingPhotos)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState(false)
  const [taskNotes, setTaskNotes] = useState(task?.notes ?? '')
  const [taskId, setTaskId] = useState(task?.id ?? null)
  const [savingTask, setSavingTask] = useState(false)
  const [snaggingDate, setSnaggingDate] = useState(task?.due_date?.slice(0, 10) ?? '')
  const [savingDate, setSavingDate] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function saveTaskNotes() {
    setSavingTask(true)
    const res = await fetch(`/api/leads/${leadId}/snagging-task`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, notes: taskNotes }),
    })
    const data = await res.json()
    if (data.taskId) setTaskId(data.taskId)
    setSavingTask(false)
    setEditingTask(false)
  }

  async function saveSnaggingDate(date: string) {
    setSavingDate(true)
    await fetch(`/api/leads/${leadId}/snagging-task`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, due_date: date || null }),
    })
    setSavingDate(false)
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return
    setUploading(true)
    setUploadError(null)
    const supabase = createClient()

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue
      try {
        const urlRes = await fetch(`/api/leads/${leadId}/snagging-upload?filename=${encodeURIComponent(file.name)}`)
        const urlData = await urlRes.json()
        if (!urlRes.ok) { setUploadError(urlData.error ?? 'Failed to get upload URL'); continue }

        const { error: uploadErr } = await supabase.storage
          .from('snagging-media')
          .uploadToSignedUrl(urlData.path, urlData.token, file, { contentType: file.type })
        if (uploadErr) { setUploadError(uploadErr.message); continue }

        const actRes = await fetch(`/api/leads/${leadId}/snagging-upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlData.publicUrl }),
        })
        const actData = await actRes.json()
        if (!actRes.ok) { setUploadError(actData.error ?? 'Failed to record upload'); continue }

        setPhotos(prev => [...prev, urlData.publicUrl])
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
      }
    }

    setUploading(false)
  }

  async function removePhoto(e: React.MouseEvent, url: string) {
    e.stopPropagation()
    await fetch(`/api/leads/${leadId}/snagging-upload`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    setPhotos(prev => prev.filter(u => u !== url))
  }

  return (
    <>
      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      <div className="min-h-screen bg-gray-50">
        <header className="bg-[var(--brand-header)] text-white px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/jobs?tab=snagging')} className="p-1 hover:opacity-70">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm">Snagging Details</span>
        </header>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-bold text-gray-900 text-lg">{name}</h2>
            {address && (
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-sm text-gray-500">{address}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-orange-500" />
              <p className="text-sm font-semibold text-gray-800">Snagging date</p>
              {savingDate && <span className="text-xs text-gray-400 ml-auto">Saving…</span>}
            </div>
            <input
              type="date"
              value={snaggingDate}
              onChange={e => {
                setSnaggingDate(e.target.value)
                saveSnaggingDate(e.target.value)
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
            />
          </div>

          <div className="bg-white rounded-xl border border-orange-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-800">Snagging items</p>
              {!editingTask && (
                <button
                  onClick={() => setEditingTask(true)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              )}
            </div>
            {editingTask ? (
              <div className="space-y-2">
                <textarea
                  value={taskNotes}
                  onChange={e => setTaskNotes(e.target.value)}
                  rows={4}
                  autoFocus
                  placeholder="Describe the snagging items…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30 focus:border-green-600 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveTaskNotes}
                    disabled={savingTask}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" /> {savingTask ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setTaskNotes(task?.notes ?? ''); setEditingTask(false) }}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {taskNotes || <span className="text-gray-400 italic">No description — tap Edit to add</span>}
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">Photos & videos</p>
              <span className="text-xs text-gray-400">{photos.length} uploaded</span>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photos.map((url, i) => {
                  const vid = isVideo(url)
                  return (
                    <div
                      key={i}
                      className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                      onClick={() => setLightboxUrl(url)}
                    >
                      {vid ? (
                        <>
                          <video src={url} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Play className="w-7 h-7 text-white drop-shadow" />
                          </div>
                        </>
                      ) : (
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={e => removePhoto(e, url)}
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
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />
            <button
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

          <Link
            href={`/jobs/${leadId}/snagging-sign-off`}
            className="flex items-center justify-center gap-2 w-full py-3 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            <ClipboardCheck className="w-4 h-4" /> Go to Sign Off
          </Link>
        </div>
      </div>
    </>
  )
}
