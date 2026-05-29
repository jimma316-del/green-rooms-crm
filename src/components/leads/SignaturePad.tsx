'use client'

import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react'

export interface SignaturePadHandle {
  isEmpty: () => boolean
  toDataURL: () => string
  clear: () => void
}

export const SignaturePad = forwardRef<SignaturePadHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const [hasStrokes, setHasStrokes] = useState(false)

  useImperativeHandle(ref, () => ({
    isEmpty: () => !hasStrokes,
    toDataURL: () => canvasRef.current?.toDataURL('image/png') ?? '',
    clear: () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHasStrokes(false)
    },
  }))

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr

    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    function getPos(e: MouseEvent | TouchEvent) {
      const rect = canvas.getBoundingClientRect()
      if ('touches' in e) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      }
      return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top }
    }

    function start(e: MouseEvent | TouchEvent) {
      e.preventDefault()
      drawing.current = true
      const pos = getPos(e)
      lastPos.current = pos
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }

    function move(e: MouseEvent | TouchEvent) {
      if (!drawing.current) return
      e.preventDefault()
      const pos = getPos(e)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
      lastPos.current = pos
      setHasStrokes(true)
    }

    function end() {
      drawing.current = false
      lastPos.current = null
    }

    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', move)
    canvas.addEventListener('mouseup', end)
    canvas.addEventListener('mouseleave', end)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove', move, { passive: false })
    canvas.addEventListener('touchend', end)

    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', move)
      canvas.removeEventListener('mouseup', end)
      canvas.removeEventListener('mouseleave', end)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', move)
      canvas.removeEventListener('touchend', end)
    }
  }, [])

  return (
    <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-white overflow-hidden" style={{ height: 160 }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair' }}
      />
      {!hasStrokes && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="text-sm text-gray-400">Sign here with your finger</span>
        </div>
      )}
    </div>
  )
})

SignaturePad.displayName = 'SignaturePad'
