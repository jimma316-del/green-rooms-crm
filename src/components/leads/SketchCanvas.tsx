'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Pencil, Eraser, Trash2, RotateCcw } from 'lucide-react'

interface Props {
  initialData: string | null
  onChange: (dataUrl: string | null) => void
}

type Tool = 'pen' | 'eraser'

export function SketchCanvas({ initialData, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool]       = useState<Tool>('pen')
  const [penSize, setPenSize] = useState(3)
  const drawing               = useRef(false)
  const history               = useRef<ImageData[]>([])
  const [hasContent, setHasContent] = useState(!!initialData)

  // Load initial sketch
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (initialData) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0)
      img.src = initialData
    }
  }, [initialData])

  function saveHistory() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height)
    history.current = [...history.current.slice(-19), snap]
  }

  function undo() {
    const canvas = canvasRef.current
    if (!canvas || !history.current.length) return
    const ctx = canvas.getContext('2d')!
    const prev = history.current[history.current.length - 1]
    history.current = history.current.slice(0, -1)
    ctx.putImageData(prev, 0, 0)
    emit()
  }

  function clear() {
    const canvas = canvasRef.current
    if (!canvas) return
    saveHistory()
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasContent(false)
    onChange(null)
  }

  function emit() {
    const canvas = canvasRef.current
    if (!canvas) return
    onChange(canvas.toDataURL('image/png'))
    setHasContent(true)
  }

  // Convert pointer position to canvas coords
  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const canvas = canvasRef.current!
    canvas.setPointerCapture(e.pointerId)
    saveHistory()
    drawing.current = true
    const ctx = canvas.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = penSize * 6
    } else {
      ctx.globalCompositeOperation = 'source-over'
      // pressure from Apple Pencil (0.1–1.0), falls back to 0.5
      const pressure = e.pressure > 0 ? e.pressure : 0.5
      ctx.lineWidth = penSize * pressure * 2
      ctx.strokeStyle = '#1a1a1a'
    }
    ctx.lineCap  = 'round'
    ctx.lineJoin = 'round'
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const { x, y } = getPos(e)
    const pressure = e.pressure > 0 ? e.pressure : 0.5

    if (tool === 'pen') {
      ctx.lineWidth = penSize * pressure * 2
    }
    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    drawing.current = false
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.globalCompositeOperation = 'source-over'
    // Fill eraser holes so PNG doesn't go transparent
    if (tool === 'eraser') {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#ffffff'
      ctx.globalCompositeOperation = 'destination-over'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'source-over'
    }
    emit()
  }

  const SIZE_OPTIONS = [2, 4, 7, 12]

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => setTool('pen')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tool === 'pen' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Pencil className="w-3.5 h-3.5" /> Pen
          </button>
          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tool === 'eraser' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Eraser className="w-3.5 h-3.5" /> Eraser
          </button>
        </div>

        <div className="flex gap-1.5 items-center">
          {SIZE_OPTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setPenSize(s)}
              className={`rounded-full transition-all flex items-center justify-center ${penSize === s ? 'ring-2 ring-[var(--primary)]' : ''}`}
              style={{ width: s * 4 + 8, height: s * 4 + 8 }}
            >
              <div
                className="rounded-full bg-gray-700"
                style={{ width: s * 2, height: s * 2 }}
              />
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={!history.current.length}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 disabled:opacity-30"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Undo
          </button>
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-gray-200 bg-white touch-none">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full"
          style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair', touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-sm text-gray-300 font-medium">Draw the floor plan</p>
              <p className="text-xs text-gray-300 mt-1">Mark window & door positions, dimensions, orientation</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-400">Supports Apple Pencil — pressure sensitive. Draw roughly to scale; label key measurements.</p>
    </div>
  )
}
