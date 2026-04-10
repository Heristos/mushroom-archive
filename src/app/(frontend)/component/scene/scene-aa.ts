import * as THREE from 'three'

/* ═══════════════════════════════════════════════════════════════
   SCENE-AA.TS  —  Anti-aliasing post-process + transparency fix
   ═══════════════════════════════════════════════════════════════

   Deux mécanismes complémentaires :

   1. POST-PROCESS AA (aaMode = "post")
      ─────────────────────────────────
      Pass 1 → rtColor   : rendu scène RGBA avec blending actif
      Pass 2 → écran     : shader restaure alpha=1 sur les pixels de bord AA

   2. TRANSPARENCY FIX (transparencyFix = true)
      ───────────────────────────────────────────
      Basé sur les renderOrder — approche propre sans manipulation de visibilité :
        renderOrder 0   → opaques  (depthWrite ON, rendu en premier)
        renderOrder 100 → transparents triés par distance caméra (depthWrite OFF)
      Les opaques écrivent le depth buffer en premier, les transparents
      se blendent par-dessus dans le bon ordre back-to-front.

   ═══════════════════════════════════════════════════════════════ */

/* ─── Vertex shader full-screen quad ───────────────────────── */
const VERT_QUAD = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/* ─── Fragment shader post-process AA ──────────────────────── */
const FRAG_POST = /* glsl */ `
precision highp float;

uniform sampler2D u_colorTex;
uniform vec2      u_resolution;

varying vec2 vUv;

const float COVERAGE_MIN = 0.01;

void main() {
  vec4 col = texture2D(u_colorTex, vUv);

  // Fond vide
  if (col.a < COVERAGE_MIN) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // Pixel de bord AA (objet opaque partiellement couvert)
  // → unpremultiply + restaurer alpha=1
  vec3 rgb = col.a > 0.001
    ? clamp(col.rgb / col.a, 0.0, 1.0)
    : col.rgb;
  gl_FragColor = vec4(rgb, 1.0);
}
`

/* ─── Pipeline AA ───────────────────────────────────────────── */

export interface AAPipeline {
  rtColor: THREE.WebGLRenderTarget
  rtIntent: THREE.WebGLRenderTarget
  postScene: THREE.Scene
  postCamera: THREE.OrthographicCamera
  dispose: () => void
  resize: (w: number, h: number) => void
}

export function createAAPipeline(width: number, height: number): AAPipeline {
  const rtColor = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
  })

  const rtIntent = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RedFormat,
    type: THREE.FloatType,
  })

  const postMat = new THREE.ShaderMaterial({
    uniforms: {
      u_colorTex: { value: rtColor.texture },
      u_resolution: { value: new THREE.Vector2(width, height) },
    },
    vertexShader: VERT_QUAD,
    fragmentShader: FRAG_POST,
    depthTest: false,
    depthWrite: false,
  })

  const postScene = new THREE.Scene()
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat))

  return {
    rtColor,
    rtIntent,
    postScene,
    postCamera,
    resize(w, h) {
      rtColor.setSize(w, h)
      rtIntent.setSize(w, h)
      ;(postMat.uniforms.u_resolution.value as THREE.Vector2).set(w, h)
    },
    dispose() {
      rtColor.dispose()
      rtIntent.dispose()
      postMat.dispose()
    },
  }
}

/* ─── Opaque alpha clamp ─────────────────────────────────────
   Force diffuseColor.a = 1.0 dans le shader pour que les textures
   RGBA ne créent pas de trous sur les maillages opaques.
   ─────────────────────────────────────────────────────────── */

