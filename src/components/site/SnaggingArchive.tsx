'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, ArrowLeft, CheckCircle2, Play, X } from 'lucide-react'

interface Props {
  name: string
  address: string
  signedOffAt: string
  taskNotes: string | null
  signOffNotes: string | null
  photos: string[]
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

export function SnaggingArchive({ name, address, signedOffAt, taskNotes, signOffNotes, photos }: Props) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const router = useRouter()

  const date = new Date(signedOffAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <>
      {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      <div className="min-h-screen bg-gray-50">
        <header className="bg-[var(--brand-header)] text-white px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/jobs?tab=snagging')} className="p-1 hover:opacity-70">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm">Snagging Archive</span>
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

          <div className="bg-green-50 rounded-xl border border-green-200 p-5 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800">Snagging signed off</p>
              <p className="text-xs text-green-600 mt-0.5">{date}</p>
              {signOffNotes && (
                <p className="text-sm text-green-700 mt-2 whitespace-pre-wrap">{signOffNotes}</p>
              )}
            </div>
          </div>

          {taskNotes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-800 mb-2">Snagging items</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{taskNotes}</p>
            </div>
          )}

          {photos.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-medium text-gray-700 mb-3">Photos & videos <span className="text-gray-400 font-normal">({photos.length})</span></p>
              <div className="grid grid-cols-3 gap-2">
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
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
