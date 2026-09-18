'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Save, RotateCcw, Download } from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────
interface WindowSpec {
  id: string
  x_pct: number   // centre position as % of wall width
  y_pct: number   // centre position as % of wall height (from bottom)
  width_pct: number
  height_pct: number
  panes: number   // 1 or 2
}

interface DoorSpec {
  id: string
  x_pct: number   // centre position as % of wall width
  width_pct: number
  type: 'single' | 'double' | 'bifold'
}

interface ElevationConfig {
  face: 'front' | 'rear' | 'left' | 'right'
  building_width_mm: number
  building_height_mm: number
  roof_type: 'flat' | 'pitched' | 'mono'
  roof_pitch_deg: number
  eave_height_pct: number  // how high walls are before roof starts (as % of total height)
  cladding: 'vertical' | 'horizontal' | 'none'
  windows: WindowSpec[]
  doors: DoorSpec[]
  caption: string
}

interface Asset {
  id: string
  elevation_face: string | null
  svg_data: string | null
  caption: string | null
  width_mm: number | null
  height_mm: number | null
  include_in_pdf: boolean
}

interface Props {
  quoteId: string
  versionId: string
  initialAssets: Asset[]
}

// ─── SVG Generator ────────────────────────────────────────────────────────────
const CANVAS_W = 600
const CANVAS_H = 320
const MARGIN = 48
const DRAW_W = CANVAS_W - MARGIN * 2
const DRAW_H = CANVAS_H - MARGIN * 2
const GREEN = '#34a02e'
const DARK = '#1a2328'
const MID = '#2d3841'
const LIGHT_CLADDING = '#e8ded0'
const DIM_COLOR = '#666'
const FONT = 'Inter, -apple-system, sans-serif'

