'use client'

/* ─────────────────────────────────────────────────────────────────────
   icon-generator/page.tsx  (ou icon-generator.tsx)
   Orchestrateur principal — logique de queue + UI grille.
   Les composants réutilisables sont dans component/tools/.
───────────────────────────────────────────────────────────────────── */

import { useRef, useState, useCallback } from 'react'
import JSZip from 'jszip'
import { defaultSceneOptions, SceneOptions } from '@/app/component/scene/scene-options'
import SceneCapturer from '@/app/component/tools/scene-capturer'
import ItemModal, { ItemModalData } from '@/app/component/tools/item-modal'
import {
  WrapMode,
  WrapBtn,
  WrapRow,
  StatusBadge,
  DropZone,
  ProgressBar,
} from '@/app/component/tools/ui'

/* ── Helpers ── */
function buildCaptureOptions(liveOptions: SceneOptions): SceneOptions {
  return {
    ...liveOptions,
    viewMode: 'angular',
    angularAngle: liveOptions.angularAngle ?? 'iso-ne',
    perfectResolution: true,
    autoRotate: false,
  }
}

function dataURLToBytes(dataURL: string): Uint8Array {
  const base64 = dataURL.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/* ── Types ── */
interface FolderItem {
  folderName: string
  zipBlob: Blob
  zipName: string
  status: 'pending' | 'processing' | 'done' | 'error'
  iconDataURL?: string
  error?: string
  tWrap: WrapMode
  sWrap: WrapMode
  liveOptions: SceneOptions
}

/* ─── ModelCard ──────────────────────────────────────────────────── */
function ModelCard({
  item,
  onWrapChange,
  onAlphaModeChange,
  onRegenerate,
  onClick,
}: {
  item: FolderItem
  onWrapChange: (tWrap: WrapMode, sWrap: WrapMode) => void
  onAlphaModeChange: (mode: string) => void
  onRegenerate: () => void
  onClick: () => void
}) {
  const isOpaque = item.liveOptions.alphaMode === 'Opaque'
  const isAntiAlias = item.liveOptions.alphaMode === 'Anti-aliasing'

  return (
    <div
      className="flex flex-col"
      style={{
        background: '#1f2937',
        boxShadow: 'inset 2px 2px 0 #374151, inset -2px -2px 0 #111827',
      }}
    >
      {/* Preview */}
      <div
        className="relative cursor-pointer group"
        style={{
          width: '100%',
          aspectRatio: '200/140',
          background: '#0d1117',
          backgroundImage: 'repeating-conic-gradient(#1a1a2e 0% 25%, #12121e 0% 50%)',
          backgroundSize: '8px 8px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onClick}
      >
        {item.status === 'done' && item.iconDataURL && (
          <img
            src={item.iconDataURL}
            alt={item.folderName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              imageRendering: 'pixelated',
            }}
          />
        )}
        {item.status === 'processing' && (
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
        )}
        {item.status === 'error' && (
          <span className="text-red-400 text-[10px] px-2 text-center leading-tight">
            {item.error ?? 'Erreur'}
          </span>
        )}
        {item.status === 'pending' && <span className="text-gray-700 text-xs">·</span>}

        {/* Hover hint */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <span
            className="text-[9px] font-mono px-2 py-1"
            style={{ background: 'rgba(0,0,0,0.7)', color: '#d1d5db', border: '1px solid #374151' }}
          >
            ⊕ ouvrir
          </span>
        </div>

        {/* Status badge */}
        <div className="absolute top-1 right-1 z-20">
          <StatusBadge status={item.status} />
        </div>
      </div>

      {/* Label */}
      <div className="px-2 pt-1.5 pb-1">
        <p className="text-gray-300 text-xs truncate font-medium">{item.folderName}</p>
        <p className="text-gray-600 text-[10px] truncate">{item.zipName}</p>
      </div>

      {/* Wrap rows + boutons O/A */}
      <div className="px-2 pb-1.5 border-t border-gray-700/50 pt-1.5 flex gap-1.5 items-stretch">
        {/* T + S wrap */}
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-[9px] font-mono w-4 shrink-0">T</span>
            <WrapBtn
              label="rep"
              active={item.tWrap === 'repeat'}
              onClick={() => onWrapChange('repeat', item.sWrap)}
            />
            <WrapBtn
              label="mir"
              active={item.tWrap === 'mirror'}
              onClick={() => onWrapChange('mirror', item.sWrap)}
            />
            <WrapBtn
              label="clamp"
              active={item.tWrap === 'clamp'}
              onClick={() => onWrapChange('clamp', item.sWrap)}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-[9px] font-mono w-4 shrink-0">S</span>
            <WrapBtn
              label="rep"
              active={item.sWrap === 'repeat'}
              onClick={() => onWrapChange(item.tWrap, 'repeat')}
            />
            <WrapBtn
              label="mir"
              active={item.sWrap === 'mirror'}
              onClick={() => onWrapChange(item.tWrap, 'mirror')}
            />
            <WrapBtn
              label="clamp"
              active={item.sWrap === 'clamp'}
              onClick={() => onWrapChange(item.tWrap, 'clamp')}
            />
          </div>
        </div>

        {/* Alpha O / A */}
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={() => onAlphaModeChange('Opaque')}
            title="Alpha: Opaque"
            className="font-mono font-bold text-[10px] leading-none flex items-center justify-center"
            style={{
              width: 20,
              flex: 1,
              background: isOpaque ? '#7c3aed' : '#374151',
              color: isOpaque ? '#fff' : '#6b7280',
              boxShadow: isOpaque
                ? 'inset 1px 1px 0 #a78bfa, inset -1px -1px 0 #4c1d95'
                : 'inset 1px 1px 0 #4b5563, inset -1px -1px 0 #1f2937',
            }}
          >
            O
          </button>
          <button
            onClick={() => onAlphaModeChange('Anti-aliasing')}
            title="Alpha: Anti-aliasing"
            className="font-mono font-bold text-[10px] leading-none flex items-center justify-center"
            style={{
              width: 20,
              flex: 1,
              background: isAntiAlias ? '#0369a1' : '#374151',
              color: isAntiAlias ? '#fff' : '#6b7280',
              boxShadow: isAntiAlias
                ? 'inset 1px 1px 0 #38bdf8, inset -1px -1px 0 #0c4a6e'
                : 'inset 1px 1px 0 #4b5563, inset -1px -1px 0 #1f2937',
            }}
          >
            A
          </button>
        </div>
      </div>

      {/* Regénérer */}
      {(item.status === 'done' || item.status === 'error') && (
        <button
          onClick={onRegenerate}
          className="mx-2 mb-2 py-1 text-[10px] font-mono text-gray-400 hover:text-gray-200 transition-colors"
          style={{
            background: '#374151',
            boxShadow: 'inset 1px 1px 0 #4b5563, inset -1px -1px 0 #1f2937',
          }}
        >
          ↺ regénérer
        </button>
      )}
    </div>
  )
}

/* ── filterToFirstModel : garde uniquement le premier fichier 3D dans un ZIP de modèle ── */
const MODEL_EXTENSIONS = ['.glb', '.gltf', '.fbx', '.obj', '.dae', '.3ds', '.stl']

async function filterToFirstModel(zipBlob: Blob): Promise<Blob> {
  try {
    const buffer = await zipBlob.arrayBuffer()
    const zip = await JSZip.loadAsync(buffer)
    const sortedEntries = Object.entries(zip.files).sort(([a], [b]) => a.localeCompare(b))

    // Find the first 3D model file
    let firstModelPath: string | null = null
    for (const [path, entry] of sortedEntries) {
      if (entry.dir) continue
      const normalized = path.replace(/\\/g, '/').toLowerCase()
      if (normalized.includes('__macosx') || normalized.split('/').pop()?.startsWith('._')) continue
      if (MODEL_EXTENSIONS.some((ext) => normalized.endsWith(ext))) {
        firstModelPath = path
        break
      }
    }

    // If no model found or only one model, return original blob
    if (!firstModelPath) return zipBlob
    const modelPaths = sortedEntries.filter(([path, entry]) => {
      if (entry.dir) return false
      const normalized = path.replace(/\\/g, '/').toLowerCase()
      return MODEL_EXTENSIONS.some((ext) => normalized.endsWith(ext))
    })
    if (modelPaths.length <= 1) return zipBlob

    // Rebuild ZIP keeping only the first model + all non-model files (textures, etc.)
    const newZip = new JSZip()
    for (const [path, entry] of sortedEntries) {
      if (entry.dir) continue
      const normalized = path.replace(/\\/g, '/').toLowerCase()
      if (normalized.includes('__macosx') || normalized.split('/').pop()?.startsWith('._')) continue
      const isModel = MODEL_EXTENSIONS.some((ext) => normalized.endsWith(ext))
      if (isModel && path !== firstModelPath) continue // skip non-first models
      const data = await entry.async('uint8array')
      newZip.file(path, data)
    }

    return await newZip.generateAsync({ type: 'blob' })
  } catch {
    return zipBlob // fallback: return original on error
  }
}

/* ─── IconGenerator ──────────────────────────────────────────────── */
export default function IconGenerator() {
  const [items, setItems] = useState<FolderItem[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [currentIndex, setCurrentIndex] = useState<number | null>(null)
  const [currentBlobUrl, setCurrentBlobUrl] = useState<string | null>(null)
  const [regenQueue, setRegenQueue] = useState<number[]>([])
  const [modalIndex, setModalIndex] = useState<number | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const originalFileRef = useRef<File | null>(null)
  const resultsRef = useRef<FolderItem[]>([])

  const defaultLiveOptions: SceneOptions = { ...defaultSceneOptions, autoRotate: true }

  /* ── Parse ZIP ── */
  const handleFile = useCallback(async (file: File) => {
    originalFileRef.current = file
    setDone(false)
    setRunning(false)
    setCurrentIndex(null)
    setCurrentBlobUrl(null)
    setRegenQueue([])
    setModalIndex(null)
    resultsRef.current = []

    const buffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(buffer)
    const found: FolderItem[] = []

    // Structure attendue : main.zip → sous-dossier/ → sous-sous-dossier/ → model.zip
    // On prend uniquement le PREMIER .zip rencontré par sous-dossier de premier niveau.
    const seenFolders = new Set<string>()

    // Trier les chemins pour garantir un ordre déterministe (alphabétique)
    const sortedEntries = Object.entries(zip.files).sort(([a], [b]) => a.localeCompare(b))

    for (const [path, entry] of sortedEntries) {
      if (entry.dir) continue
      const normalized = path.replace(/\\/g, '/')
      const parts = normalized.split('/')
      const basename = parts[parts.length - 1]
      if (!basename.toLowerCase().endsWith('.zip')) continue
      if (parts.some((p) => p.toLowerCase() === '__macosx') || basename.startsWith('._')) continue

      // Le sous-dossier de premier niveau est toujours parts[0]
      const folderName = parts.length > 1 ? parts[0] : basename.replace(/\.zip$/i, '')

      // Si on a déjà pris un zip pour ce sous-dossier, on ignore les suivants
      if (seenFolders.has(folderName)) continue
      seenFolders.add(folderName)

      const blob = await entry.async('blob')

      // Filter the model ZIP to keep only the first 3D model file found
      const filteredBlob = await filterToFirstModel(blob)

      found.push({
        folderName,
        zipBlob: filteredBlob,
        zipName: basename,
        status: 'pending',
        tWrap: 'mirror',
        sWrap: 'mirror',
        liveOptions: { ...defaultLiveOptions },
      })
    }

    if (found.length === 0) {
      alert('Aucun ZIP trouvé dans les sous-dossiers.')
      return
    }
    resultsRef.current = found
    setItems([...found])
  }, []) // eslint-disable-line

  /* ── Mutations d'items ── */
  const updateItem = useCallback((index: number, patch: Partial<FolderItem>) => {
    const list = resultsRef.current
    list[index] = { ...list[index], ...patch }
    resultsRef.current = list
    setItems([...list])
  }, [])

  const handleWrapChange = useCallback(
    (index: number, tWrap: WrapMode, sWrap: WrapMode) => {
      updateItem(index, {
        tWrap,
        sWrap,
        liveOptions: { ...resultsRef.current[index].liveOptions, tWrap, sWrap },
      })
    },
    [updateItem],
  )

  const handleAlphaModeChange = useCallback(
    (index: number, mode: string) => {
      updateItem(index, {
        liveOptions: { ...resultsRef.current[index].liveOptions, alphaMode: mode },
      })
    },
    [updateItem],
  )

  const handleLiveOptionsChange = useCallback(
    (index: number, opts: SceneOptions) => {
      updateItem(index, {
        liveOptions: opts,
        tWrap: opts.tWrap as WrapMode,
        sWrap: opts.sWrap as WrapMode,
      })
    },
    [updateItem],
  )

  /* ── Queue de génération ── */
  const startQueue = useCallback((queue: number[]) => {
    if (queue.length === 0) return
    const list = resultsRef.current
    const firstIdx = queue[0]
    list[firstIdx] = { ...list[firstIdx], status: 'processing' }
    resultsRef.current = list
    setItems([...list])
    const blobUrl = URL.createObjectURL(list[firstIdx].zipBlob)
    setCurrentBlobUrl(blobUrl)
    setCurrentIndex(firstIdx)
    setRegenQueue(queue)
    setRunning(true)
    setDone(false)
  }, [])

  const runGeneration = useCallback(() => {
    if (resultsRef.current.length === 0) return
    startQueue(resultsRef.current.map((_, i) => i))
  }, [startQueue])

  const handleRegenerate = useCallback(
    (index: number) => {
      updateItem(index, { status: 'pending', iconDataURL: undefined, error: undefined })
      setRunning((r) => {
        if (!r) {
          startQueue([index])
        } else {
          setRegenQueue((q) => (q.includes(index) ? q : [...q, index]))
        }
        return r
      })
    },
    [updateItem, startQueue],
  )

  const handleCaptureDone = useCallback((dataURL: string | null, error?: string) => {
    setCurrentIndex((prevIdx) => {
      if (prevIdx === null) return null
      setCurrentBlobUrl((prevUrl) => {
        if (prevUrl) URL.revokeObjectURL(prevUrl)
        return null
      })
      const list = resultsRef.current
      list[prevIdx] = {
        ...list[prevIdx],
        status: dataURL ? 'done' : 'error',
        iconDataURL: dataURL ?? undefined,
        error,
      }
      resultsRef.current = list
      setItems([...list])
      setRegenQueue((prevQueue) => {
        const nextQueue = prevQueue.slice(prevQueue.indexOf(prevIdx) + 1)
        if (nextQueue.length > 0) {
          const nextIdx = nextQueue[0]
          list[nextIdx] = { ...list[nextIdx], status: 'processing' }
          resultsRef.current = list
          setItems([...list])
          const nextBlobUrl = URL.createObjectURL(list[nextIdx].zipBlob)
          setCurrentBlobUrl(nextBlobUrl)
          setTimeout(() => setCurrentIndex(nextIdx), 0)
          return nextQueue
        } else {
          setRunning(false)
          setDone(true)
          return []
        }
      })
      return null
    })
  }, [])

  const regenerateAll = useCallback(() => {
    const list = resultsRef.current
    list.forEach((item, i) => {
      list[i] = { ...item, status: 'pending', iconDataURL: undefined, error: undefined }
    })
    resultsRef.current = list
    setItems([...list])
    setDone(false)
    startQueue(list.map((_, i) => i))
  }, [startQueue])

  const downloadResult = useCallback(async () => {
    const file = originalFileRef.current
    if (!file) return
    const buffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(buffer)
    for (const item of resultsRef.current) {
      if (item.status !== 'done' || !item.iconDataURL) continue
      zip.file(`${item.folderName}/icon.webp`, dataURLToBytes(item.iconDataURL))
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `icons_${file.name}`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const reset = useCallback(() => {
    setCurrentBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setItems([])
    setDone(false)
    setRunning(false)
    setCurrentIndex(null)
    setRegenQueue([])
    setModalIndex(null)
    resultsRef.current = []
    originalFileRef.current = null
  }, [])

  /* ── Dérivés ── */
  const currentItem = currentIndex !== null ? resultsRef.current[currentIndex] : null
  const currentCaptureOptions = currentItem
    ? buildCaptureOptions(currentItem.liveOptions)
    : buildCaptureOptions({ ...defaultSceneOptions })

  const doneCount = items.filter((i) => i.status === 'done').length
  const errorCount = items.filter((i) => i.status === 'error').length
  const modalItem = modalIndex !== null ? items[modalIndex] : null

  /* ── Conversion FolderItem → ItemModalData ── */
  const toModalData = (item: FolderItem): ItemModalData => ({
    folderName: item.folderName,
    zipName: item.zipName,
    zipBlob: item.zipBlob,
    iconDataURL: item.iconDataURL,
    tWrap: item.tWrap,
    sWrap: item.sWrap,
    liveOptions: item.liveOptions,
  })

  return (
    <>
      {/* Capture hors-écran */}
      {currentBlobUrl && currentIndex !== null && (
        <SceneCapturer
          key={currentBlobUrl}
          zipBlobUrl={currentBlobUrl}
          options={currentCaptureOptions}
          onDone={handleCaptureDone}
        />
      )}

      {/* Modal */}
      {modalItem !== null && modalIndex !== null && (
        <ItemModal
          key={modalItem.folderName}
          item={toModalData(modalItem)}
          onClose={() => setModalIndex(null)}
          onWrapChange={(t, s) => handleWrapChange(modalIndex, t, s)}
          onLiveOptionsChange={(opts) => handleLiveOptionsChange(modalIndex, opts)}
          onRegenerate={() => {
            handleRegenerate(modalIndex)
            setModalIndex(null)
          }}
        />
      )}

      <div className="flex flex-col w-full h-full min-h-0" style={{ background: '#111827' }}>
        {/* Header */}
        <div
          className="flex items-center px-4 h-14 shrink-0"
          style={{
            background: 'var(--color-main)',
            boxShadow: 'inset 3px 3px 0 var(--light-main), inset -3px -3px 0 var(--dark-main)',
          }}
        >
          <span className="text-white font-semibold">Icon Generator</span>
          {items.length > 0 && (
            <span className="ml-3 text-white/50 text-xs font-mono">
              {items.length} modèle{items.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex flex-col flex-1 min-h-0 p-4 gap-4 overflow-y-auto">
          {/* Drop zone */}
          {items.length === 0 && (
            <DropZone
              onFile={handleFile}
              hint="Déposer un ZIP ici"
              subHint="ZIP → dossiers/ → modèle.zip"
            />
          )}

          {/* Changer de fichier */}
          {items.length > 0 && !running && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                  e.target.value = ''
                }}
              />
              <button
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 text-left"
                style={{ background: '#1f2937', boxShadow: 'inset 1px 1px 0 #374151' }}
              >
                <span>↺</span>
                <span>Changer de fichier</span>
              </button>
            </>
          )}

          {/* Progress bar */}
          {running && (
            <ProgressBar
              current={doneCount + errorCount}
              total={items.length}
              label={`Génération… ${doneCount + errorCount}/${items.length}${currentIndex !== null ? ` → ${items[currentIndex]?.folderName}` : ''}`}
            />
          )}

          {/* Grille */}
          {items.length > 0 && (
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
            >
              {items.map((item, index) => (
                <ModelCard
                  key={`${item.folderName}-${item.zipName}`}
                  item={item}
                  onWrapChange={(t, s) => handleWrapChange(index, t, s)}
                  onAlphaModeChange={(mode) => handleAlphaModeChange(index, mode)}
                  onRegenerate={() => handleRegenerate(index)}
                  onClick={() => setModalIndex(index)}
                />
              ))}
            </div>
          )}

          {/* Résumé */}
          {done && (
            <div
              className="text-xs px-3 py-2 font-mono"
              style={{
                background: errorCount > 0 ? '#1c1205' : '#052e16',
                color: errorCount > 0 ? '#fbbf24' : '#4ade80',
                boxShadow: 'inset 1px 1px 0 #374151',
              }}
            >
              ✓ {doneCount} icône{doneCount > 1 ? 's' : ''} générée{doneCount > 1 ? 's' : ''}
              {errorCount > 0 && ` · ${errorCount} erreur${errorCount > 1 ? 's' : ''}`}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-auto pt-2 flex-wrap">
            {items.length > 0 && !running && !done && (
              <button
                onClick={runGeneration}
                className="flex-1 py-2 text-sm font-semibold text-white"
                style={{
                  background: 'var(--color-main)',
                  boxShadow:
                    'inset 2px 2px 0 var(--light-main), inset -2px -2px 0 var(--dark-main)',
                }}
              >
                ▶ Générer les icônes
              </button>
            )}
            {done && (
              <>
                {doneCount > 0 && (
                  <button
                    onClick={downloadResult}
                    className="flex-1 py-2 text-sm font-semibold text-gray-200"
                    style={{
                      background: '#4b5563',
                      boxShadow: 'inset 2px 2px 0 #6b7280, inset -2px -2px 0 #1f2937',
                    }}
                  >
                    ↓ Télécharger ZIP
                  </button>
                )}
                <button
                  onClick={regenerateAll}
                  className="flex-1 py-2 text-sm font-semibold text-gray-200"
                  style={{
                    background: 'var(--color-main)',
                    boxShadow:
                      'inset 2px 2px 0 var(--light-main), inset -2px -2px 0 var(--dark-main)',
                  }}
                >
                  ↺ Tout regénérer
                </button>
              </>
            )}
            {(done || items.length > 0) && !running && (
              <button
                onClick={reset}
                className="py-2 px-3 text-sm text-gray-400"
                style={{
                  background: '#374151',
                  boxShadow: 'inset 2px 2px 0 #4b5563, inset -2px -2px 0 #1f2937',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
