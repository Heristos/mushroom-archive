export interface SceneOptions {
  alphaMode: string // "Opaque" | "Mask" | "Anti-aliasing" | "Blend"
  viewMode: string // "default" | "angular"
  filterTexture: boolean
  autoRotate: boolean
  doubleSide: boolean
  wireframe: boolean
  light: number // 0–1  intensité lumière directionnelle
  ambient: number // 0–1  lumière ambiante
  roughness: number // 0–1
  metalness: number // 0–1  → augmente les reflets, pas l'obscurité
  envIntensity: number // 0–2  intensité de l'env map (reflets)
  tWrap: string
  sWrap: string
  aaMode: 'none' | 'builtin' | 'post'
  transparencyFix: boolean
  // Photo mode angular
  angularAngle?: string // "top" | "front" | "right" | "back" | "left" | "iso-ne" | "iso-nw" | "iso-se" | "iso-sw"
  perfectResolution?: boolean // si true en mode angular → download à 200×140 px
}

export const defaultSceneOptions: SceneOptions = {
  alphaMode: 'Anti-aliasing',
  viewMode: 'angular',
  filterTexture: false,
  autoRotate: false,
  doubleSide: true,
  wireframe: false,
  light: 0.7,
  ambient: 0.3,
  roughness: 0.5,
  metalness: 0.0,
  envIntensity: 1.0,
  tWrap: 'mirror',
  sWrap: 'mirror',
  aaMode: 'builtin',
  transparencyFix: true,
  angularAngle: 'iso-ne',
  perfectResolution: true,
}
