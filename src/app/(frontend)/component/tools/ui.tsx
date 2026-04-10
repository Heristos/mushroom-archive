'use client'

/* ─────────────────────────────────────────────────────────────────────
   component/tools/ui.tsx
   Primitives UI réutilisables pour les outils (Icon Generator, etc.)
───────────────────────────────────────────────────────────────────── */

/* ── PixelBtn : bouton style pixel art ── */
export function PixelBtn({
  children, onClick, active = false, color, title, className = '', style = {},
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  color?: 'main' | 'purple' | 'blue' | 'gray' | 'red' | 'dark'
  title?: string
  className?: string
  style?: React.CSSProperties
}) {
  const colors: Record<string, { bg: string; shadow: string; text: string }> = {
    main:   { bg: 'var(--color-main)', shadow: 'inset 2px 2px 0 var(--light-main), inset -2px -2px 0 var(--dark-main)', text: '#fff' },
    purple: { bg: '#7c3aed',           shadow: 'inset 1px 1px 0 #a78bfa, inset -1px -1px 0 #4c1d95',                    text: '#fff' },
    blue:   { bg: '#0369a1',           shadow: 'inset 1px 1px 0 #38bdf8, inset -1px -1px 0 #0c4a6e',                    text: '#fff' },
    gray:   { bg: '#4b5563',           shadow: 'inset 2px 2px 0 #6b7280, inset -2px -2px 0 #1f2937',                    text: '#e5e7eb' },
    red:    { bg: '#7f1d1d',           shadow: 'inset 1px 1px 0 #ef4444, inset -1px -1px 0 #450a0a',                    text: '#fca5a5' },
    dark:   { bg: '#374151',           shadow: 'inset 2px 2px 0 #4b5563, inset -2px -2px 0 #1f2937',                    text: '#9ca3af' },
  }

  const inactiveStyle = { bg: '#374151', shadow: 'inset 1px 1px 0 #4b5563, inset -1px -1px 0 #1f2937', text: '#6b7280' }
  const c = active && color ? colors[color] ?? inactiveStyle : (active ? colors.main : inactiveStyle)

  return (
    <button
      onClick={onClick}
      title={title}
      className={className}
      style={{ background: c.bg, boxShadow: c.shadow, color: c.text, ...style }}
    >
      {children}
    </button>
  )
}

/* ── WrapBtn : bouton wrap (rep / mir / clamp) ── */
export function WrapBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-[11px] font-mono px-2 py-1 leading-tight flex-1"
      style={{
        background: active ? 'var(--color-main)' : '#374151',
        color: active ? '#fff' : '#6b7280',
        boxShadow: active
          ? 'inset 1px 1px 0 var(--light-main), inset -1px -1px 0 var(--dark-main)'
          : 'inset 1px 1px 0 #4b5563, inset -1px -1px 0 #1f2937',
      }}
    >
      {label}
    </button>
  )
}

/* ── WrapRow : T / S + 3 boutons ── */
export type WrapMode = 'repeat' | 'mirror' | 'clamp'

export function WrapRow({
  label, value, onChange,
}: {
  label: string; value: WrapMode; onChange: (v: WrapMode) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-gray-500 text-[9px] font-mono w-4 shrink-0">{label}</span>
      <WrapBtn label="rep"   active={value === 'repeat'} onClick={() => onChange('repeat')} />
      <WrapBtn label="mir"   active={value === 'mirror'} onClick={() => onChange('mirror')} />
      <WrapBtn label="clamp" active={value === 'clamp'}  onClick={() => onChange('clamp')}  />
    </div>
  )
}

/* ── SegBtn : bouton segment (mode selector) ── */
export function SegBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 text-[10px] py-1"
      style={{
        color: active ? 'white' : '#9ca3af',
        background: active ? 'var(--color-main)' : '#374151',
        boxShadow: active
          ? 'inset 1px 1px 0 var(--dark-main), inset -1px -1px 0 var(--light-main)'
          : 'inset 1px 1px 0 #4b5563, inset -1px -1px 0 #1f2937',
      }}
    >
      {label}
    </button>
  )
}

/* ── Slider ── */
export function Slider({
  label, value, min = 0, max = 1, step = 0.01, onChange,
}: {
  label: string; value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void
}) {
  const safe = isFinite(value) ? value : 0
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between">
        <span className="text-gray-400 text-[10px]">{label}</span>
        <span className="text-gray-300 text-[10px] font-mono">{safe.toFixed(2)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={safe}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-gray-400" style={{ height: 3 }}
      />
    </div>
  )
}

/* ── Checkbox ── */
export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none" onClick={onChange}>
      <div
        className="w-3.5 h-3.5 shrink-0 flex items-center justify-center"
        style={{
          background: checked ? 'var(--color-main)' : '#374151',
          boxShadow: checked
            ? 'inset 1px 1px 0 var(--dark-main)'
            : 'inset 1px 1px 0 #1f2937, inset -1px -1px 0 #4b5563',
        }}
      >
        {checked && (
          <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-gray-300 text-[10px]">{label}</span>
    </label>
  )
}

/* ── SectionLabel : titre de section avec séparateur ── */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-gray-500 text-[9px] uppercase tracking-widest">{children}</span>
}

/* ── Divider ── */
export function Divider() {
  return <div style={{ height: 1, background: '#374151' }} />
}

/* ── PanelHeader ── */
export function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-3 py-2 shrink-0" style={{ background: '#374151', borderBottom: '1px solid #4b5563' }}>
      <span className="text-gray-300 text-[10px] uppercase tracking-widest font-semibold">{title}</span>
      {subtitle && <p className="text-gray-500 text-[9px] mt-0.5">{subtitle}</p>}
    </div>
  )
}

/* ── DropZone ── */
export function DropZone({
  onFile, hint = 'Déposer un fichier ici', subHint,
}: {
  onFile: (file: File) => void
  hint?: string
  subHint?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      className="flex flex-col items-center justify-center gap-3 cursor-pointer select-none"
      style={{ border: '2px dashed #374151', background: '#1f2937', minHeight: 140, padding: '24px' }}
    >
      <input ref={inputRef} type="file" accept=".zip" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <div className="text-center">
        <p className="text-gray-300 text-sm font-medium">{hint}</p>
        {subHint && <p className="text-gray-500 text-xs mt-1">{subHint}</p>}
      </div>
    </div>
  )
}

/* ── ProgressBar ── */
export function ProgressBar({ current, total, label }: { current: number; total: number; label?: string }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label ?? `${current}/${total}`}</span>
        <span className="font-mono">{pct}%</span>
      </div>
      <div style={{ background: '#374151', height: 6 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-main)', transition: 'width 0.3s ease', boxShadow: 'inset 1px 1px 0 var(--light-main)' }} />
      </div>
    </div>
  )
}

/* ── StatusBadge ── */
export type ItemStatus = 'pending' | 'processing' | 'done' | 'error'

export function StatusBadge({ status }: { status: ItemStatus }) {
  const styles: Record<ItemStatus, { bg: string; color: string }> = {
    done:       { bg: '#065f46', color: '#6ee7b7' },
    error:      { bg: '#7f1d1d', color: '#fca5a5' },
    processing: { bg: '#1e3a5f', color: '#93c5fd' },
    pending:    { bg: '#1f2937', color: '#4b5563' },
  }
  const s = styles[status]
  return (
    <div className="text-[9px] font-mono px-1" style={{ background: s.bg, color: s.color }}>
      {status}
    </div>
  )
}

// needed for DropZone
import { useRef } from 'react'
