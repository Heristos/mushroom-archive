import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js'
import JSZip from 'jszip'
import { NodeInfo } from '@/app/component/scene/scene-bridge'
import { upgradeMaterials } from '@/app/component/scene/scene-utils'

export interface LoadResult {
  object: THREE.Object3D
  nodes: NodeInfo[]
  blobUrls: string[]
}

export interface MultiLoadResult {
  /** Noms des modèles trouvés dans le zip (dossiers ou fichier unique) */
  modelNames: string[]
  /** Charge un ou tous les modèles
   *  - modelName = undefined → charge tous, disposés en spirale
   *  - modelName = nom → charge ce modèle uniquement
   */
  load: (modelName?: string) => Promise<LoadResult>
  /** Libère tous les blob URLs créés lors de l'exploration */
  dispose: () => void
  /** Présent seulement si le ZIP contient de l'audio ou de la vidéo */
  mediaType?: 'audio' | 'video' | 'texture'
  /** Liste de tous les fichiers média trouvés dans le ZIP */
  mediaFiles?: { name: string; blobUrl: string }[]
}

/* ─── Détection multi-modèles ───────────────────────────────────── */

export async function inspectZip(zipUrl: string): Promise<MultiLoadResult> {
  console.log('[inspectZip] fetching:', zipUrl)
  const res = await fetch(zipUrl)
  console.log('[inspectZip] response:', res.status, res.statusText, res.headers.get('content-type'))
  if (!res.ok) throw new Error(`HTTP ${res.status} — impossible de charger le ZIP`)

  const buffer = await res.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)

  /* Organiser les fichiers par dossier.
     "" = racine (zip plat sans sous-dossier)
     Support des séparateurs Unix (/) ET Windows (\) */
  const folders: Record<string, string[]> = {}
  const blobMap: Record<string, Blob> = {}
  const allBlobUrls: string[] = []

  await Promise.all(
    Object.entries(zip.files).map(async ([rawPath, entry]) => {
      if (entry.dir) return
      // Normaliser les backslashes Windows → slash Unix
      const path = rawPath.replace(/\\/g, '/')
      const parts = path.split('/')
      const folder = parts.length > 1 ? parts[0] : ''
      folders[folder] = folders[folder] || []
      folders[folder].push(path)

      const blob = await entry.async('blob')
      // Stocker sous chemin normalisé
      blobMap[path.toLowerCase()] = blob
    }),
  )

  /* Trouver les dossiers/emplacements qui contiennent un modèle 3D */
  const modelEntries: { folder: string; file: string }[] = []

  for (const [folder, files] of Object.entries(folders)) {
    const lf = files.map((f) => f.toLowerCase())
    const found = lf.find((f) => f.endsWith('.fbx') || f.endsWith('.dae') || f.endsWith('.obj'))
    if (found) {
      modelEntries.push({ folder, file: found })
    }
  }

  /* ── Détection audio / vidéo si pas de modèle 3D ── */
  if (modelEntries.length === 0) {
    const allFiles = Object.keys(blobMap)
    const AUDIO_EXT = ['.wav', '.mp3', '.ogg', '.opus', '.flac']
    const VIDEO_EXT = ['.mp4', '.mkv', '.mov', '.avi', '.webm']

    const audioFile = allFiles.find((f) => AUDIO_EXT.some((e) => f.endsWith(e)))
    const videoFile = allFiles.find((f) => VIDEO_EXT.some((e) => f.endsWith(e)))

    const hasAudio = !!audioFile
    const hasVideo = !!videoFile

    if (hasAudio || hasVideo) {
      const mediaType: 'audio' | 'video' = hasAudio ? 'audio' : 'video'
      const matchExt = hasAudio ? AUDIO_EXT : VIDEO_EXT

      // Collecter TOUS les fichiers du bon type
      // — ignorer les métadonnées macOS (__MACOSX/ et fichiers ._xxx)
      const mediaFiles = allFiles
        .filter((f) => {
          if (!matchExt.some((e) => f.endsWith(e))) return false
          // Ignorer dossier __macosx et fichiers AppleDouble (._xxx)
          const parts = f.split('/')
          if (parts.some((p) => p === '__macosx')) return false
          const basename = parts[parts.length - 1]
          if (basename.startsWith('._')) return false
          return true
        })
        .map((f) => {
          const blobUrl = URL.createObjectURL(blobMap[f])
          allBlobUrls.push(blobUrl)
          return { name: f.split('/').pop() ?? f, blobUrl }
        })

      return {
        mediaType,
        mediaFiles,
        modelNames: [],
        load: async () => {
          throw new Error('Pas de modèle 3D')
        },
        dispose: () => {
          allBlobUrls.forEach((u) => URL.revokeObjectURL(u))
        },
      } as unknown as MultiLoadResult
    }

    // Détection textures (images)
    const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tga']
    const imageFiles = allFiles.filter((f) => {
      if (!IMAGE_EXT.some((e) => f.endsWith(e))) return false
      const parts = f.split('/')
      if (parts.some((p) => p === '__macosx')) return false
      const basename = parts[parts.length - 1]
      if (basename.startsWith('._')) return false
      return true
    })

    if (imageFiles.length > 0) {
      const mediaFiles = imageFiles.map((f) => {
        const blobUrl = URL.createObjectURL(blobMap[f])
        allBlobUrls.push(blobUrl)
        return { name: f.split('/').pop() ?? f, blobUrl }
      })
      return {
        mediaType: 'texture',
        mediaFiles,
        modelNames: [],
        load: async () => {
          throw new Error('Pas de modèle 3D')
        },
        dispose: () => {
          allBlobUrls.forEach((u) => URL.revokeObjectURL(u))
        },
      } as unknown as MultiLoadResult
    }

    throw new Error('Aucun contenu reconnu dans le ZIP.')
  }

  /* Noms affichés : nom du dossier, ou nom du fichier si racine */
  const modelNames = modelEntries.map(({ folder, file }) =>
    folder === ''
      ? (file
          .split('/')
          .pop()
          ?.replace(/\.[^.]+$/, '') ?? file)
      : folder,
  )

  /* ── Charge un objet THREE depuis une entrée ── */
  async function loadEntry(entry: { folder: string; file: string }): Promise<THREE.Object3D> {
    const folderFiles = entry.folder !== '' ? folders[entry.folder] : Object.keys(blobMap)

    const manager = new THREE.LoadingManager()
    manager.setURLModifier((url) => {
      // Décoder les espaces encodés URL (%20) et autres caractères spéciaux
      const decoded = decodeURIComponent(url)
      const name = decoded.split('/').pop()?.toLowerCase() ?? ''
      const fullPath = folderFiles.find((f) => f.toLowerCase().endsWith(name))
      if (fullPath) {
        const blob = blobMap[fullPath.toLowerCase()]
        if (blob) {
          const burl = URL.createObjectURL(blob)
          allBlobUrls.push(burl)
          return burl
        }
      }
      return url
    })

    let object: THREE.Object3D
    if (entry.file.endsWith('.obj')) {
      object = await loadOBJ(entry.file, blobMap, manager, folderFiles)
    } else if (entry.file.endsWith('.fbx')) {
      object = await loadFBX(entry.file, blobMap, manager)
    } else {
      object = await loadDAE(entry.file, blobMap, manager)
    }
    return object
  }

  /* ── Normalise un objet (centre + scale 1 unit) ── */
  function normalizeObject(object: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(object)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const scale = 2 / Math.max(size.x, size.y, size.z)
    object.scale.setScalar(scale)

    const boxScaled = new THREE.Box3().setFromObject(object)
    object.position.x -= center.x * scale
    object.position.z -= center.z * scale
    object.position.y -= boxScaled.min.y
  }

  /* ── Collecte les NodeInfo d'un objet ── */
  function collectNodes(object: THREE.Object3D, offset = 0): NodeInfo[] {
    const nodes: NodeInfo[] = []
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      if (!child.name) child.name = `mesh_${offset + nodes.length}`
      const mat = Array.isArray(child.material) ? child.material[0] : child.material
      nodes.push({
        id: child.uuid,
        name: child.name,
        materialName: (mat as THREE.Material)?.name ?? '',
      })
    })
    return nodes
  }

  /* ── API publique ── */
  return {
    modelNames,

    async load(modelName?: string): Promise<LoadResult> {
      const blobUrls: string[] = []

      /* ─ Tous les modèles en cercles concentriques ─
         Anneau 0 : 1 modèle au centre
         Anneau k : k*6 modèles, rayon = k * 3.5
      ─────────────────────────────────────────── */
      if (modelName === undefined || modelName === 'all') {
        const root = new THREE.Group()
        let allNodes: NodeInfo[] = []
        const count = modelEntries.length

        // Retourne [x, z] pour le i-ème modèle — grille carrée concentrique
        // Couronne 0 : centre (0,0)
        // Couronne 1 : bord 3×3 (8 cases)
        // Couronne 2 : bord 5×5 (16 cases), etc.
        function ringPosition(i: number): [number, number] {
          const SPACING = 3.2
          const positions: [number, number][] = [[0, 0]]
          let ring = 1
          while (positions.length <= i) {
            // Haut : y = ring, x de -ring à ring
            for (let x = -ring; x <= ring; x++) positions.push([x, ring])
            // Droite : x = ring, y de ring-1 à -ring
            for (let y = ring - 1; y >= -ring; y--) positions.push([ring, y])
            // Bas : y = -ring, x de ring-1 à -ring
            for (let x = ring - 1; x >= -ring; x--) positions.push([x, -ring])
            // Gauche : x = -ring, y de -ring+1 à ring-1
            for (let y = -ring + 1; y <= ring - 1; y++) positions.push([-ring, y])
            ring++
          }
          const [gx, gz] = positions[i]
          return [gx * SPACING, gz * SPACING]
        }

        for (let i = 0; i < count; i++) {
          const obj = await loadEntry(modelEntries[i])
          upgradeMaterials(obj)
          normalizeObject(obj)

          const [rx, rz] = ringPosition(i)
          obj.position.x += rx
          obj.position.z += rz

          allNodes = allNodes.concat(collectNodes(obj, allNodes.length))
          root.add(obj)
        }

        return { object: root, nodes: allNodes, blobUrls }
      }

      /* ─ Un seul modèle par nom ─ */
      const idx = modelNames.indexOf(modelName)
      if (idx === -1) throw new Error(`Modèle introuvable : ${modelName}`)

      const obj = await loadEntry(modelEntries[idx])
      upgradeMaterials(obj)
      normalizeObject(obj)

      const nodes = collectNodes(obj)
      return { object: obj, nodes, blobUrls }
    },

    dispose() {
      allBlobUrls.forEach((u) => URL.revokeObjectURL(u))
    },
  }
}

