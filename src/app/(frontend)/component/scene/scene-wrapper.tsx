'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Options from '@/app/component/scene/options'
import Scene, { SceneHandle } from '@/app/component/scene/scene'
import AdvancedPanel from '@/app/component/scene/advanced-panel'
import AudioPlayer from '@/app/component/scene/audio-player'
import VideoPlayer from '@/app/component/scene/video-player'
import { defaultSceneOptions, SceneOptions } from '@/app/component/scene/scene-options'
import { NodeInfo, NodeOverride } from '@/app/component/scene/scene-bridge'
import { inspectZip } from '@/app/component/scene/scene-loader'

/* ── TextureViewer ────────────────────────────────────────────────── */

function TextureViewer({ files }: { files: { name: string; blobUrl: string }[] }) {
  const [selected, setSelected] = useState(0)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  const current = files[selected]

  return (
    <div className="flex flex-col xl:flex-row flex-1 min-h-0 w-full">
      {/* ── Liste textures (sidebar) ── */}
      <div
        className="shrink-0 flex xl:flex-col overflow-x-auto xl:overflow-x-hidden xl:overflow-y-auto xl:w-56 border-b xl:border-b-0 xl:border-r"
        style={{ borderColor: '#374151', background: '#111827' }}
      >
        {files.map((f, i) => (
          <button
            key={f.blobUrl}
            onClick={() => {
              setSelected(i)
              setDims(null)
            }}
            className="shrink-0 flex xl:flex-row items-center gap-2 px-3 py-2 text-left transition-colors"
            style={{
              background: i === selected ? 'var(--color-main)' : 'transparent',
              boxShadow:
                i === selected
                  ? 'inset 3px 3px 0 var(--light-main), inset -3px -3px 0 var(--dark-main)'
                  : undefined,
              color: i === selected ? '#fff' : '#9ca3af',
              minWidth: files.length > 6 ? 120 : undefined,
            }}
          >
            {/* Miniature */}
            <img
              src={f.blobUrl}
              alt=""
              className="shrink-0 object-contain"
              style={{
                width: 32,
                height: 32,
                imageRendering: 'pixelated',
                background: '#1f2937',
                boxShadow: 'inset 1px 1px 0 #374151',
              }}
            />
            <span className="text-xs truncate max-w-25 xl:max-w-none">{f.name}</span>
          </button>
        ))}
      </div>

      {/* ── Viewer 2D ── */}
      <div
        className="flex-1 min-h-0 flex flex-col items-center justify-center relative"
        style={{ background: '#0d1117' }}
      >
        {/* Infos */}
        {dims && (
          <div
            className="absolute top-2 left-2 text-[10px] font-mono px-2 py-1 z-10"
            style={{
              background: '#111827',
              color: '#6b7280',
              boxShadow: 'inset 1px 1px 0 #1f2937',
            }}
          >
            {current.name} · {dims.w}×{dims.h}px
          </div>
        )}

        {/* Damier en CSS pur pour voir la transparence */}
        <div
          className="relative flex items-center justify-center overflow-auto"
          style={{
            width: '100%',
            height: '100%',
            backgroundImage: 'repeating-conic-gradient(#1a1a2e 0% 25%, #12121e 0% 50%)',
            backgroundSize: '16px 16px',
          }}
        >
          {current && (
            <img
              key={current.blobUrl}
              src={current.blobUrl}
              alt={current.name}
              onLoad={(e) => {
                const img = e.currentTarget
                setDims({ w: img.naturalWidth, h: img.naturalHeight })
              }}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                imageRendering: 'pixelated',
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

type ContentType = '3d' | 'audio' | 'video' | 'texture' | 'loading' | 'error'

export default function SceneWrapper({ zipUrl }: { zipUrl: string }) {
  const [options, setOptions] = useState<SceneOptions>(defaultSceneOptions)
  const [nodes, setNodes] = useState<NodeInfo[]>([])
  const [overrides, setOverrides] = useState<Record<string, NodeOverride>>({})
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const [modelNames, setModelNames] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('all')

  const [contentType, setContentType] = useState<ContentType>('loading')
  const [mediaFiles, setMediaFiles] = useState<{ name: string; blobUrl: string }[]>([])
  const [errorMsg, setErrorMsg] = useState<string>('')

  const sceneRef = useRef<SceneHandle>(null)

  /* ── Inspecter le ZIP pour connaître le type de contenu ── */
  useEffect(() => {
    if (!zipUrl) {
      setErrorMsg('Aucun fichier ZIP associé à cet item.')
      setContentType('error')
      return
    }
    // Utilise directement l'URL stockee pour l'upload
    const normalizedUrl = zipUrl
    setContentType('loading')

    inspectZip(normalizedUrl)
      .then((multi) => {
        // Contenu audio, vidéo ou texture
        if (multi.mediaType) {
          setContentType(multi.mediaType)
          setMediaFiles(multi.mediaFiles ?? [])
          return
        }

        // Modèles 3D
        setModelNames(multi.modelNames)
        if (multi.modelNames.length === 1) {
          setSelectedModel(multi.modelNames[0])
        } else {
          setSelectedModel('all')
        }
        setContentType('3d')
        multi.dispose()
      })
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : String(err))
        setContentType('error')
      })
  }, [zipUrl])

  const handleOverride = (override: NodeOverride) =>
    setOverrides((prev) => ({ ...prev, [override.id]: override }))

  const handleCapture = (w?: number, h?: number): string | null =>
    sceneRef.current?.captureDataURL(w, h) ?? null

  /* ── Chargement ── */
  if (contentType === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
        <span className="text-white/50 text-sm">Chargement…</span>
      </div>
    )
  }

  /* ── Erreur ── */
  if (contentType === 'error') {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="bg-red-900/40 border border-red-500/40 text-red-300 text-sm px-4 py-3 max-w-xs text-center">
          {errorMsg}
        </div>
      </div>
    )
  }

  /* ── Audio ── */
  if (contentType === 'audio') {
    return (
      <div className="flex flex-1 min-h-0">
        <AudioPlayer files={mediaFiles} />
      </div>
    )
  }

  /* ── Vidéo ── */
  if (contentType === 'video') {
    return (
      <div className="flex flex-1 min-h-0">
        <VideoPlayer files={mediaFiles} />
      </div>
    )
  }

  /* ── Textures ── */
  if (contentType === 'texture') {
    return (
      <div className="flex flex-1 min-h-0">
        <TextureViewer files={mediaFiles} />
      </div>
    )
  }

  /* ── 3D ── */
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex flex-col xl:flex-row flex-1 min-h-0">
        {/* ── Scene ── */}
        <div className="h-[50vh] max-h-[50vh] xl:h-auto xl:max-h-none xl:flex-1 min-h-0 flex flex-col">
          <Scene
            ref={sceneRef}
            zipUrl={zipUrl}
            options={options}
            nodeOverrides={overrides}
            onNodesLoaded={setNodes}
            selectedModel={selectedModel}
          />
        </div>

        {/* ── Options (avec sélecteur de modèle intégré) ── */}
        <div className="shrink-0 w-full xl:w-64 xl:h-full overflow-y-auto">
          <Options
            options={options}
            onChange={setOptions}
            onAdvanced={() => setAdvancedOpen((v) => !v)}
            onCapture={handleCapture}
            modelNames={modelNames}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        </div>
      </div>

      {advancedOpen && (
        <AdvancedPanel
          nodes={nodes}
          overrides={overrides}
          onOverride={handleOverride}
          onClose={() => setAdvancedOpen(false)}
        />
      )}
    </div>
  )
}
