// Lightweight CSS/SVG charts - no chart library, fast on cheap phones.
import { inr } from '../lib/format'

/** Grouped vertical bars: income vs expense per month */
export function PairBars({ labels, a, b, aLabel, bLabel }: {
  labels: string[]; a: number[]; b: number[]; aLabel: string; bLabel: string
}) {
  const max = Math.max(1, ...a, ...b)
  return (
    <div>
      <div className="flex items-end gap-3 h-40">
        {labels.map((l, i) => (
          <div key={l} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <div className="flex items-end gap-1 h-32 w-full justify-center">
              <div className="w-4 sm:w-6 rounded-t-md bg-navy-700 transition-all duration-500" style={{ height: `${(a[i] / max) * 100}%` }} title={`${aLabel}: ${inr(a[i])}`} />
              <div className="w-4 sm:w-6 rounded-t-md bg-saffron-400 transition-all duration-500" style={{ height: `${(b[i] / max) * 100}%` }} title={`${bLabel}: ${inr(b[i])}`} />
            </div>
            <div className="text-[11.5px] text-navy-400 truncate max-w-full">{l}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-[12.5px] text-navy-500">
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-navy-700 inline-block" />{aLabel}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-saffron-400 inline-block" />{bLabel}</span>
      </div>
    </div>
  )
}

/** Horizontal bars with labels + amounts (category-wise, vendor-wise) */
export function HBars({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map(i => i.value))
  if (items.length === 0) return <div className="text-[13.5px] text-navy-400 py-3">હજુ કોઈ ડેટા નથી.</div>
  return (
    <div className="space-y-2.5">
      {items.map(it => (
        <div key={it.label}>
          <div className="flex justify-between text-[13.5px] mb-1">
            <span className="text-navy-700 font-medium truncate pr-2">{it.label}</span>
            <span className="num text-navy-500 shrink-0">{inr(it.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
            <div className="h-full rounded-full bg-navy-600" style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