export function enableOpaqueAlphaClamp(mat: THREE.MeshStandardMaterial) {
  if (mat.userData._opaqueAlphaClamp) return

  mat.userData._opaqueAlphaClamp = true
  mat.userData._origOnBeforeCompile = mat.onBeforeCompile
  mat.userData._origCacheKey = mat.customProgramCacheKey

  mat.onBeforeCompile = (shader) => {
    if (typeof mat.userData._origOnBeforeCompile === 'function') {
      mat.userData._origOnBeforeCompile.call(mat, shader)
    }
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <alphatest_fragment>',
      'diffuseColor.a = 1.0;\n#include <alphatest_fragment>',
    )
  }

  mat.customProgramCacheKey = () => {
    const base =
      typeof mat.userData._origCacheKey === 'function' ? mat.userData._origCacheKey.call(mat) : ''
    return `${base}|opaqueAlphaClamp`
  }
}

export function disableOpaqueAlphaClamp(mat: THREE.MeshStandardMaterial) {
  if (!mat.userData._opaqueAlphaClamp) return

  mat.onBeforeCompile =
    typeof mat.userData._origOnBeforeCompile === 'function'
      ? mat.userData._origOnBeforeCompile
      : () => {}

  if (typeof mat.userData._origCacheKey === 'function') {
    mat.customProgramCacheKey = mat.userData._origCacheKey
  } else {
    // @ts-expect-error — reset to default
    delete mat.customProgramCacheKey
  }

  delete mat.userData._opaqueAlphaClamp
  delete mat.userData._origOnBeforeCompile
  delete mat.userData._origCacheKey
}

/* ─── Alpha mode application ─────────────────────────────────── */

function matHasAlphaTexture(mat: THREE.MeshStandardMaterial): boolean {
  return (['map', 'alphaMap'] as const).some((key) => {
    const tex = mat[key] as THREE.Texture | null
    return !!(
      tex &&
      (tex.format === THREE.RGBAFormat || tex.format === THREE.RGBA_S3TC_DXT5_Format)
    )
  })
}

export type AlphaMode = 'opaque' | 'mask' | 'anti-alias' | 'blend'

export function applyAlphaModeToMat(
  mat: THREE.MeshStandardMaterial,
  mode: string,
  opacity: number,
  transparencyFix: boolean,
) {
  const hasAlpha = matHasAlphaTexture(mat)

  if (mat.userData._origOpacity === undefined) {
    mat.userData._origOpacity = mat.opacity
    mat.userData._origTransparent = mat.transparent
    mat.userData._origAlphaTest = mat.alphaTest || 0
  }

  mat.blending = THREE.NormalBlending
  const m = mode.toLowerCase() as AlphaMode

  if (m === 'blend') {
    disableOpaqueAlphaClamp(mat)
    mat.opacity = opacity < 1 ? opacity : hasAlpha ? 0.99 : opacity
    mat.transparent = true
    mat.alphaTest = hasAlpha ? 0.02 : 0
    mat.depthWrite = false // ← clé : pas d'écriture depth pour les transparents
    mat.depthTest = true
    mat.needsUpdate = true
    return
  }

  if (m === 'mask') {
    disableOpaqueAlphaClamp(mat)
    mat.opacity = 1
    mat.transparent = false
    mat.alphaTest = hasAlpha ? 0.5 : 0
    mat.depthWrite = true
    mat.needsUpdate = true
    return
  }

  if (m === 'anti-alias') {
    disableOpaqueAlphaClamp(mat)
    mat.opacity = 1
    mat.transparent = false
    mat.alphaTest = hasAlpha ? 0.01 : 0
    mat.depthWrite = true
    mat.needsUpdate = true
    return
  }

  // Opaque
  enableOpaqueAlphaClamp(mat)
  mat.opacity = 1
  mat.transparent = false
  mat.alphaTest = 0
  mat.depthWrite = true
  mat.needsUpdate = true
}

/* ─── Polygon offset (anti z-fight) ─────────────────────────── */