function generateSVG(cfg: ElevationConfig): string {
  const { building_width_mm, building_height_mm, roof_type, roof_pitch_deg, eave_height_pct } = cfg

  const scaleX = DRAW_W / building_width_mm
  const scaleY = DRAW_H / building_height_mm

  const originX = MARGIN
  const originY = MARGIN

  const wallW = DRAW_W
  const wallH = DRAW_H * eave_height_pct

  // Roof vertices
  let roofPaths: string[] = []
  if (roof_type === 'flat') {
    roofPaths = [
      `M ${originX} ${originY + (DRAW_H - wallH)}
       L ${originX + wallW} ${originY + (DRAW_H - wallH)}
       L ${originX + wallW} ${originY + DRAW_H}
       L ${originX} ${originY + DRAW_H} Z`
    ]
  } else if (roof_type === 'pitched') {
    const ridgeX = originX + wallW / 2
    const ridgeY = originY + (DRAW_H - wallH) - (wallW / 2) * Math.tan(roof_pitch_deg * Math.PI / 180) * scaleY / scaleX
    roofPaths = [
      `M ${originX} ${originY + (DRAW_H - wallH)}
       L ${ridgeX} ${ridgeY}
       L ${originX + wallW} ${originY + (DRAW_H - wallH)} Z`
    ]
  } else { // mono
    const ridgeY = originY + (DRAW_H - wallH) - wallW * Math.tan(roof_pitch_deg * Math.PI / 180) * scaleY / scaleX
    roofPaths = [
      `M ${originX} ${originY + (DRAW_H - wallH)}
       L ${originX} ${ridgeY}
       L ${originX + wallW} ${originY + (DRAW_H - wallH)} Z`
    ]
  }

  // Cladding lines
  const claddingLines: string[] = []
  if (cfg.cladding !== 'none') {
    const wallTop = originY + (DRAW_H - wallH)
    const wallBottom = originY + DRAW_H
    if (cfg.cladding === 'vertical') {
      const spacing = 20 // px
      for (let x = originX + spacing; x < originX + wallW; x += spacing) {
        claddingLines.push(`<line x1="${x}" y1="${wallTop}" x2="${x}" y2="${wallBottom}" stroke="${LIGHT_CLADDING}" stroke-width="1"/>`)
      }
    } else {
      const spacing = 14 // px
      for (let y = wallTop + spacing; y < wallBottom; y += spacing) {
        claddingLines.push(`<line x1="${originX}" y1="${y}" x2="${originX + wallW}" y2="${y}" stroke="${LIGHT_CLADDING}" stroke-width="1"/>`)
      }
    }
  }

  // Windows
  const wallTop = originY + (DRAW_H - wallH)
  const wallBottom = originY + DRAW_H

  const windowSvgs = cfg.windows.map(w => {
    const cx = originX + (w.x_pct / 100) * wallW
    const cy = wallBottom - (w.y_pct / 100) * wallH
    const ww = (w.width_pct / 100) * wallW
    const wh = (w.height_pct / 100) * wallH
    const x = cx - ww / 2
    const y = cy - wh / 2

    const paneLines = w.panes === 2
      ? `<line x1="${x + ww / 2}" y1="${y + 3}" x2="${x + ww / 2}" y2="${y + wh - 3}" stroke="#aaa" stroke-width="2"/>`
      : ''
    const crossbar = `<line x1="${x + 3}" y1="${y + wh / 2}" x2="${x + ww - 3}" y2="${y + wh / 2}" stroke="#aaa" stroke-width="1.5"/>`

    return `
      <rect x="${x}" y="${y}" width="${ww}" height="${wh}" fill="#d4e8f5" stroke="${MID}" stroke-width="2"/>
      ${paneLines}
      ${crossbar}
    `
  }).join('')

  // Doors
  const doorSvgs = cfg.doors.map(d => {
    const cx = originX + (d.x_pct / 100) * wallW
    const dw = (d.width_pct / 100) * wallW
    const dh = wallH * 0.7
    const x = cx - dw / 2
    const y = wallBottom - dh

    let inner = ''
    if (d.type === 'bifold') {
      // 3 fold lines
      inner = [1, 2, 3].map(i => `<line x1="${x + (i * dw / 4)}" y1="${y + 4}" x2="${x + (i * dw / 4)}" y2="${y + dh - 4}" stroke="#999" stroke-width="1.5" stroke-dasharray="4 3"/>`).join('')
    } else if (d.type === 'double') {
      inner = `<line x1="${x + dw / 2}" y1="${y + 4}" x2="${x + dw / 2}" y2="${y + dh - 4}" stroke="${MID}" stroke-width="2"/>
               <circle cx="${x + dw / 2 - 6}" cy="${y + dh / 2}" r="2.5" fill="${MID}"/>
               <circle cx="${x + dw / 2 + 6}" cy="${y + dh / 2}" r="2.5" fill="${MID}"/>`
    } else {
      inner = `<circle cx="${x + dw - 8}" cy="${y + dh / 2}" r="2.5" fill="${MID}"/>`
    }

    return `
      <rect x="${x}" y="${y}" width="${dw}" height="${dh}" fill="#f0f0ee" stroke="${MID}" stroke-width="2"/>
      ${inner}
    `
  }).join('')

  // Dimension annotations
  const widthM = (building_width_mm / 1000).toFixed(2)
  const heightM = (building_height_mm / 1000).toFixed(2)
  const dimY = originY + DRAW_H + 14
  const dimX = MARGIN - 16

  const dims = `
    <!-- width dimension -->
    <line x1="${originX}" y1="${dimY - 2}" x2="${originX + wallW}" y2="${dimY - 2}" stroke="${DIM_COLOR}" stroke-width="1" marker-start="url(#arrowstart)" marker-end="url(#arrowend)"/>
    <text x="${originX + wallW / 2}" y="${dimY + 12}" text-anchor="middle" font-family="${FONT}" font-size="11" fill="${DIM_COLOR}">${widthM}m</text>
    <!-- height dimension -->
    <line x1="${dimX + 2}" y1="${wallTop}" x2="${dimX + 2}" y2="${wallBottom}" stroke="${DIM_COLOR}" stroke-width="1" marker-start="url(#arrowstart)" marker-end="url(#arrowend)"/>
    <text x="${dimX - 2}" y="${wallTop + wallH / 2 + 4}" text-anchor="middle" font-family="${FONT}" font-size="11" fill="${DIM_COLOR}" transform="rotate(-90,${dimX - 2},${wallTop + wallH / 2 + 4})">${heightM}m</text>
  `

  // Face label
  const faceLabel = cfg.face.charAt(0).toUpperCase() + cfg.face.slice(1) + ' Elevation'

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_W} ${CANVAS_H + 30}" width="${CANVAS_W}" height="${CANVAS_H + 30}" style="background:#fff;">
  <defs>
    <marker id="arrowstart" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto">
      <path d="M6,0 L0,3 L6,6 Z" fill="${DIM_COLOR}"/>
    </marker>
    <marker id="arrowend" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="${DIM_COLOR}"/>
    </marker>
  </defs>

  <!-- Building wall fill -->
  <rect x="${originX}" y="${wallTop}" width="${wallW}" height="${wallH}" fill="#f5f0e8" stroke="none"/>

  <!-- Cladding texture -->
  ${claddingLines.join('\n  ')}

  <!-- Roof -->
  ${roofPaths.map(p => `<path d="${p}" fill="${DARK}" stroke="${DARK}" stroke-width="1.5"/>`).join('\n  ')}

  <!-- Wall outline -->
  <rect x="${originX}" y="${wallTop}" width="${wallW}" height="${wallH}" fill="none" stroke="${DARK}" stroke-width="2"/>

  <!-- Windows -->
  ${windowSvgs}

  <!-- Doors -->
  ${doorSvgs}

  <!-- Dimensions -->
  ${dims}

  <!-- Caption -->
  <text x="${CANVAS_W / 2}" y="${CANVAS_H + 20}" text-anchor="middle" font-family="${FONT}" font-size="12" font-weight="600" fill="${DARK}" letter-spacing="1.5" text-transform="uppercase">${faceLabel.toUpperCase()}</text>
  ${cfg.caption ? `<text x="${CANVAS_W / 2}" y="${CANVAS_H + 38}" text-anchor="middle" font-family="${FONT}" font-size="10" fill="#888">${cfg.caption}</text>` : ''}
