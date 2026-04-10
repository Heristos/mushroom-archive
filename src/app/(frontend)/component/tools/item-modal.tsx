'use client'

/* ─────────────────────────────────────────────────────────────────────
   component/tools/item-modal.tsx
   Modal plein-écran avec scène 3D interactive + panneau d'options.
   Utilisé par Icon Generator (et potentiellement d'autres outils).
───────────────────────────────────────────────────────────────────── */

import { useRef, useState, useEffect } from 'react'
import Scene, { SceneHandle } from '@/app/component/scene/scene'
import { SceneOptions } from '@/app/component/scene/scene-options'
import SceneOptionsPanel from './scene-options-panel'
import { WrapMode, PanelHeader } from './ui'

const noop = () => {}

export interface ItemModalData {
  folderName: string
  zipName: string
  zipBlob: Blob
  iconDataURL?: string
  tWrap: WrapMode
  sWrap: WrapMode
  liveOptions: SceneOptions
}

interface ItemModalProps {
  item: ItemModalData
  onClose: () => void
  onWrapChange: (tWrap: WrapMode, sWrap: WrapMode) => void
  onLiveOptionsChange: (opts: SceneOptions) => void
  onRegenerate: () => void
}

export default function ItemModal({
  item, onClose, onWrapChange, onLiveOptionsChange, onRegenerate,
}: ItemModalProps) {
  const [blobUrl] = useState(() => URL.createObjectURL(item.zipBlob))
  const sceneRef = useRef<SceneHandle>(null)
  const opts = item.liveOptions

  // Fermer avec Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleDownload = () => {
    const dataURL = sceneRef.current?.captureDataURL(200, 140) ?? null
    if (!dataURL) return
    const a = document.createElement('a')
    a.download = `${item.folderName}.webp`
    a.href = dataURL
    a.click()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col md:flex-row w-full max-w-4xl mx-4"
        style={{
          background: '#111827',
          boxShadow: 'inset 3px 3px 0 #1f2937, inset -3px -3px 0 #000, 0 25px 60px rgba(0,0,0,0.8)',
          maxHeight: '90vh',
        }}
      >
        {/* Header mobile */}
        <div
          className="flex items-center justify-between px-4 h-12 shrink-0 md:hidden"
          style={{ background: 'var(--color-main)', boxShadow: 'inset 2px 2px 0 var(--light-main), inset -2px -2px 0 var(--dark-main)' }}
        >
          <span className="text-white text-sm font-semibold truncate">{item.folderName}</span>
          <button onClick={onClose} className="text-white/70 hover:text-white text-lg leading-none ml-3">✕</button>
        </div>

        {/* Scène 3D */}
        <div className="flex-1 min-h-0 flex flex-col" style={{ minHeight: 300 }}>
          {/* Header desktop */}
          <div
            className="hidden md:flex items-center justify-between px-4 h-12 shrink-0"
            style={{ background: 'var(--color-main)', boxShadow: 'inset 2px 2px 0 var(--light-main), inset -2px -2px 0 var(--dark-main)' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-white text-sm font-semibold">{item.folderName}</span>
              <span className="text-white/40 text-xs font-mono">{item.zipName}</span>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-base leading-none">✕</button>
          </div>

          <div className="flex-1 min-h-0" style={{ minHeight: 280 }}>
            <Scene
              ref={sceneRef}
              zipUrl={blobUrl}
              options={opts}
              nodeOverrides={{}}
              onNodesLoaded={noop}
              selectedModel={undefined}
            />
          </div>
        </div>

        {/* Panneau options */}
        <div
          className="shrink-0 w-full md:w-56 flex flex-col overflow-hidden"
          style={{ background: '#1f2937', borderLeft: '2px solid #374151', maxHeight: '90vh' }}
        >
          <PanelHeader title="Options" subtitle="Ces réglages seront utilisés pour la capture" />

          <div className="flex-1 overflow-y-auto p-3">
            <SceneOptionsPanel
              opts={opts}
              tWrap={item.tWrap}
              sWrap={item.sWrap}
              onOptsChange={onLiveOptionsChange}
              onWrapChange={onWrapChange}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 p-3 shrink-0" style={{ borderTop: '1px solid #374151' }}>
            {item.iconDataURL && (
              <div className="flex flex-col gap-1">
                <span className="text-gray-500 text-[9px] uppercase tracking-widest">Icône actuelle</span>
                <div className="flex items-center gap-2">
                  <img src={item.iconDataURL} alt="" style={{ width: 40, height: 28, imageRendering: 'pixelated', background: '#0d1117' }} />
                  <span className="text-gray-500 text-[9px] font-mono">200×140</span>
                </div>
              </div>
            )}
            <button
              onClick={onRegenerate}
              className="w-full py-1.5 text-xs font-semibold text-white"
              style={{ background: 'var(--color-main)', boxShadow: 'inset 2px 2px 0 var(--light-main), inset -2px -2px 0 var(--dark-main)' }}
            >
              ↺ Regénérer avec ces options
            </button>
            <button
              onClick={handleDownload}
              className="w-full py-1.5 text-xs font-semibold text-gray-300"
              style={{ background: '#4b5563', boxShadow: 'inset 1px 1px 0 #6b7280, inset -1px -1px 0 #1f2937' }}
            >
              ↓ Download vue courante
            </button>
            <button
              onClick={onClose}
              className="w-full py-1.5 text-xs text-gray-500"
              style={{ background: '#374151' }}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
