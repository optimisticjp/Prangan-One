/**
 * UI kit. Design system:
 * 60% warm cream surfaces, 30% deep navy, 10% saffron accent.
 * Big tap targets (44px+), rounded-2xl cards, soft shadows, fade-up entrances.
 * Semantic: green = paid/done, amber = pending, red = overdue/urgent.
 */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactElement, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cloneElement, isValidElement, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { useDialogA11y } from '../lib/useDialogA11y'

/* ---------------- Button ---------------- */
type BtnVariant = 'primary' | 'accent' | 'soft' | 'ghost' | 'danger'
export function Button({
  variant = 'primary', full, className = '', children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; full?: boolean }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-4 min-h-[44px] text-[15px] transition-all duration-150 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none'
  const styles: Record<BtnVariant, string> = {
    primary: 'bg-navy-800 text-cream-50 hover:bg-navy-700 shadow-soft',
    accent: 'bg-saffron-500 text-navy-900 hover:bg-saffron-400 shadow-soft',
    soft: 'bg-navy-50 text-navy-800 hover:bg-navy-100 border border-navy-100',
    ghost: 'bg-transparent text-navy-600 hover:bg-navy-50',
    danger: 'bg-red-50 text-over hover:bg-red-100 border border-red-100',
  }
  return (
    <button className={`${base} ${styles[variant]} ${full ? 'w-full' : ''} ${className}`} {...rest}>
      {children}
    </button>
  )
}

/* ---------------- Card / bento ---------------- */
export function Card({ children, className = '', pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <div className={`card ${pad ? 'p-4 sm:p-5' : ''} ${className}`}>{children}</div>
}

export function StatCard({ label, value, sub, tone = 'navy', icon }: {
  label: string; value: string; sub?: string
  tone?: 'navy' | 'green' | 'amber' | 'red' | 'saffron'; icon?: ReactNode
}) {
  const tones = {
    navy: 'text-navy-800', green: 'text-paid', amber: 'text-pend', red: 'text-over', saffron: 'text-saffron-600',
  }
  return (
    <Card className="animate-fadeUp">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[13px] text-navy-400 font-medium">{label}</div>
          <div className={`num text-2xl sm:text-[28px] font-bold mt-1 ${tones[tone]}`}>{value}</div>
          {sub && <div className="text-[12.5px] text-navy-400 mt-1">{sub}</div>}
        </div>
        {icon && <div className="shrink-0 h-10 w-10 rounded-xl bg-cream-100 border border-cream-200 flex items-center justify-center text-navy-600">{icon}</div>}
      </div>
    </Card>
  )
}

/* ---------------- Badge ---------------- */
export type Tone = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'saffron'
export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  const map: Record<Tone, string> = {
    green: 'bg-green-50 text-paid border-green-200',
    amber: 'bg-amber-50 text-pend border-amber-200',
    red: 'bg-red-50 text-over border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-cream-100 text-navy-400 border-cream-300',
    saffron: 'bg-saffron-50 text-saffron-700 border-saffron-100',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12.5px] font-semibold whitespace-nowrap ${map[tone]}`}>
      {children}
    </span>
  )
}

/* ---------------- Form controls ---------------- */
type FieldProps = {
  label: string
  children: ReactNode
  hint?: string
  error?: string
  id?: string
  htmlFor?: string
  hintId?: string
  errorId?: string
}

const describableControls = new Set(['input', 'select', 'textarea'])
const joinIds = (...ids: (string | undefined)[]) => Array.from(new Set(ids.flatMap(id => id?.split(/\s+/).filter(Boolean) ?? []))).join(' ') || undefined

export function Field({ label, children, hint, error, id, htmlFor, hintId, errorId }: FieldProps) {
  const generated = useId()
  const canConnectControl = isValidElement(children) && (typeof children.type === 'function' || (typeof children.type === 'string' && describableControls.has(children.type)))
  const child = canConnectControl ? children as ReactElement<Record<string, unknown>> : null
  const childId = typeof child?.props.id === 'string' ? child.props.id : undefined
  const controlId = childId ?? id ?? htmlFor ?? `field-${generated}`
  const resolvedHintId = hint ? (hintId ?? `${controlId}-hint`) : undefined
  const resolvedErrorId = error ? (errorId ?? `${controlId}-error`) : undefined
  const describedBy = joinIds(typeof child?.props['aria-describedby'] === 'string' ? child.props['aria-describedby'] : undefined, resolvedHintId, resolvedErrorId)
  const control = child
    ? cloneElement(child, {
        id: controlId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : child.props['aria-invalid'],
      })
    : children

  return (
    <div className="block">
      <label htmlFor={canConnectControl ? controlId : undefined} className="block text-[13.5px] font-semibold text-navy-600 mb-1">{label}</label>
      {control}
      {hint && <p id={resolvedHintId} className="block text-[12px] text-navy-400 mt-1">{hint}</p>}
      {error && <p id={resolvedErrorId} className="block text-[12.5px] text-over mt-1">{error}</p>}
    </div>
  )
}
const ctrl = 'w-full rounded-xl border border-cream-300 bg-white px-3.5 min-h-[46px] text-[15.5px] text-navy-800 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-saffron-400/60 focus:border-saffron-400'
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${ctrl} ${props.className ?? ''}`} />
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${ctrl} ${props.className ?? ''}`} />
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${ctrl} py-3 min-h-[96px] ${props.className ?? ''}`} />
}