/* ─── loadModelFromZip (legacy — 1 seul modèle) ────────────────── */
export async function loadModelFromZip(zipUrl: string): Promise<LoadResult> {
  const multi = await inspectZip(zipUrl)
  const result = await multi.load(multi.modelNames[0])
  multi.dispose()
  return result
}

// ── OBJ loader avec recherche MTL dans le même dossier
async function loadOBJ(
  modelName: string,
  blobMap: Record<string, Blob>,
  manager: THREE.LoadingManager,
  allFiles: string[],
): Promise<THREE.Object3D> {
  const lowerFiles = allFiles.map((f) => f.toLowerCase())
  const mtlFile = lowerFiles.find((f) => f.endsWith('.mtl'))

  if (mtlFile) {
    const mtlLoader = new MTLLoader(manager)
    const materials = mtlLoader.parse(await blobMap[mtlFile].text(), '')
    materials.preload()
    const loader = new OBJLoader(manager)
    loader.setMaterials(materials)
    return loader.parse(await blobMap[modelName.toLowerCase()].text())
  }
  return new OBJLoader(manager).parse(await blobMap[modelName.toLowerCase()].text())
}

async function loadFBX(
  modelName: string,
  blobMap: Record<string, Blob>,
  manager: THREE.LoadingManager,
): Promise<THREE.Object3D> {
  const buf = await blobMap[modelName.toLowerCase()].arrayBuffer()
  return new FBXLoader(manager).parse(buf, '')
}

async function loadDAE(
  modelName: string,
  blobMap: Record<string, Blob>,
  manager: THREE.LoadingManager,
): Promise<THREE.Object3D> {
  const text = await blobMap[modelName.toLowerCase()].text()
  const collada = new ColladaLoader(manager).parse(text, '')
  if (!collada) throw new Error('ColladaLoader: failed to parse model')
  return collada.scene
}
