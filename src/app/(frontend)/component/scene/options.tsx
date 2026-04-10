'use client'
import { useState } from 'react'
import { defaultSceneOptions, SceneOptions } from '@/app/component/scene/scene-options'

/* ─── primitives UI ───────────────────────────────────── */

const Checkbox = ({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) => (
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <div
      onClick={onChange}
      className="w-4 h-4 shrink-0 flex items-center justify-center cursor-pointer"
      style={{
        background: checked ? 'var(--color-main)' : '#374151',
        boxShadow: checked
          ? 'inset 2px 2px 0 var(--dark-main), inset -2px -2px 0 var(--light-main)'
          : 'inset 2px 2px 0 #1f2937, inset -2px -2px 0 #4b5563',
      }}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path
            d="M1 4L3.5 6.5L9 1"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
    <span className="text-gray-300 text-xs">{label}</span>
  </label>
)

const Slider = ({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  hint,
}: {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
  hint?: string
}) => {
  const safe = typeof value === 'number' && isFinite(value) ? value : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-baseline">
        <span className="text-gray-400 text-xs">{label}</span>
        <div className="flex items-baseline gap-1.5">
          {hint && <span className="text-gray-600 text-[10px]">{hint}</span>}
          <span className="text-gray-300 text-xs font-mono w-8 text-right">{safe.toFixed(2)}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={safe}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-gray-400"
        style={{ height: '4px' }}
      />
    </div>
  )
}

const SegmentButtons = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-gray-400 text-xs">{label}</span>
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="flex-1 text-xs py-1 px-1"
          style={{
            color: value === opt.value ? 'white' : '#9ca3af',
            background: value === opt.value ? 'var(--color-main)' : '#374151',
            boxShadow:
              value === opt.value
                ? 'inset 2px 2px 0 var(--dark-main), inset -2px -2px 0 var(--light-main)'
                : 'inset 2px 2px 0 #4b5563, inset -2px -2px 0 #1f2937',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
)

const WrapButtons = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) => (
  <SegmentButtons
    label={label}
    value={value}
    options={[
      { value: 'repeat', label: 'repeat' },
      { value: 'clamp', label: 'clamp' },
      { value: 'mirror', label: 'mirror' },
    ]}
    onChange={onChange}
  />
)

/* ─── Collapsible Section ─────────────────────────────── */

const Section = ({
  label,
  children,
  defaultOpen = false,
}: {
  label: string
  children: React.ReactNode
  defaultOpen?: boolean
}) => {
  const [open, setOpen] = useState<boolean>(defaultOpen)

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 my-1 w-full text-left"
      >
        <span className="text-gray-500 text-xs uppercase tracking-widest whitespace-nowrap">
          {label}
        </span>
        <div className="flex-1 h-px bg-gray-600" />
        <span
          className="text-gray-500 text-xs ml-1"
          style={{
            display: 'inline-block',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms',
          }}
        >
          ▶
        </span>
      </button>
      {open && <div className="flex flex-col gap-3 mt-1">{children}</div>}
    </div>
  )
}

