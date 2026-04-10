export interface NodeInfo {
  id: string; // mesh.uuid
  name: string; // mesh.name
  materialName: string;
}

export interface NodeOverride {
  id: string;
  visible?: boolean;
  doubleSide?: boolean;
  alphaMode?: "Opaque" | "Mask" | "Anti-aliasing" | "Blend";
  tWrap?: "repeat" | "clamp" | "mirror";
  sWrap?: "repeat" | "clamp" | "mirror";
  intentAlpha?: number;
  renderOrder?: number; // priorité d'affichage — plus élevé = rendu par-dessus
  depthTest?: boolean; // false = toujours visible, ignore la profondeur
}