export function applyPolygonOffset(mat: THREE.Material, enabled: boolean, factor = 1, units = 1) {
  if (!mat.userData._polyBase) {
    mat.userData._polyBase = {
      polygonOffset: mat.polygonOffset,
      polygonOffsetFactor: (mat as any).polygonOffsetFactor ?? 0,
      polygonOffsetUnits: (mat as any).polygonOffsetUnits ?? 0,
    }
  }

  if (enabled) {
    mat.polygonOffset = true
    ;(mat as any).polygonOffsetFactor = factor
    ;(mat as any).polygonOffsetUnits = units
  } else {
    const b = mat.userData._polyBase
    mat.polygonOffset = b.polygonOffset
    ;(mat as any).polygonOffsetFactor = b.polygonOffsetFactor
    ;(mat as any).polygonOffsetUnits = b.polygonOffsetUnits
  }
}

/* ─── assignRenderOrders : cœur du transparency fix ──────────
   Stratégie par renderOrder — clean, sans manipuler la visibilité :

   - Si le mesh a un override renderOrder manuel → on le respecte toujours
   - Opaques sans override  → renderOrder = 0   (depth write ON, rendus en premier)
   - Transparents sans override → renderOrder = 100 + index trié back-to-front
   ─────────────────────────────────────────────────────────── */

export function assignRenderOrders(
  scene: THREE.Scene,
  camera: THREE.Camera,
  enabled: boolean,
  overrides: Record<string, { renderOrder?: number }> = {},
) {
  if (!enabled) {
    scene.traverseVisible((node) => {
      if (!(node instanceof THREE.Mesh)) return
      const ov = overrides[node.uuid]
      // Même sans transparencyFix, on respecte les overrides manuels
      node.renderOrder = ov?.renderOrder ?? 0
    })
    return
  }

  const worldPos = new THREE.Vector3()
  const transparent: { mesh: THREE.Mesh; dist: number }[] = []

  scene.traverseVisible((node) => {
    if (!(node instanceof THREE.Mesh) || !node.material) return

    const ov = overrides[node.uuid]

    // Override manuel explicite → on ne touche pas au renderOrder
    if (ov?.renderOrder !== undefined) {
      node.renderOrder = ov.renderOrder
      return
    }

    const mats = Array.isArray(node.material)
      ? (node.material as THREE.Material[])
      : [node.material as THREE.Material]

    const isTransparent = mats.some((m) => (m as THREE.Material).transparent === true)

    if (isTransparent) {
      node.getWorldPosition(worldPos)
      transparent.push({
        mesh: node,
        dist: camera.position.distanceToSquared(worldPos),
      })
    } else {
      node.renderOrder = 0
    }
  })

  // Trier back-to-front
  transparent.sort((a, b) => b.dist - a.dist)
  transparent.forEach(({ mesh }, i) => {
    mesh.renderOrder = 100 + i
  })
}

/* ─── renderFrame : point d'entrée unique de la boucle ─────── */

export function renderFrame(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: { aaMode: string; transparencyFix: boolean },
  pipeline: AAPipeline | null,
  overrides: Record<string, { renderOrder?: number }> = {},
) {
  const usePostAA = options.aaMode === 'post' && pipeline !== null
  const useTranspFix = options.transparencyFix

  // Mettre à jour les renderOrder à chaque frame
  assignRenderOrders(scene, camera, useTranspFix, overrides)

  if (usePostAA && pipeline) {
    renderer.setRenderTarget(pipeline.rtColor)
    renderer.autoClear = true
    renderer.clear()
    renderer.autoClear = false
    renderer.render(scene, camera)

    renderer.setRenderTarget(null)
    renderer.autoClear = true
    renderer.render(pipeline.postScene, pipeline.postCamera)
    renderer.autoClear = false
    return
  }

  // Rendu direct (natif AA ou aucun AA)
  renderer.setRenderTarget(null)
  renderer.autoClear = true
  renderer.render(scene, camera)
  renderer.autoClear = false
}

/* ─── renderSceneWithTransparencyFix (legacy — gardé pour compat) */
export function renderSceneWithTransparencyFix(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
) {
  renderer.autoClear = true
  renderer.render(scene, camera)
  renderer.autoClear = false
}
