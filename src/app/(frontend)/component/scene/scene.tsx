'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { NodeInfo, NodeOverride } from '@/app/component/scene/scene-bridge'
import { SceneOptions } from '@/app/component/scene/scene-options'
import { inspectZip } from '@/app/component/scene/scene-loader'
import { applyOptions, applyOverrides } from '@/app/component/scene/scene-utils'
import { AAPipeline, createAAPipeline, renderFrame } from '@/app/component/scene/scene-aa'

export interface SceneHandle {
  /** Capture le rendu courant et retourne un dataURL PNG.
   *  Si w/h sont fournis, resize → render → restore automatiquement. */
  captureDataURL(w?: number, h?: number): string | null
}

interface SceneProps {
  zipUrl: string
  options: SceneOptions
  nodeOverrides: Record<string, NodeOverride>
  onNodesLoaded: (nodes: NodeInfo[]) => void
  /** Nom du modèle à charger, ou "all" pour tous en spirale */
  selectedModel?: string
}

/* ─── Env map procédurale style studio ──────────────────────────── */
function buildStudioEnvMap(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()

  const envScene = new THREE.Scene()
  envScene.background = new THREE.Color(0x080810)

  const key = new THREE.PointLight(0xfff5e0, 8, 0)
  key.position.set(6, 8, 4)
  envScene.add(key)

  const fill = new THREE.PointLight(0x8090ff, 3, 0)
  fill.position.set(-5, 2, -3)
  envScene.add(fill)

  const rim = new THREE.PointLight(0xffffff, 5, 0)
  rim.position.set(0, 4, -8)
  envScene.add(rim)

  const bounce = new THREE.PointLight(0xddeeff, 1.5, 0)
  bounce.position.set(0, -3, 0)
  envScene.add(bounce)

  const envMap = pmrem.fromScene(envScene).texture
  pmrem.dispose()
  return envMap
}