</svg>`
}

// ─── Default config ───────────────────────────────────────────────────────────
function defaultConfig(face: ElevationConfig['face']): ElevationConfig {
  return {
    face,
    building_width_mm: 5000,
    building_height_mm: 2750,
    roof_type: 'flat',
    roof_pitch_deg: 5,
    eave_height_pct: 0.82,
    cladding: 'vertical',
    windows: [
      { id: crypto.randomUUID(), x_pct: 35, y_pct: 50, width_pct: 18, height_pct: 30, panes: 2 },
      { id: crypto.randomUUID(), x_pct: 65, y_pct: 50, width_pct: 18, height_pct: 30, panes: 2 },
    ],
    doors: face === 'front' ? [
      { id: crypto.randomUUID(), x_pct: 50, width_pct: 22, type: 'bifold' },
    ] : [],
    caption: '',
  }
}

// ─── Single Elevation Editor ──────────────────────────────────────────────────
function ElevationEditor({ config: initialConfig, onSave, onDelete, existingId, quoteId, versionId }: {
  config: ElevationConfig
  onSave: (asset: Asset) => void
  onDelete?: () => void
  existingId?: string
  quoteId: string
  versionId: string
}) {
  const [cfg, setCfg] = useState<ElevationConfig>(initialConfig)
  const [saving, setSaving] = useState(false)

  const svgStr = generateSVG(cfg)

  function updateCfg(partial: Partial<ElevationConfig>) {
    setCfg(c => ({ ...c, ...partial }))
  }

  function addWindow() {
    updateCfg({
      windows: [...cfg.windows, {
        id: crypto.randomUUID(),
        x_pct: 25 + cfg.windows.length * 20,
        y_pct: 50,
        width_pct: 15,
        height_pct: 28,
        panes: 1,
      }]
    })
  }

  function addDoor() {
    updateCfg({
      doors: [...cfg.doors, {
        id: crypto.randomUUID(),
        x_pct: 50,
        width_pct: 20,
        type: 'single',
      }]
    })
  }

  async function save() {
    setSaving(true)
    try {
      const svgData = generateSVG(cfg)
      const url = existingId
        ? `/api/quotes/${quoteId}/versions/${versionId}/assets/${existingId}`
        : `/api/quotes/${quoteId}/versions/${versionId}/assets`
      const method = existingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_type: 'elevation_svg',
          elevation_face: cfg.face,
          svg_data: svgData,
          caption: cfg.caption || cfg.face + ' elevation',
          width_mm: cfg.building_width_mm,
          height_mm: cfg.building_height_mm,
        }),
      })
      if (!res.ok) throw new Error()
      const { asset } = await res.json()
      onSave(asset)
      toast.success('Elevation diagram saved')
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  function downloadSVG() {
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${cfg.face}-elevation.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* SVG Preview */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div dangerouslySetInnerHTML={{ __html: svgStr }} className="w-full" style={{ maxWidth: '100%' }} />
      </div>

      {/* Building dimensions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Width (mm)</label>
          <input type="number" value={cfg.building_width_mm}
            onChange={e => updateCfg({ building_width_mm: parseInt(e.target.value) || 5000 })}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-[var(--primary)]" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Height (mm)</label>
          <input type="number" value={cfg.building_height_mm}
            onChange={e => updateCfg({ building_height_mm: parseInt(e.target.value) || 2750 })}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-[var(--primary)]" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Roof type</label>
          <select value={cfg.roof_type} onChange={e => updateCfg({ roof_type: e.target.value as ElevationConfig['roof_type'] })}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-[var(--primary)]">
            <option value="flat">Flat</option>
            <option value="pitched">Pitched (A-frame)</option>
            <option value="mono">Mono-pitch</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Cladding</label>
          <select value={cfg.cladding} onChange={e => updateCfg({ cladding: e.target.value as ElevationConfig['cladding'] })}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-[var(--primary)]">
            <option value="vertical">Vertical boards</option>
            <option value="horizontal">Horizontal boards</option>
            <option value="none">Plain</option>
          </select>
        </div>
      </div>

      {cfg.roof_type !== 'flat' && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-500 shrink-0">Pitch (degrees)</label>
          <input type="range" min="3" max="45" value={cfg.roof_pitch_deg}
            onChange={e => updateCfg({ roof_pitch_deg: parseInt(e.target.value) })}
            className="flex-1" />
          <span className="text-xs text-gray-600 shrink-0 w-8">{cfg.roof_pitch_deg}°</span>
        </div>
      )}

      {/* Windows */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-700">Windows</span>
          <button onClick={addWindow} className="text-xs text-[var(--primary)] flex items-center gap-1 hover:opacity-70">
            <Plus size={12} /> Add window
          </button>
        </div>
        <div className="space-y-2">
          {cfg.windows.map((w, i) => (
            <div key={w.id} className="flex items-center gap-2 flex-wrap bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-xs text-gray-500 shrink-0 w-16">Win {i + 1}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">X</span>
                <input type="range" min="5" max="95" value={w.x_pct}
                  onChange={e => updateCfg({ windows: cfg.windows.map((x, j) => j === i ? { ...x, x_pct: parseInt(e.target.value) } : x) })}
                  className="w-20" />
                <span className="text-xs text-gray-500 w-8">{w.x_pct}%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">W</span>
                <input type="range" min="5" max="40" value={w.width_pct}
                  onChange={e => updateCfg({ windows: cfg.windows.map((x, j) => j === i ? { ...x, width_pct: parseInt(e.target.value) } : x) })}
                  className="w-20" />
                <span className="text-xs text-gray-500 w-8">{w.width_pct}%</span>
              </div>
              <select value={w.panes}
                onChange={e => updateCfg({ windows: cfg.windows.map((x, j) => j === i ? { ...x, panes: parseInt(e.target.value) } : x) })}
                className="text-xs border border-gray-200 rounded px-1 py-0.5">
                <option value={1}>1 pane</option>
                <option value={2}>2 panes</option>
              </select>
              <button onClick={() => updateCfg({ windows: cfg.windows.filter((_, j) => j !== i) })}
                className="text-gray-300 hover:text-red-500 ml-auto">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Doors */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-700">Doors</span>
          <button onClick={addDoor} className="text-xs text-[var(--primary)] flex items-center gap-1 hover:opacity-70">
            <Plus size={12} /> Add door
          </button>
        </div>
        <div className="space-y-2">
          {cfg.doors.map((d, i) => (
            <div key={d.id} className="flex items-center gap-2 flex-wrap bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-xs text-gray-500 shrink-0 w-16">Door {i + 1}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">X</span>
                <input type="range" min="10" max="90" value={d.x_pct}
                  onChange={e => updateCfg({ doors: cfg.doors.map((x, j) => j === i ? { ...x, x_pct: parseInt(e.target.value) } : x) })}
                  className="w-20" />
                <span className="text-xs text-gray-500 w-8">{d.x_pct}%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">W</span>
                <input type="range" min="10" max="40" value={d.width_pct}
                  onChange={e => updateCfg({ doors: cfg.doors.map((x, j) => j === i ? { ...x, width_pct: parseInt(e.target.value) } : x) })}
                  className="w-20" />
                <span className="text-xs text-gray-500 w-8">{d.width_pct}%</span>
              </div>
              <select value={d.type}
                onChange={e => updateCfg({ doors: cfg.doors.map((x, j) => j === i ? { ...x, type: e.target.value as DoorSpec['type'] } : x) })}
                className="text-xs border border-gray-200 rounded px-1 py-0.5">
                <option value="single">Single</option>
                <option value="double">Double</option>
                <option value="bifold">Bi-fold</option>
              </select>
              <button onClick={() => updateCfg({ doors: cfg.doors.filter((_, j) => j !== i) })}
                className="text-gray-300 hover:text-red-500 ml-auto">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Caption */}
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Caption</label>
        <input value={cfg.caption} onChange={e => updateCfg({ caption: e.target.value })}
          placeholder="e.g. Front elevation — looking north"
          className="w-full text-sm border border-gray-200 rounded px-3 py-1.5 outline-none focus:border-[var(--primary)]" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-[var(--primary)] hover:opacity-90 px-4 py-2 rounded-lg disabled:opacity-50">
          <Save size={13} /> {saving ? 'Saving…' : 'Save diagram'}
        </button>
        <button onClick={downloadSVG}
          className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg">
          <Download size={13} /> Export SVG
        </button>
        {onDelete && (
          <button onClick={onDelete}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 ml-auto">
            <Trash2 size={13} /> Delete
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ElevationDiagramBuilder({ quoteId, versionId, initialAssets }: Props) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets)
  const [activeFace, setActiveFace] = useState<ElevationConfig['face']>('front')
  const [newDiagram, setNewDiagram] = useState(false)

  const FACES: ElevationConfig['face'][] = ['front', 'rear', 'left', 'right']

  const existingByFace: Partial<Record<string, Asset>> = {}
  for (const a of assets) {
    if (a.elevation_face) existingByFace[a.elevation_face] = a
  }

  const currentAsset = existingByFace[activeFace]

  function getInitialConfig(face: ElevationConfig['face']): ElevationConfig {
    if (currentAsset?.svg_data) {
      // Re-use dimensions from saved asset
      return {
        ...defaultConfig(face),
        building_width_mm: currentAsset.width_mm ?? 5000,
        building_height_mm: currentAsset.height_mm ?? 2750,
      }
    }
    return defaultConfig(face)
  }

  async function deleteAsset(assetId: string) {
    if (!confirm('Delete this elevation diagram?')) return
    try {
      await fetch(`/api/quotes/${quoteId}/versions/${versionId}/assets/${assetId}`, { method: 'DELETE' })
      setAssets(as => as.filter(a => a.id !== assetId))
      toast.success('Diagram deleted')
    } catch {
      toast.error('Delete failed')
    }
  }

  return (
    <div className="space-y-4">
      {/* Face selector */}
      <div className="flex gap-2">
        {FACES.map(face => {
          const has = !!existingByFace[face]
          return (
            <button
              key={face}
              onClick={() => setActiveFace(face)}
              className={`flex-1 text-sm py-2 rounded-lg border transition-colors capitalize ${
                activeFace === face
                  ? 'border-[var(--primary)] bg-green-50 text-[var(--primary)] font-medium'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {face}
              {has && <span className="ml-1 text-[10px] text-green-600">✓</span>}
            </button>
          )
        })}
      </div>

      {currentAsset ? (
        <div className="space-y-3">
          {/* Show saved SVG */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div dangerouslySetInnerHTML={{ __html: currentAsset.svg_data ?? '' }} className="w-full" />
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button
              onClick={() => setNewDiagram(true)}
              className="flex items-center gap-1.5 text-sm text-[var(--primary)] border border-[var(--primary)] hover:bg-green-50 px-3 py-2 rounded-lg"
            >
              <RotateCcw size={13} /> Edit / regenerate
            </button>
            {/* Include in PDF toggle */}
            <label className="flex items-center gap-2 ml-2 cursor-pointer select-none">
              <span className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={currentAsset.include_in_pdf !== false}
                  onChange={async e => {
                    const val = e.target.checked
                    try {
                      await fetch(`/api/quotes/${quoteId}/versions/${versionId}/assets/${currentAsset.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ include_in_pdf: val }),
                      })
                      setAssets(as => as.map(a => a.id === currentAsset.id ? { ...a, include_in_pdf: val } : a))
                    } catch { toast.error('Update failed') }
                  }}
                />
                <span className="w-8 h-4 bg-gray-200 rounded-full peer-checked:bg-[var(--primary)] transition-colors" />
                <span className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
              </span>
              <span className="text-xs text-gray-500">Include in PDF</span>
            </label>
            <button
              onClick={() => deleteAsset(currentAsset.id)}
              className="flex items-center gap-1.5 text-sm text-red-500 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-lg ml-auto"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>

          {newDiagram && (
            <div className="border-t border-gray-100 pt-4">
              <ElevationEditor
                config={getInitialConfig(activeFace)}
                existingId={currentAsset.id}
                quoteId={quoteId}
                versionId={versionId}
                onSave={asset => {
                  setAssets(as => as.map(a => a.id === asset.id ? asset : a))
                  setNewDiagram(false)
                }}
                onDelete={() => {
                  deleteAsset(currentAsset.id)
                  setNewDiagram(false)
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <ElevationEditor
          config={defaultConfig(activeFace)}
          quoteId={quoteId}
          versionId={versionId}
          onSave={asset => setAssets(as => [...as, asset])}
        />
      )}
    </div>
  )
}
