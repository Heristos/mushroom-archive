import * as THREE from "three";
import { SceneOptions } from "@/app/component/scene/scene-options";
import { NodeOverride } from "@/app/component/scene/scene-bridge";
import {
  applyAlphaModeToMat,
  applyPolygonOffset,
} from "@/app/component/scene/scene-aa";

/* ─── wrapping ────────────────────────────────────────── */

export function wrapToThree(w: string): THREE.Wrapping {
  if (w === "clamp") return THREE.ClampToEdgeWrapping;
  if (w === "mirror") return THREE.MirroredRepeatWrapping;
  return THREE.RepeatWrapping;
}

/* ─── texture slots ───────────────────────────────────── */

const TEX_SLOTS = [
  "map",
  "normalMap",
  "roughnessMap",
  "metalnessMap",
  "alphaMap",
  "emissiveMap",
  "aoMap",
] as const;

function eachTex(
  mat: THREE.MeshStandardMaterial,
  cb: (tex: THREE.Texture) => void
) {
  for (const key of TEX_SLOTS) {
    const t = mat[key] as THREE.Texture | null;
    if (t) cb(t);
  }
}

/* ─── iterate helpers ─────────────────────────────────── */

function eachMesh(
  root: THREE.Object3D,
  cb: (mesh: THREE.Mesh, mat: THREE.Material) => void
) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mats = Array.isArray(child.material)
      ? (child.material as THREE.Material[])
      : [child.material as THREE.Material];
    for (const m of mats) cb(child, m);
  });
}

function eachStd(
  root: THREE.Object3D,
  cb: (mesh: THREE.Mesh, mat: THREE.MeshStandardMaterial) => void
) {
  eachMesh(root, (mesh, mat) => {
    if (mat instanceof THREE.MeshStandardMaterial) cb(mesh, mat);
  });
}

/* ─── UPGRADE MATERIALS → MeshPhysicalMaterial ───────────────────────
   MeshPhysicalMaterial étend MeshStandardMaterial avec :
   - clearcoat, sheen, transmission (pour le verre)
   - envMapIntensity bien exposé
   - meilleur modèle de reflets → metalness = reflets, pas obscurité
   ─────────────────────────────────────────────────────────────────── */

export function upgradeMaterials(model: THREE.Object3D) {
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const upgrade = (mat: THREE.Material): THREE.Material => {
      // Déjà Physical → OK
      if (mat instanceof THREE.MeshPhysicalMaterial) return mat;

      const phys = new THREE.MeshPhysicalMaterial();
      phys.name = mat.name;
      phys.side = mat.side;
      phys.transparent = mat.transparent;
      phys.alphaTest = mat.alphaTest;
      phys.depthWrite = mat.depthWrite;
      phys.wireframe = (mat as any).wireframe ?? false;

      const src = mat as any;
      if (src.map) phys.map = src.map;
      if (src.normalMap) phys.normalMap = src.normalMap;
      if (src.roughnessMap) phys.roughnessMap = src.roughnessMap;
      if (src.metalnessMap) phys.metalnessMap = src.metalnessMap;
      if (src.emissiveMap) phys.emissiveMap = src.emissiveMap;
      if (src.aoMap) phys.aoMap = src.aoMap;
      if (src.alphaMap) phys.alphaMap = src.alphaMap;
      if (src.color) phys.color.copy(src.color);
      if (src.emissive) phys.emissive.copy(src.emissive);

      phys.roughness = src.roughness ?? 0.5;
      phys.metalness = src.metalness ?? 0.0;
      // Reflets env map actifs par défaut
      phys.envMapIntensity = 1.0;

      mat.dispose();
      return phys;
    };

    if (Array.isArray(child.material)) {
      child.material = (child.material as THREE.Material[]).map(upgrade);
    } else {
      child.material = upgrade(child.material as THREE.Material);
    }
  });
}

/* ─── APPLY SCENE OPTIONS ─────────────────────────────────────────────
   - light    → intensité lumière directionnelle principale
   - ambient  → lumière ambiante (séparée)
   - roughness / metalness → propriétés PBR
   - envIntensity → force des reflets env map (le "path tracing look")
   ─────────────────────────────────────────────────────────────────── */