const Scene = forwardRef<SceneHandle, SceneProps>(function Scene(
  { zipUrl, options, nodeOverrides, onNodesLoaded, selectedModel },
  ref,
) {
  const mountRef = useRef<HTMLDivElement>(null)

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelRef = useRef<THREE.Object3D | null>(null)
  const lightsRef = useRef<THREE.Light[]>([])
  const frameRef = useRef<number>(0)
  const blobUrlsRef = useRef<string[]>([])
  const pipelineRef = useRef<AAPipeline | null>(null)

  const viewModeShaders = useRef<Map<THREE.MeshStandardMaterial, string>>(new Map())
  const prevViewMode = useRef<string>(options.viewMode)

  const optionsRef = useRef(options)
  const overridesRef = useRef(nodeOverrides)
  optionsRef.current = options
  overridesRef.current = nodeOverrides

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  /* ── Expose captureDataURL via ref ─────────────────── */
  useImperativeHandle(ref, () => ({
    captureDataURL(w?: number, h?: number): string | null {
      const renderer = rendererRef.current
      const scene = sceneRef.current
      const camera = cameraRef.current
      const el = mountRef.current
      if (!renderer || !scene || !camera || !el) return null

      const origW = el.clientWidth
      const origH = el.clientHeight
      const capW = w ?? origW
      const capH = h ?? origH

      const origBackground = scene.background
      scene.background = null
      const grid = scene.children.find((c) => c instanceof THREE.GridHelper)
      if (grid) grid.visible = false

      const origPos = camera.position.clone()
      const origQuat = camera.quaternion.clone()
      const origAspect = camera.aspect
      const origFov = camera.fov

      const opts = optionsRef.current

      let dataURL: string

      if (opts.viewMode === 'angular') {
        // ── Caméra orthographique pour fit pixel-perfect ──
        const angle = opts.angularAngle ?? 'iso-ne'

        const directions: Record<string, [number, number, number]> = {
          top: [0, 1, 0.001],
          front: [0, 0, 1],
          back: [0, 0, -1],
          right: [1, 0, 0],
          left: [-1, 0, 0],
          'iso-ne': [1, 0.6, 1],
          'iso-nw': [-1, 0.6, 1],
          'iso-se': [1, 0.6, -1],
          'iso-sw': [-1, 0.6, -1],
        }

        const dir = new THREE.Vector3(...(directions[angle] ?? directions['iso-ne'])).normalize()

        // Bounding box du modèle
        const model = modelRef.current
        const center = new THREE.Vector3(0, 1, 0)
        let boxRadius = 2
        let box = new THREE.Box3()

        if (model) {
          box = new THREE.Box3().setFromObject(model)
          box.getCenter(center)
          const size = box.getSize(new THREE.Vector3())
          boxRadius = size.length() / 2
        }

        // Créer une caméra orthographique temporaire
        const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, boxRadius * 100)
        ortho.position.copy(center).addScaledVector(dir, boxRadius * 10)
        ortho.lookAt(center)
        ortho.updateMatrixWorld()

        // Projeter les 8 coins en espace caméra orthographique
        // pour mesurer l'étendue exacte du modèle vu depuis cet angle
        const corners = [
          new THREE.Vector3(box.min.x, box.min.y, box.min.z),
          new THREE.Vector3(box.max.x, box.min.y, box.min.z),
          new THREE.Vector3(box.min.x, box.max.y, box.min.z),
          new THREE.Vector3(box.max.x, box.max.y, box.min.z),
          new THREE.Vector3(box.min.x, box.min.y, box.max.z),
          new THREE.Vector3(box.max.x, box.min.y, box.max.z),
          new THREE.Vector3(box.min.x, box.max.y, box.max.z),
          new THREE.Vector3(box.max.x, box.max.y, box.max.z),
        ]

        const camMat = ortho.matrixWorldInverse
        let minX = Infinity,
          maxX = -Infinity
        let minY = Infinity,
          maxY = -Infinity
        let minZ = Infinity,
          maxZ = -Infinity

        for (const c of corners) {
          const local = c.clone().applyMatrix4(camMat)
          minX = Math.min(minX, local.x)
          maxX = Math.max(maxX, local.x)
          minY = Math.min(minY, local.y)
          maxY = Math.max(maxY, local.y)
          minZ = Math.min(minZ, local.z)
          maxZ = Math.max(maxZ, local.z)
        }

        const extentX = (maxX - minX) / 2
        const extentY = (maxY - minY) / 2
        const aspect = capW / capH

        // Ajuster les frustum bounds pour que le modèle remplisse exactement le cadre
        // On prend la contrainte la plus large (fit tight)
        let halfW: number
        let halfH: number
        if (extentX / aspect >= extentY) {
          halfW = extentX
          halfH = extentX / aspect
        } else {
          halfH = extentY
          halfW = extentY * aspect
        }

        // Marge de 0% — plein cadre
        const margin = 1.0
        halfW *= margin
        halfH *= margin

        ortho.left = -halfW
        ortho.right = halfW
        ortho.top = halfH
        ortho.bottom = -halfH
        ortho.near = 0.01
        ortho.far = boxRadius * 100
        ortho.updateProjectionMatrix()

        renderer.setPixelRatio(1)
        renderer.setSize(capW, capH)
        renderer.setClearAlpha(0)
        renderer.autoClear = true
        renderer.render(scene, ortho)
        renderer.autoClear = false

        dataURL = renderer.domElement.toDataURL('image/webp', 1.0)
      } else {
        // ── Mode default : rendu perspective normal ──
        renderer.setPixelRatio(1)
        renderer.setSize(capW, capH)
        camera.aspect = capW / capH
        camera.updateProjectionMatrix()

        renderer.setClearAlpha(0)
        renderer.autoClear = true
        renderer.render(scene, camera)
        renderer.autoClear = false

        dataURL = renderer.domElement.toDataURL('image/webp', 1.0)
      }

      // Note : le canvas WebGL ne contient pas de métadonnées EXIF

      scene.background = origBackground
      if (grid) grid.visible = true

      camera.position.copy(origPos)
      camera.quaternion.copy(origQuat)
      camera.aspect = origAspect
      camera.fov = origFov

      renderer.setPixelRatio(window.devicePixelRatio)

      renderer.setSize(origW, origH)
      camera.updateProjectionMatrix()
      pipelineRef.current?.resize(origW, origH)

      return dataURL
    },
  }))

  /* ── INIT Three.js ─────────────────────────────────── */
  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    RectAreaLightUniformsLib.init()

    const useNativeAA = optionsRef.current.aaMode === 'builtin'
    const renderer = new THREE.WebGLRenderer({
      antialias: useNativeAA,
      alpha: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.sortObjects = true
    renderer.autoClear = false
    el.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0f)

    const envMap = buildStudioEnvMap(renderer)
    scene.environment = envMap
    scene.environmentIntensity = 1.0
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.01, 10000)
    camera.position.set(0, 2, 5)
    cameraRef.current = camera

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 0.1
    controls.maxDistance = 5000
    controls.target.set(0, 1, 0)
    controlsRef.current = controls

    const ambient = new THREE.AmbientLight(0xffffff, 0.3 * 1.2)
    scene.add(ambient)

    const dir1 = new THREE.DirectionalLight(0xfff5e0, 0.7 * 3.0)
    dir1.position.set(5, 10, 7)
    dir1.castShadow = true
    dir1.shadow.mapSize.width = 2048
    dir1.shadow.mapSize.height = 2048
    dir1.shadow.camera.near = 0.1
    dir1.shadow.camera.far = 50
    dir1.shadow.bias = -0.001
    scene.add(dir1)

    const dir2 = new THREE.DirectionalLight(0x8090ff, 0.7 * 0.4)
    dir2.position.set(-5, -3, -5)
    scene.add(dir2)

    lightsRef.current = [ambient, dir1, dir2]

    const grid = new THREE.GridHelper(100, 100, 0xffffff, 0x888888)
    ;(grid.material as THREE.Material).opacity = 0.15
    ;(grid.material as THREE.Material).transparent = true
    scene.add(grid)

    pipelineRef.current = createAAPipeline(el.clientWidth, el.clientHeight)

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      controls.update()
      renderFrame(
        renderer,
        scene,
        camera,
        optionsRef.current,
        pipelineRef.current,
        overridesRef.current,
      )
    }
    animate()

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      const h = el.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      pipelineRef.current?.resize(w, h)
    })
    ro.observe(el)

    return () => {
      cancelAnimationFrame(frameRef.current)
      ro.disconnect()
      pipelineRef.current?.dispose()
      envMap.dispose()
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  /* ── LOAD MODEL ─────────────────────────────────────── */
  useEffect(() => {
    if (!zipUrl) return
    let cancelled = false

    setStatus('loading')
    blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    blobUrlsRef.current = []
    viewModeShaders.current.clear()

    if (modelRef.current && sceneRef.current) {
      sceneRef.current.remove(modelRef.current)
      modelRef.current = null
    }

    inspectZip(zipUrl)
      .then((multi) => {
        // selectedModel undefined ou "all" → tous les modèles
        const target =
          selectedModel === undefined || selectedModel === 'all' ? 'all' : selectedModel
        return multi.load(target).then((result) => {
          multi.dispose()
          return result
        })
      })
      .then(({ object, nodes, blobUrls }) => {
        if (cancelled) {
          blobUrls.forEach((u) => URL.revokeObjectURL(u))
          return
        }

        blobUrlsRef.current = blobUrls
        sceneRef.current!.add(object)
        modelRef.current = object

        applyOptions(
          object,
          lightsRef.current,
          optionsRef.current,
          viewModeShaders.current,
          overridesRef.current,
        )
        applyOverrides(object, overridesRef.current, optionsRef.current.transparencyFix)

        // Repositionner la caméra selon le mode
        if (selectedModel === 'all') {
          cameraRef.current!.position.set(0, 6, 12)
          controlsRef.current!.target.set(0, 1, 0)
        } else {
          cameraRef.current!.position.set(0, 2, 5)
          controlsRef.current!.target.set(0, 1, 0)
        }
        controlsRef.current!.update()

        onNodesLoaded(nodes)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : String(err))
          setStatus('error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [zipUrl, selectedModel]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── OPTIONS CHANGES ────────────────────────────────── */
  useEffect(() => {
    if (!modelRef.current) return
    if (options.viewMode !== prevViewMode.current) {
      viewModeShaders.current.clear()
      prevViewMode.current = options.viewMode
    }
    applyOptions(
      modelRef.current,
      lightsRef.current,
      options,
      viewModeShaders.current,
      overridesRef.current,
    )
  }, [options])

  /* ── OVERRIDE CHANGES ───────────────────────────────── */
  useEffect(() => {
    if (!modelRef.current) return
    applyOverrides(modelRef.current, nodeOverrides, optionsRef.current.transparencyFix)
  }, [nodeOverrides])

  /* ── AUTO ROTATE ─────────────────────────────────────── */
  useEffect(() => {
    if (!controlsRef.current) return
    controlsRef.current.autoRotate = options.autoRotate
    controlsRef.current.autoRotateSpeed = 1.5
  }, [options.autoRotate])

  /* ── JSX ─────────────────────────────────────────────── */
  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex items-center bg-(--color-main) p-3 h-14 shrink-0 shadow-[inset_3px_3px_0_var(--light-main),inset_-3px_-3px_0_var(--dark-main)]">
        <span className="text-white font-semibold">Scene</span>
        <div className="ml-auto flex items-center gap-3">
          {options.aaMode === 'post' && (
            <span className="text-xs text-white/30 font-mono">AA post</span>
          )}
          {options.transparencyFix && (
            <span className="text-xs text-white/30 font-mono">T-fix</span>
          )}
          {status === 'ready' && <span className="text-xs text-white/40 font-mono">● ready</span>}
        </div>
      </div>

      <div className="flex-1 min-h-0 p-1 bg-gray-700 shadow-[inset_3px_3px_0_var(--dark-main),inset_-3px_-3px_0_var(--light-main)] relative overflow-hidden">
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 pointer-events-none">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
            <span className="text-white/50 text-sm">Chargement du modèle…</span>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-red-900/40 border border-red-500/40 text-red-300 text-sm px-4 py-3 max-w-xs text-center">
              {errorMsg}
            </div>
          </div>
        )}
        <div ref={mountRef} className="absolute inset-0" style={{ cursor: 'grab' }} />
      </div>
    </div>
  )
})

export default Scene
