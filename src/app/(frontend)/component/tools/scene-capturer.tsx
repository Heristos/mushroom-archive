'use client'

/* ─────────────────────────────────────────────────────────────────────
   component/tools/scene-capturer.tsx
   Monte une <Scene> hors-écran, attend onNodesLoaded + 10 frames GPU,
   puis capture en 200×140 et appelle onDone.
───────────────────────────────────────────────────────────────────── */

import { useRef, useCallback } from 'react'
import Scene, { SceneHandle } from '@/app/component/scene/scene'
import { SceneOptions } from '@/app/component/scene/scene-options'

interface SceneCapturerProps {
  zipBlobUrl: string
  options: SceneOptions
  onDone: (dataURL: string | null, error?: string) => void
}

export default function SceneCapturer({ zipBlobUrl, options, onDone }: SceneCapturerProps) {
  const sceneRef = useRef<SceneHandle>(null)
  const capturedRef = useRef(false)

  const handleNodesLoaded = useCallback(() => {
    if (capturedRef.current) return
    capturedRef.current = true

    let fc = 0
    const wait = () => {
      if (++fc < 10) { requestAnimationFrame(wait); return }
      try {
        const url = sceneRef.current?.captureDataURL(200, 140) ?? null
        if (!url) { onDone(null, 'captureDataURL retourné null'); return }
        onDone(url)
      } catch (e) {
        onDone(null, e instanceof Error ? e.message : String(e))
      }
    }
    requestAnimationFrame(wait)
  }, [onDone])

  return (
    <div style={{ position: 'fixed', left: -9999, top: -9999, width: 200, height: 140, overflow: 'hidden', pointerEvents: 'none', opacity: 0 }}>
      <Scene
        ref={sceneRef}
        zipUrl={zipBlobUrl}
        options={options}
        nodeOverrides={{}}
        onNodesLoaded={handleNodesLoaded}
        selectedModel={undefined}
      />
    </div>
  )
}