export function applyOptions(
  model: THREE.Object3D,
  lights: THREE.Light[],
  options: SceneOptions,
  viewModeShaders: Map<THREE.MeshStandardMaterial, string>,
  overrides: Record<string, NodeOverride> = {}
) {
  /* ── Lumières ── */
  for (const l of lights) {
    if (l instanceof THREE.AmbientLight) {
      // Ambient séparé et plus doux — évite d'aplatir les reflets
      l.intensity = options.ambient * 1.2;
    }
    if (l instanceof THREE.DirectionalLight) {
      l.intensity =
        l.position.y > 0
          ? options.light * 3.0 // lumière principale — plus forte pour des ombres nettes
          : options.light * 0.4; // lumière de remplissage — très douce
    }
    if ((l as any).isRectAreaLight) {
      (l as any).intensity = options.light * 4.0;
    }
  }

  const globalAlpha = options.alphaMode
    .toLowerCase()
    .replace("anti-aliasing", "anti-alias");

  eachStd(model, (mesh, mat) => {
    const ov = overrides[mesh.uuid];

    mat.roughness = options.roughness;

    /* ── Metalness → reflets, pas obscurité ──────────────────
       Le truc : quand metalness monte, on :
       1. garde la couleur de base (pas de multiply par 0)
       2. monte envMapIntensity pour des reflets forts
       3. baisse légèrement roughness pour que les reflets soient nets
       ─────────────────────────────────────────────────────── */
    mat.metalness = options.metalness;

    // envMapIntensity = combinaison du slider env + boost metalness
    // Plus le métal est élevé, plus les reflets de l'env map sont intenses
    const metalnessBoost = options.metalness * 1.5;
    (mat as THREE.MeshPhysicalMaterial).envMapIntensity =
      options.envIntensity + metalnessBoost;

    mat.wireframe = options.wireframe;

    // Double Side
    if (ov?.doubleSide !== undefined) {
      mat.side = ov.doubleSide ? THREE.DoubleSide : THREE.FrontSide;
    } else {
      mat.side = options.doubleSide ? THREE.DoubleSide : THREE.FrontSide;
    }

    // Alpha Mode
    if (ov?.alphaMode !== undefined) {
      const ovAlpha = ov.alphaMode
        .toLowerCase()
        .replace("anti-aliasing", "anti-alias");
      applyAlphaModeToMat(mat, ovAlpha, 1.0, options.transparencyFix);
    } else {
      applyAlphaModeToMat(mat, globalAlpha, 1.0, options.transparencyFix);
    }

    applyPolygonOffset(
      mat,
      options.transparencyFix && !mat.transparent,
      0.8,
      1
    );

    // Texture filtering + wrapping
    eachTex(mat, (tex) => {
      tex.magFilter = options.filterTexture
        ? THREE.LinearFilter
        : THREE.NearestFilter;
      tex.minFilter = options.filterTexture
        ? THREE.LinearMipmapLinearFilter
        : THREE.NearestFilter;
      tex.wrapS = wrapToThree(
        ov?.sWrap !== undefined ? ov.sWrap! : options.sWrap
      );
      tex.wrapT = wrapToThree(
        ov?.tWrap !== undefined ? ov.tWrap! : options.tWrap
      );
      tex.needsUpdate = true;
    });

    // View mode
    const prev = viewModeShaders.get(mat) ?? "Default";
    if (prev !== options.viewMode) {
      const wantNormal = options.viewMode === "Normal";
      if (wantNormal) {
        mat.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "gl_FragColor = vec4( outgoingLight, diffuseColor.a );",
            "gl_FragColor = vec4( normalize( vNormal ) * 0.5 + 0.5, 1.0 );"
          );
        };
      } else {
        mat.onBeforeCompile = () => {};
      }
      mat.customProgramCacheKey = () => options.viewMode;
      viewModeShaders.set(mat, options.viewMode);
    }

    mat.needsUpdate = true;
  });
}

/* ─── APPLY NODE OVERRIDES ────────────────────────────── */

export function applyOverrides(
  model: THREE.Object3D,
  overrides: Record<string, NodeOverride>,
  transparencyFix: boolean = true
) {
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const ov = overrides[child.uuid];
    // Pas d'override, ou override vide (juste { id }) → rien à faire
    if (!ov || Object.keys(ov).length <= 1) return;

    if (ov.visible !== undefined) child.visible = ov.visible;
    if (ov.renderOrder !== undefined) child.renderOrder = ov.renderOrder;

    const mats = Array.isArray(child.material)
      ? (child.material as THREE.Material[])
      : [child.material as THREE.Material];

    for (const mat of mats) {
      if (!(mat instanceof THREE.MeshStandardMaterial)) continue;

      if (ov.doubleSide !== undefined)
        mat.side = ov.doubleSide ? THREE.DoubleSide : THREE.FrontSide;

      if (ov.depthTest !== undefined) {
        mat.depthTest = ov.depthTest;
        mat.depthWrite = ov.depthTest; // si depthTest=false, pas d'écriture non plus
      }

      if (ov.alphaMode !== undefined) {
        const m = ov.alphaMode
          .toLowerCase()
          .replace("anti-aliasing", "anti-alias");
        applyAlphaModeToMat(mat, m, 1.0, transparencyFix);
      }

      eachTex(mat, (tex) => {
        if (ov.sWrap !== undefined) tex.wrapS = wrapToThree(ov.sWrap!);
        if (ov.tWrap !== undefined) tex.wrapT = wrapToThree(ov.tWrap!);
        tex.needsUpdate = true;
      });

      mat.needsUpdate = true;
    }
  });
}
