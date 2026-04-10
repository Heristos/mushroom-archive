'use client'

/* ─────────────────────────────────────────────────────────────────────
   component/tools/scene-options-panel.tsx
   Panneau d'options de scène réutilisable (alpha, wrap, lumière, etc.)
   Utilisé dans ItemModal (Icon Generator), et potentiellement ailleurs.
───────────────────────────────────────────────────────────────────── */

import { SceneOptions } from '@/app/component/scene/scene-options'
import { WrapMode, WrapRow, SegBtn, Slider, Checkbox, SectionLabel, Divider } from './ui'

const ANGLES = ['top', 'front', 'right', 'back', 'left', 'iso-ne', 'iso-nw', 'iso-se', 'iso-sw']

interface SceneOptionsPanelProps {
  opts: SceneOptions
  tWrap: WrapMode
  sWrap: WrapMode
  onOptsChange: (opts: SceneOptions) => void
  onWrapChange: (tWrap: WrapMode, sWrap: WrapMode) => void
}

export default function SceneOptionsPanel({
  opts, tWrap, sWrap, onOptsChange, onWrapChange,
}: SceneOptionsPanelProps) {
  const set = <K extends keyof SceneOptions>(key: K, value: SceneOptions[K]) =>
    onOptsChange({ ...opts, [key]: value })

  return (
    <div className="flex flex-col gap-3">

      {/* Texture Wrap */}
      <div className="flex flex-col gap-2">
        <SectionLabel>Texture Wrap</SectionLabel>
        <WrapRow label="T" value={tWrap} onChange={(v) => onWrapChange(v, sWrap)} />
        <WrapRow label="S" value={sWrap} onChange={(v) => onWrapChange(tWrap, v)} />
      </div>

      <Divider />

      {/* Alpha Mode */}
      <div className="flex flex-col gap-1.5">
        <SectionLabel>Alpha Mode</SectionLabel>
        <div className="flex gap-1 flex-wrap">
          {['Opaque', 'Mask', 'Anti-aliasing', 'Blend'].map((m) => (
            <SegBtn key={m} label={m} active={opts.alphaMode === m} onClick={() => set('alphaMode', m)} />
          ))}
        </div>
      </div>

      <Divider />

      {/* Lumière */}
      <div className="flex flex-col gap-2">
        <SectionLabel>Lumière</SectionLabel>
        <Slider label="Directionnelle" value={opts.light}   onChange={(v) => set('light', v)} />
        <Slider label="Ambiante"       value={opts.ambient} onChange={(v) => set('ambient', v)} />
      </div>

      <Divider />

      {/* Matériau */}
      <div className="flex flex-col gap-2">
        <SectionLabel>Matériau</SectionLabel>
        <Slider label="Roughness" value={opts.roughness} onChange={(v) => set('roughness', v)} />
        <Slider label="Metalness" value={opts.metalness} onChange={(v) => set('metalness', v)} />
      </div>

      <Divider />

      {/* Angle de capture */}
      <div className="flex flex-col gap-1.5">
        <SectionLabel>Angle de capture</SectionLabel>
        <div className="flex gap-1">
          <SegBtn label="Default" active={opts.viewMode === 'default'} onClick={() => set('viewMode', 'default')} />
          <SegBtn label="Angular" active={opts.viewMode === 'angular'} onClick={() => set('viewMode', 'angular')} />
        </div>
        {opts.viewMode === 'angular' && (
          <div className="grid grid-cols-3 gap-1 mt-1">
            {ANGLES.map((a) => (
              <button
                key={a}
                onClick={() => set('angularAngle', a)}
                className="text-[9px] py-0.5"
                style={{
                  color: opts.angularAngle === a ? 'white' : '#9ca3af',
                  background: opts.angularAngle === a ? 'var(--color-main)' : '#374151',
                  boxShadow: opts.angularAngle === a
                    ? 'inset 1px 1px 0 var(--dark-main)'
                    : 'inset 1px 1px 0 #4b5563',
                }}
              >
                {a.replace('iso-', '')}
              </button>
            ))}
          </div>
        )}
      </div>

      <Divider />

      {/* Affichage */}
      <div className="flex flex-col gap-1.5">
        <SectionLabel>Affichage</SectionLabel>
        <Checkbox label="Auto Rotate"    checked={opts.autoRotate}    onChange={() => set('autoRotate',    !opts.autoRotate)} />
        <Checkbox label="Double Side"    checked={opts.doubleSide}    onChange={() => set('doubleSide',    !opts.doubleSide)} />
        <Checkbox label="Wireframe"      checked={opts.wireframe}     onChange={() => set('wireframe',     !opts.wireframe)} />
        <Checkbox label="Filter Texture" checked={opts.filterTexture} onChange={() => set('filterTexture', !opts.filterTexture)} />
      </div>

      <Divider />

      {/* Anti-Aliasing */}
      <div className="flex flex-col gap-1.5">
        <SectionLabel>Anti-Aliasing</SectionLabel>
        <div className="flex gap-1">
          {(['none', 'builtin', 'post'] as const).map((m) => (
            <SegBtn key={m} label={m} active={opts.aaMode === m} onClick={() => set('aaMode', m)} />
          ))}
        </div>
        <Checkbox label="Transparency Fix" checked={opts.transparencyFix} onChange={() => set('transparencyFix', !opts.transparencyFix)} />
      </div>

    </div>
  )
}
