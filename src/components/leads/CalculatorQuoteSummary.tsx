import { Calculator } from 'lucide-react'
import {
  CLADDING_LABELS, ROOF_OPTIONS, DOOR_OPTIONS, WINDOW_OPTIONS,
  CLIMATE_OPTIONS,
} from '@/types/assessment'

function extractCalcConfig(raw: Record<string, unknown>): Record<string, unknown> | null {
  const c = (raw?.calculator_data ?? raw) as Record<string, unknown>
  if (!c?.roofType && !c?.width) return null
  return c
}

function label(opts: { value: string; label: string }[], val: string | undefined) {
  return val ? (opts.find(o => o.value === val)?.label ?? val) : null
}

interface Props {
  calculatorData: Record<string, unknown> | null
  estimatedPrice: number | null
}

export function CalculatorQuoteSummary({ calculatorData, estimatedPrice }: Props) {
  if (!calculatorData) return null
  const c = extractCalcConfig(calculatorData)
  if (!c) return null

  const roofLabel   = label(ROOF_OPTIONS, c.roofType as string)
  const doorLabel   = label(DOOR_OPTIONS, c.door as string)
  const claddingLabel = CLADDING_LABELS[c.claddingMaterial as string] ?? c.claddingMaterial
  const climateLabel = label(CLIMATE_OPTIONS, c.climate as string)
  const wins = ((c.wins as string[] | undefined) ?? []).filter(w => w && w !== 'none')
  const windowLabels = wins.map(w => label(WINDOW_OPTIONS, w)).filter(Boolean)

  const features = [
    c.canopy      && 'Front canopy',
    c.side_canopy && 'Side canopy',
    c.storage     && 'Hidden storage',
    c.glass_corner&& 'Glass corner',
    c.skylight    && 'Skylight',
    c.hasDecking  && `Decking ${c.deckW ?? ''}×${c.deckD ?? ''}m`,
  ].filter(Boolean) as string[]

  const electricals = (c.electricals as string[] | undefined) ?? []

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 shrink-0 w-28">{label}</span>
      <span className="text-xs text-gray-800 font-medium text-right">{String(value)}</span>
    </div>
  )

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">Customer's online calculator quote</span>
        </div>
        {estimatedPrice && (
          <span className="text-sm font-bold text-amber-800">
            £{estimatedPrice.toLocaleString('en-GB')}
          </span>
        )}
      </div>

      <div className="bg-white rounded-lg px-3 pt-1 pb-0.5">
        {Boolean(c.width && c.depth) && (
          <Row label="Size" value={`${c.width as number}m × ${c.depth as number}m (${((c.width as number) * (c.depth as number)).toFixed(1)}m²)`} />
        )}
        {roofLabel   && <Row label="Roof" value={roofLabel} />}
        {claddingLabel && <Row label="Cladding" value={`${claddingLabel} · ${c.claddingWalls} wall(s)`} />}
        {doorLabel   && <Row label="Doors" value={doorLabel} />}
        {windowLabels.length > 0 && <Row label="Windows" value={windowLabels.join(', ')} />}
        {climateLabel && climateLabel !== 'None' && <Row label="Climate" value={climateLabel} />}
        {features.length > 0  && <Row label="Features" value={features.join(', ')} />}
        {electricals.length > 0 && <Row label="Electrics" value={electricals.join(', ')} />}
      </div>

      <p className="text-[10px] text-amber-600 mt-2">↓ Fields below have been pre-filled from this quote — adjust to what you find on site</p>
    </div>
  )
}