/* ---------------- Modal ---------------- */
export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean
}) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialogA11y(open, onClose, dialogRef)

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-navy-950/45" onClick={onClose} />
      <div ref={dialogRef} className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} bg-cream-50 rounded-t-3xl sm:rounded-2xl shadow-lift animate-fadeUp max-h-[92vh] overflow-y-auto`}>
        <div className="sticky top-0 glass rounded-t-3xl sm:rounded-t-2xl px-5 py-4 flex items-center justify-between">
          <h3 id={titleId} className="font-bold text-[17px] text-navy-800">{title}</h3>
          <button onClick={onClose} aria-label="બંધ કરો" className="h-9 w-9 rounded-full hover:bg-navy-50 flex items-center justify-center text-navy-500">
            <X size={19} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">{children}</div>
      </div>
    </div>
  )
}

/* ---------------- Empty / headers ---------------- */
export function EmptyState({ icon, title, sub }: { icon?: ReactNode; title: string; sub?: string }) {
  return (
    <div className="text-center py-10 px-4">
      {icon && <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-cream-100 border border-cream-200 flex items-center justify-center text-navy-300">{icon}</div>}
      <div className="font-semibold text-navy-600">{title}</div>
      {sub && <div className="text-[13.5px] text-navy-400 mt-1">{sub}</div>}
    </div>
  )
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4 animate-fadeUp">
      <div>
        <h1 className="text-[22px] sm:text-2xl font-bold text-navy-900">{title}</h1>
        {sub && <p className="text-[13.5px] text-navy-400 mt-0.5">{sub}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mt-6 mb-2.5">
      <h2 className="font-bold text-[16px] text-navy-800">{children}</h2>
      {action}
    </div>
  )
}

/* ---------------- Progress bar ---------------- */
export function Progress({ value, label, tone = 'saffron' }: { value: number; label: string; tone?: 'saffron' | 'green' | 'navy' }) {
  const colors = { saffron: 'bg-saffron-500', green: 'bg-paid', navy: 'bg-navy-600' }
  const normalized = Number.isFinite(value) ? value : 0
  const clamped = Math.min(100, Math.max(0, normalized))
  return (
    <div className="h-2.5 w-full rounded-full bg-cream-200 overflow-hidden" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={clamped}>
      <div className={`h-full rounded-full ${colors[tone]} transition-all duration-500`} style={{ width: `${clamped}%` }} />
    </div>
  )
}

/* ---------------- Simple table wrapper ---------------- */
export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-[14.5px] min-w-[560px]">{children}</table>
    </div>
  )
}
export const th = 'text-left font-semibold text-navy-400 text-[12.5px] uppercase tracking-wide px-4 py-3 border-b border-cream-200 whitespace-nowrap'
export const td = 'px-4 py-3 border-b border-cream-100 text-navy-700 align-middle'
