'use client'
import { useRef, useState, useCallback } from 'react'
import { NodeInfo, NodeOverride } from '@/app/component/scene/scene-bridge'

/* ── styles ──────────────────────────────────────────── */

const SELECT_STYLE: React.CSSProperties = {
  background: '#374151',
  boxShadow: 'inset 2px 2px 0 #1f2937, inset -2px -2px 0 #4b5563',
  border: 'none',
  outline: 'none',
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L4 4L7 1' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 6px center',
  paddingRight: '20px',
}

/* ── constants ───────────────────────────────────────── */

const WRAP_OPTIONS = ['mirror', 'repeat', 'clamp'] as const
const ALPHA_OPTIONS = ['Opaque', 'Mask', 'Anti-aliasing', 'Blend'] as const

/* ── types ───────────────────────────────────────────── */

interface AdvancedPanelProps {
  nodes: NodeInfo[]
  overrides: Record<string, NodeOverride>
  onOverride: (o: NodeOverride) => void
  onClose: () => void
}

/* ── Checkbox cell ───────────────────────────────────── */
function CheckCell({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      className="w-4 h-4 flex items-center justify-center"
      data-cursor="pointer"
      style={{
        background: value ? 'var(--color-main)' : '#374151',
        boxShadow: value
          ? 'inset 2px 2px 0 var(--dark-main), inset -2px -2px 0 var(--light-main)'
          : 'inset 2px 2px 0 #1f2937, inset -2px -2px 0 #4b5563',
      }}
    >
      {value && (
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
  )
}

/* ── Select cell ─────────────────────────────────────── */
function SelectCell<T extends string>({
  value,
  options,
  onChange,
  width = 'w-28',
}: {
  value: T | undefined
  options: readonly T[]
  onChange: (v: T | undefined) => void
  width?: string
}) {
  const isInherited = value === undefined
  return (
    <select
      value={value ?? '__inherit__'}
      onChange={(e) => {
        const v = e.target.value
        onChange(v === '__inherit__' ? undefined : (v as T))
      }}
      className={`text-xs px-2 py-0.5 ${width}`}
      style={{
        ...SELECT_STYLE,
        color: isInherited ? '#6b7280' : '#e5e7eb',
        fontStyle: isInherited ? 'italic' : 'normal',
      }}
    >
      <option value="__inherit__" style={{ fontStyle: 'italic', color: '#6b7280' }}>
        — global —
      </option>
      {options.map((o) => (
        <option key={o} value={o} style={{ color: '#e5e7eb', fontStyle: 'normal' }}>
          {o}
        </option>
      ))}
    </select>
  )
}

/* ── Colonnes visibles selon la largeur ──────────────── */
type ColKey =
  | 'visible'
  | 'alphaMode'
  | 'doubleSide'
  | 'tWrap'
  | 'sWrap'
  | 'renderOrder'
  | 'depthTest'

function useVisibleCols(width: number): ColKey[] {
  if (width < 400) return ['visible']
  if (width < 550) return ['visible', 'alphaMode']
  if (width < 700) return ['visible', 'alphaMode', 'doubleSide']
  if (width < 850) return ['visible', 'alphaMode', 'doubleSide', 'tWrap', 'sWrap']
  return ['visible', 'alphaMode', 'doubleSide', 'tWrap', 'sWrap', 'renderOrder', 'depthTest']
}

/* ── Main component ──────────────────────────────────── */

export default function AdvancedPanel({
  nodes,
  overrides,
  onOverride,
  onClose,
}: AdvancedPanelProps) {
  const [height, setHeight] = useState(220)
  const [panelWidth, setPanelWidth] = useState(800)
  const heightRef = useRef(220)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Mesure la largeur réelle du panel
  const measuredRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    ;(containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
    const ro = new ResizeObserver(([entry]) => setPanelWidth(entry.contentRect.width))
    ro.observe(node)
  }, [])

  const visibleCols = useVisibleCols(panelWidth)

  /* ── Drag handle (resize vertical) ── */
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startH: heightRef.current }

    // Signaler au CursorManager qu'on resize
    document.body.classList.add('cursor-ns-resize')

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const next = Math.max(
        120,
        Math.min(600, dragRef.current.startH + (dragRef.current.startY - ev.clientY)),
      )
      heightRef.current = next
      setHeight(next)
    }
    const onUp = () => {
      dragRef.current = null
      document.body.classList.remove('cursor-ns-resize')
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const get = (id: string): NodeOverride => overrides[id] ?? { id }

  const set = <K extends keyof NodeOverride>(id: string, key: K, value: NodeOverride[K]) => {
    const current = get(id)
    const updated = { ...current, [key]: value }
    if (value === undefined) delete updated[key]
    onOverride(updated)
  }

  const overrideCount = Object.values(overrides).filter((ov) => Object.keys(ov).length > 1).length

  const COL_HEADERS: Record<ColKey, string> = {
    visible: 'Visible',
    alphaMode: 'Alpha Mode',
    doubleSide: 'Double Side',
    tWrap: 'T Wrap',
    sWrap: 'S Wrap',
    renderOrder: 'Order',
    depthTest: 'Depth',
  }

  return (
    <div
      ref={measuredRef}
      className="shrink-0 flex flex-col w-full"
      style={{ height, background: '#1f2937', boxShadow: 'inset 0 3px 0 #111827' }}
    >
      {/* ── Drag handle ── */}
      <div
        onMouseDown={onDragStart}
        className="flex items-center justify-between px-3 shrink-0 select-none"
        data-cursor="ns-resize"
        style={{
          height: 28,
          background: 'var(--color-main)',
          boxShadow: 'inset 3px 3px 0 var(--light-main), inset -3px -3px 0 var(--dark-main)',
          cursor: 'ns-resize',
        }}
      >
        <span className="text-white text-xs font-semibold tracking-wide truncate">
          ⠿ Avancé — {nodes.length} node{nodes.length !== 1 ? 's' : ''}
          {overrideCount > 0 && (
            <span className="ml-2 text-white/50">
              ({overrideCount} override{overrideCount !== 1 ? 's' : ''})
            </span>
          )}
        </span>
        <div className="flex items-center gap-3 shrink-0">
          {overrideCount > 0 && (
            <button
              onClick={() => nodes.forEach((n) => onOverride({ id: n.id }))}
              className="text-white/40 hover:text-white/80 text-[10px] px-1"
              title="Réinitialiser tous les overrides"
            >
              ↺ reset
            </button>
          )}
          <button onClick={onClose} className="text-white/60 hover:text-white text-xs px-2">
            ✕
          </button>
        </div>
      </div>

      {/* ── Légende — masquée sur petits panels ── */}
      {panelWidth >= 500 && (
        <div
          className="shrink-0 px-3 py-1 text-[10px] text-gray-500 italic"
          style={{ background: '#161e2a', borderBottom: '1px solid #374151' }}
        >
          — global — = hérite des options globales · sélectionner une valeur pour surcharger ce node
        </div>
      )}

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        {nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-xs">
            Aucun node — chargez un modèle 3D
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              {/* ── Bulk actions row ── */}
              <tr
                style={{
                  background: '#0d1520',
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  borderBottom: '2px solid #374151',
                }}
              >
                <th className="px-3 py-1.5 text-left text-gray-500 text-[10px] font-semibold whitespace-nowrap">
                  {panelWidth >= 500 ? 'Tout appliquer ↓' : '↓'}
                </th>

                {visibleCols.includes('visible') && (
                  <th className="px-3 py-1.5">
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          nodes.forEach((n) =>
                            onOverride({ ...get(n.id), id: n.id, visible: true }),
                          )
                        }
                        className="text-[10px] px-1.5 py-0.5 text-gray-300 hover:text-white"
                        style={{ background: '#1f2937', boxShadow: 'inset 1px 1px 0 #374151' }}
                        title="Tout afficher"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() =>
                          nodes.forEach((n) =>
                            onOverride({ ...get(n.id), id: n.id, visible: false }),
                          )
                        }
                        className="text-[10px] px-1.5 py-0.5 text-gray-300 hover:text-white"
                        style={{ background: '#1f2937', boxShadow: 'inset 1px 1px 0 #374151' }}
                        title="Tout masquer"
                      >
                        ✗
                      </button>
                    </div>
                  </th>
                )}
                {visibleCols.includes('alphaMode') && (
                  <th className="px-3 py-1.5">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const v = e.target.value as NodeOverride['alphaMode']
                        if (!v) return
                        nodes.forEach((n) => onOverride({ ...get(n.id), id: n.id, alphaMode: v }))
                        e.target.value = ''
                      }}
                      className="text-[10px] text-gray-400 w-28"
                      style={{
                        ...SELECT_STYLE,
                        background: '#0d1520',
                        paddingTop: 2,
                        paddingBottom: 2,
                      }}
                    >
                      <option value="">— alpha…</option>
                      {ALPHA_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </th>
                )}
                {visibleCols.includes('doubleSide') && (
                  <th className="px-3 py-1.5">
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          nodes.forEach((n) =>
                            onOverride({ ...get(n.id), id: n.id, doubleSide: true }),
                          )
                        }
                        className="text-[10px] px-1.5 py-0.5 text-gray-300 hover:text-white"
                        style={{ background: '#1f2937', boxShadow: 'inset 1px 1px 0 #374151' }}
                      >
                        ✓
                      </button>
                      <button
                        onClick={() =>
                          nodes.forEach((n) =>
                            onOverride({ ...get(n.id), id: n.id, doubleSide: false }),
                          )
                        }
                        className="text-[10px] px-1.5 py-0.5 text-gray-300 hover:text-white"
                        style={{ background: '#1f2937', boxShadow: 'inset 1px 1px 0 #374151' }}
                      >
                        ✗
                      </button>
                    </div>
                  </th>
                )}
                {visibleCols.includes('tWrap') && (
                  <th className="px-3 py-1.5">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const v = e.target.value as NodeOverride['tWrap']
                        if (!v) return
                        nodes.forEach((n) => onOverride({ ...get(n.id), id: n.id, tWrap: v }))
                        e.target.value = ''
                      }}
                      className="text-[10px] text-gray-400 w-22"
                      style={{
                        ...SELECT_STYLE,
                        background: '#0d1520',
                        paddingTop: 2,
                        paddingBottom: 2,
                      }}
                    >
                      <option value="">— tWrap…</option>
                      {WRAP_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </th>
                )}
                {visibleCols.includes('sWrap') && (
                  <th className="px-3 py-1.5">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const v = e.target.value as NodeOverride['sWrap']
                        if (!v) return
                        nodes.forEach((n) => onOverride({ ...get(n.id), id: n.id, sWrap: v }))
                        e.target.value = ''
                      }}
                      className="text-[10px] text-gray-400 w-22"
                      style={{
                        ...SELECT_STYLE,
                        background: '#0d1520',
                        paddingTop: 2,
                        paddingBottom: 2,
                      }}
                    >
                      <option value="">— sWrap…</option>
                      {WRAP_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </th>
                )}
                {visibleCols.includes('renderOrder') && <th className="px-3 py-1.5" />}
                {visibleCols.includes('depthTest') && <th className="px-3 py-1.5" />}
                <th className="px-2 py-1.5">
                  <button
                    onClick={() => nodes.forEach((n) => onOverride({ id: n.id }))}
                    className="text-gray-600 hover:text-gray-300 text-[10px] px-1"
                    title="Reset tous"
                  >
                    ↺
                  </button>
                </th>
              </tr>

              {/* ── Column headers ── */}
              <tr style={{ background: '#111827', position: 'sticky', top: 37, zIndex: 1 }}>
                <th
                  className="text-left text-gray-400 font-semibold px-3 py-1.5 whitespace-nowrap"
                  style={{ borderBottom: '1px solid #374151' }}
                >
                  Node
                </th>
                {visibleCols.map((col) => (
                  <th
                    key={col}
                    className="text-left text-gray-400 font-semibold px-3 py-1.5 whitespace-nowrap"
                    style={{ borderBottom: '1px solid #374151' }}
                  >
                    {COL_HEADERS[col]}
                  </th>
                ))}
                <th className="px-2 py-1.5" style={{ borderBottom: '1px solid #374151' }} />
              </tr>
            </thead>

            <tbody>
              {nodes.map((node, i) => {
                const ov = get(node.id)
                const hasOverride = Object.keys(ov).length > 1
                return (
                  <tr
                    key={node.id}
                    style={{
                      background: hasOverride
                        ? i % 2 === 0
                          ? '#1e2d1e'
                          : '#223222'
                        : i % 2 === 0
                          ? '#1f2937'
                          : '#253041',
                    }}
                  >
                    {/* Name */}
                    <td
                      className="px-3 py-1.5 text-gray-300 whitespace-nowrap"
                      style={{ maxWidth: panelWidth < 500 ? 80 : 140 }}
                    >
                      <span className="truncate block" title={node.name}>
                        {node.name || node.id.slice(0, 8)}
                      </span>
                      {node.materialName && panelWidth >= 400 && (
                        <span className="text-gray-500 text-[10px] truncate block">
                          {node.materialName}
                        </span>
                      )}
                    </td>

                    {visibleCols.includes('visible') && (
                      <td className="px-3 py-1.5">
                        <CheckCell
                          value={ov.visible ?? true}
                          onChange={() => set(node.id, 'visible', !(ov.visible ?? true))}
                        />
                      </td>
                    )}

                    {visibleCols.includes('alphaMode') && (
                      <td className="px-3 py-1.5">
                        <SelectCell<NodeOverride['alphaMode'] & string>
                          value={ov.alphaMode}
                          options={ALPHA_OPTIONS}
                          onChange={(v) => set(node.id, 'alphaMode', v)}
                          width="w-28"
                        />
                      </td>
                    )}

                    {visibleCols.includes('doubleSide') && (
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          {ov.doubleSide !== undefined ? (
                            <CheckCell
                              value={ov.doubleSide}
                              onChange={() => set(node.id, 'doubleSide', !ov.doubleSide)}
                            />
                          ) : (
                            <div
                              onClick={() => set(node.id, 'doubleSide', false)}
                              className="w-4 h-4 flex items-center justify-center"
                              style={{
                                background: '#1f2937',
                                boxShadow: 'inset 1px 1px 0 #374151',
                                opacity: 0.4,
                                cursor: 'pointer',
                              }}
                              title="Cliquer pour surcharger"
                            />
                          )}
                          {ov.doubleSide !== undefined && (
                            <button
                              onClick={() => set(node.id, 'doubleSide', undefined)}
                              className="text-gray-600 hover:text-gray-400 text-[10px]"
                              title="Revenir au global"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </td>
                    )}

                    {visibleCols.includes('tWrap') && (
                      <td className="px-3 py-1.5">
                        <SelectCell<string>
                          value={ov.tWrap}
                          options={WRAP_OPTIONS}
                          onChange={(v) => set(node.id, 'tWrap', v as NodeOverride['tWrap'])}
                          width="w-22"
                        />
                      </td>
                    )}

                    {visibleCols.includes('sWrap') && (
                      <td className="px-3 py-1.5">
                        <SelectCell<string>
                          value={ov.sWrap}
                          options={WRAP_OPTIONS}
                          onChange={(v) => set(node.id, 'sWrap', v as NodeOverride['sWrap'])}
                          width="w-22"
                        />
                      </td>
                    )}

                    {visibleCols.includes('renderOrder') && (
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          value={ov.renderOrder ?? ''}
                          placeholder="—"
                          onChange={(e) => {
                            const v = e.target.value
                            set(node.id, 'renderOrder', v === '' ? undefined : parseInt(v, 10))
                          }}
                          className="w-14 text-xs px-1.5 py-0.5 font-mono text-center"
                          style={{
                            background: ov.renderOrder !== undefined ? '#1e2d1e' : '#1f2937',
                            color: ov.renderOrder !== undefined ? '#86efac' : '#6b7280',
                            boxShadow: 'inset 2px 2px 0 #111827, inset -2px -2px 0 #374151',
                            border: 'none',
                            outline: 'none',
                          }}
                        />
                      </td>
                    )}

                    {visibleCols.includes('depthTest') && (
                      <td className="px-3 py-1.5">
                        <button
                          onClick={() => {
                            const cur = ov.depthTest
                            const next =
                              cur === undefined ? false : cur === false ? true : undefined
                            set(node.id, 'depthTest', next)
                          }}
                          className="text-xs px-2 py-0.5 font-mono"
                          style={{
                            background:
                              ov.depthTest === false
                                ? '#3b1e1e'
                                : ov.depthTest === true
                                  ? '#1e2d1e'
                                  : '#1f2937',
                            color:
                              ov.depthTest === false
                                ? '#fca5a5'
                                : ov.depthTest === true
                                  ? '#86efac'
                                  : '#6b7280',
                            boxShadow: 'inset 2px 2px 0 #111827, inset -2px -2px 0 #374151',
                          }}
                        >
                          {ov.depthTest === false ? 'OFF' : ov.depthTest === true ? 'ON' : '—'}
                        </button>
                      </td>
                    )}

                    <td className="px-2 py-1.5">
                      {hasOverride && (
                        <button
                          onClick={() => onOverride({ id: node.id })}
                          className="text-gray-600 hover:text-gray-300 text-[10px] px-1"
                          title="Reset ce node"
                        >
                          ↺
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