const Select = ({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full text-xs text-gray-200 px-2 py-1"
    style={{
      background: '#374151',
      boxShadow: 'inset 2px 2px 0 #1f2937, inset -2px -2px 0 #4b5563',
      border: 'none',
      outline: 'none',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L4 4L7 1' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 6px center',
      paddingRight: '20px',
    }}
  >
    {options.map((opt) => (
      <option key={opt} value={opt}>
        {opt}
      </option>
    ))}
  </select>
)

/* ─── Model Selector ──────────────────────────────────── */

const ModelSelector = ({
  modelNames,
  selectedModel,
  onChange,
}: {
  modelNames: string[]
  selectedModel: string
  onChange: (v: string) => void
}) => {
  if (modelNames.length <= 1) return null

  return (
    <div className="flex flex-col gap-2">
      <select
        value={selectedModel}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs text-gray-200 px-2 py-1"
        style={{
          background: '#374151',
          boxShadow: 'inset 2px 2px 0 #1f2937, inset -2px -2px 0 #4b5563',
          border: 'none',
          outline: 'none',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L4 4L7 1' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 6px center',
          paddingRight: '20px',
        }}
      >
        <option value="all">All ({modelNames.length} modèles)</option>
        {modelNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  )
}

/* ─── Angular isometric angle selector ───────────────── */

const ISOMETRIC_ANGLES = [
  { value: 'top', label: 'Top' },
  { value: 'front', label: 'Front' },
  { value: 'right', label: 'Right' },
  { value: 'back', label: 'Back' },
  { value: 'left', label: 'Left' },
  { value: 'iso-ne', label: 'NE' },
  { value: 'iso-nw', label: 'NW' },
  { value: 'iso-se', label: 'SE' },
  { value: 'iso-sw', label: 'SW' },
]

const AngleGrid = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="flex flex-col gap-1">
    <span className="text-gray-400 text-xs">Angle</span>
    <div className="grid grid-cols-3 gap-1">
      {ISOMETRIC_ANGLES.map((a) => (
        <button
          key={a.value}
          onClick={() => onChange(a.value)}
          className="text-xs py-1"
          style={{
            color: value === a.value ? 'white' : '#9ca3af',
            background: value === a.value ? 'var(--color-main)' : '#374151',
            boxShadow:
              value === a.value
                ? 'inset 2px 2px 0 var(--dark-main), inset -2px -2px 0 var(--light-main)'
                : 'inset 2px 2px 0 #4b5563, inset -2px -2px 0 #1f2937',
          }}
        >
          {a.label}
        </button>
      ))}
    </div>
  </div>
)

/* ─── component ───────────────────────────────────────── */

interface OptionsProps {
  options?: SceneOptions
  onChange?: (opts: SceneOptions) => void
  onAdvanced?: () => void
  onCapture?: (w?: number, h?: number) => string | null
  modelNames?: string[]
  selectedModel?: string
  onModelChange?: (model: string) => void
}

export default function Options({
  options: optionsRaw = defaultSceneOptions,
  onChange,
  onAdvanced,
  onCapture,
  modelNames = [],
  selectedModel = 'all',
  onModelChange,
}: OptionsProps) {
  const options: SceneOptions = { ...defaultSceneOptions, ...optionsRaw }

  const set = <K extends keyof SceneOptions>(key: K, value: SceneOptions[K]) =>
    onChange?.({ ...options, [key]: value })

  const isAngular = options.viewMode === 'angular'

  const handleDownload = () => {
    const w = isAngular && options.perfectResolution ? 200 : undefined
    const h = isAngular && options.perfectResolution ? 140 : undefined

    const dataURL = onCapture?.(w, h)
    if (!dataURL) return

    const link = document.createElement('a')
    const randName = Math.random().toString(36).slice(2, 10).padEnd(8, '0')
    link.download = `${randName}.webp`
    link.href = dataURL
    link.click()
  }

  return (
    <div className="flex flex-col w-full xl:w-64 shrink-0 h-full">
      <div className="flex items-center bg-(--color-main) p-3 h-14 shrink-0 shadow-[inset_3px_3px_0_var(--light-main),inset_-3px_-3px_0_var(--dark-main)]">
        <span className="text-white font-semibold">Options</span>
      </div>

      <div className="flex-1 min-h-0 bg-gray-700 p-3 overflow-y-auto flex flex-col gap-1 shadow-[inset_3px_3px_0_var(--dark-main),inset_-3px_-3px_0_var(--light-main)]">
        {/* ── Modèles (ouvert si plusieurs) ── */}
        {modelNames.length > 1 && (
          <Section label="Modèles" defaultOpen={true}>
            <ModelSelector
              modelNames={modelNames}
              selectedModel={selectedModel}
              onChange={(v) => onModelChange?.(v)}
            />
          </Section>
        )}

        {/* ── Rendu : FERMÉ ── */}
        <Section label="Rendu" defaultOpen={false}>
          <SegmentButtons
            label="Anti-aliasing"
            value={options.aaMode}
            options={[
              { value: 'none', label: 'Aucun' },
              { value: 'builtin', label: 'Natif' },
              { value: 'post', label: 'Post' },
            ]}
            onChange={(v) => set('aaMode', v as SceneOptions['aaMode'])}
          />
          <Checkbox
            label="Transparency Fix"
            checked={options.transparencyFix}
            onChange={() => set('transparencyFix', !options.transparencyFix)}
          />
        </Section>

        {/* ── Lumière : OUVERT ── */}
        <Section label="Lumiere" defaultOpen={true}>
          <Slider
            label="Directionnelle"
            value={options.light}
            hint="soleil"
            onChange={(v) => set('light', v)}
          />
          <Slider
            label="Ambiante"
            value={options.ambient}
            hint="ciel"
            onChange={(v) => set('ambient', v)}
          />
        </Section>

        {/* ── Matériau : OUVERT ── */}
        <Section label="Matériau" defaultOpen={true}>
          <Slider
            label="Roughness"
            value={options.roughness}
            hint="mat → brillant"
            onChange={(v) => set('roughness', v)}
          />
          <Slider
            label="Metalness"
            value={options.metalness}
            hint="→ reflets"
            onChange={(v) => set('metalness', v)}
          />
        </Section>

        {/* ── Alpha Mode : OUVERT ── */}
        <Section label="Alpha Mode" defaultOpen={true}>
          <Select
            value={options.alphaMode}
            onChange={(v) => set('alphaMode', v)}
            options={['Opaque', 'Mask', 'Anti-aliasing', 'Blend']}
          />
        </Section>

        {/* ── Photo Mode : OUVERT ── */}
        <Section label="Photo Mode" defaultOpen={true}>
          <SegmentButtons
            label="Mode"
            value={options.viewMode}
            options={[
              { value: 'default', label: 'Default' },
              { value: 'angular', label: 'Angular' },
            ]}
            onChange={(v) => set('viewMode', v as SceneOptions['viewMode'])}
          />
          {isAngular && (
            <>
              <AngleGrid
                value={options.angularAngle ?? 'iso-ne'}
                onChange={(v) => set('angularAngle', v)}
              />
              <Checkbox
                label="Perfect Resolution (200x140)"
                checked={options.perfectResolution ?? false}
                onChange={() => set('perfectResolution', !options.perfectResolution)}
              />
            </>
          )}
          <button
            onClick={handleDownload}
            className="mt-1 w-full py-1 text-xs font-semibold text-gray-200"
            style={{
              background: '#4b5563',
              boxShadow: 'inset 2px 2px 0 #6b7280, inset -2px -2px 0 #1f2937',
            }}
          >
            Download
          </button>
        </Section>

        {/* ── Affichage : FERMÉ ── */}
        <Section label="Affichage" defaultOpen={false}>
          <Checkbox
            label="Filtering Texture"
            checked={options.filterTexture}
            onChange={() => set('filterTexture', !options.filterTexture)}
          />
          <Checkbox
            label="Auto Rotate"
            checked={options.autoRotate}
            onChange={() => set('autoRotate', !options.autoRotate)}
          />
          <Checkbox
            label="Double Side"
            checked={options.doubleSide}
            onChange={() => set('doubleSide', !options.doubleSide)}
          />
          <Checkbox
            label="Wireframe"
            checked={options.wireframe}
            onChange={() => set('wireframe', !options.wireframe)}
          />
        </Section>

        {/* ── Texture Wrap : OUVERT ── */}
        <Section label="Texture Wrap" defaultOpen={true}>
          <WrapButtons label="T Wrap" value={options.tWrap} onChange={(v) => set('tWrap', v)} />
          <WrapButtons label="S Wrap" value={options.sWrap} onChange={(v) => set('sWrap', v)} />
        </Section>

        <div className="mt-1">
          <button
            onClick={onAdvanced}
            className="w-full py-2 text-sm text-gray-200 font-semibold"
            style={{
              background: '#4b5563',
              boxShadow: 'inset 2px 2px 0 #6b7280, inset -2px -2px 0 #1f2937',
            }}
          >
            ▶ Avancé
          </button>
        </div>
      </div>
    </div>
  )
}
