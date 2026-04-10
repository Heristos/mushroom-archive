/**
 * media-path.ts
 * Résolution automatique des chemins médias selon la hiérarchie des collections Payload.
 *
 * Hiérarchie :
 *   Console → Game → Category → Item
 *
 * Règles de chemin :
 *   Game  → media/{console-slug}/{game-slug}/{filename}
 *   Item  → media/{console-slug}/{game-slug}/{category-slug}/{item-slug}.{ext}
 */

import type { Console, Game, Category, Item } from '@/payload-types'

// ---------------------------------------------------------------------------
// Types internes
// ---------------------------------------------------------------------------

/** Résolution partielle pour une relation Payload (id ou objet populé) */
type Populated<T> = number | T

/** Résultat de la résolution d'un chemin */
export interface MediaPathResult {
  /** Chemin complet  ex: media/nintendo-3ds/animal-crossing-new-leaf/icon.webp */
  path: string
  /** Répertoire parent ex: media/nintendo-3ds/animal-crossing-new-leaf */
  dir: string
  /** Nom de fichier final ex: animal-crossing-new-leaf.webp */
  filename: string
  /** Segments utilisés pour construire le chemin */
  segments: {
    consoleSlug: string
    gameSlug: string
    categorySlug?: string
    itemSlug?: string
  }
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

/**
 * Convertit une chaîne quelconque en slug kebab-case.
 *
 * @example
 * toSlug("Animal Crossing: New Leaf")  → "animal-crossing-new-leaf"
 * toSlug("Lunettes de Soleil!")        → "lunettes-de-soleil"
 */
export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')                    // décompose les accents (é → e + ´)
    .replace(/[\u0300-\u036f]/g, '')     // supprime les diacritiques
    .replace(/[^a-z0-9\s-]/g, '')       // ne garde que lettres, chiffres, espaces, tirets
    .trim()
    .replace(/[\s_]+/g, '-')            // espaces et underscores → tirets
    .replace(/-{2,}/g, '-')             // tirets multiples → un seul
}

/** Extrait l'extension d'un nom de fichier, sans le point. */
function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot !== -1 ? filename.slice(dot + 1) : ''
}

/**
 * Garantit qu'une relation Payload est résolue (objet populé).
 * Lance une erreur explicite si la valeur est encore un identifiant numérique.
 */
function assertPopulated<T extends { id: number }>(
  value: Populated<T>,
  label: string,
): T {
  if (typeof value === 'number') {
    throw new Error(
      `La relation "${label}" n'est pas populée (valeur reçue : id=${value}). ` +
      `Appelez payload.findByID() ou utilisez depth ≥ 1 lors de la requête.`,
    )
  }
  return value
}

// ---------------------------------------------------------------------------
// Résolution pour un Game
// ---------------------------------------------------------------------------

/**
 * Retourne le chemin média d'un fichier attaché à un **Game**.
 *
 * @param game     - Objet Game avec la relation `console` populée
 * @param filename - Nom du fichier tel qu'il sera stocké (ex: "cover.webp")
 *
 * @example
 * const result = resolveGameMediaPath(game, 'animal_crossing_new_leaf.webp')
 * // result.path → "media/nintendo-3ds/animal-crossing-new-leaf/animal_crossing_new_leaf.webp"
 */
export function resolveGameMediaPath(
  game: Game & { console: Console },
  filename: string,
): MediaPathResult {
  const console_ = assertPopulated<Console>(game.console, 'game.console')

  const consoleSlug = console_.slug ?? toSlug(console_.name)
  const gameSlug    = game.slug    ?? toSlug(game.title)

  const dir  = `media/${consoleSlug}/${gameSlug}`
  const path = `${dir}/${filename}`

  return { path, dir, filename, segments: { consoleSlug, gameSlug } }
}

// ---------------------------------------------------------------------------
// Résolution pour un Item
// ---------------------------------------------------------------------------

/**
 * Retourne le chemin média d'un **Item** (icône ou ZIP).
 *
 * Le nom de fichier final est dérivé du nom de l'item converti en slug,
 * auquel on conserve l'extension d'origine.
 *
 * @param item         - Objet Item avec les relations `game`, `game.console`
 *                       et `category` populées
 * @param originalName - Nom du fichier source (utilisé pour l'extension)
 *
 * @example
 * const result = resolveItemMediaPath(item, 'icon_lunette.webp')
 * // result.path → "media/nintendo-switch/animal-crossing-new-horizons/accessories/lunette.webp"
 */
export function resolveItemMediaPath(
  item: Item & {
    game: Game & { console: Console }
    category: Category
  },
  originalName: string,
): MediaPathResult {
  const game     = assertPopulated<Game>(item.game,          'item.game')
  const console_ = assertPopulated<Console>(game.console,    'item.game.console')
  const category = assertPopulated<Category>(item.category,  'item.category')

  const consoleSlug  = console_.slug  ?? toSlug(console_.name)
  const gameSlug     = game.slug      ?? toSlug(game.title)
  const categorySlug = toSlug(category.name)
  const itemSlug     = toSlug(item.name)

  const ext      = getExtension(originalName)
  const filename = ext ? `${itemSlug}.${ext}` : itemSlug

  const dir  = `media/${consoleSlug}/${gameSlug}/${categorySlug}`
  const path = `${dir}/${filename}`

  return {
    path,
    dir,
    filename,
    segments: { consoleSlug, gameSlug, categorySlug, itemSlug },
  }
}

// ---------------------------------------------------------------------------
// Fonction générique unifiée
// ---------------------------------------------------------------------------

/**
 * Résout automatiquement le chemin média selon le type de l'objet passé.
 *
 * Distingue un **Game** d'un **Item** en vérifiant la présence du champ `category`.
 *
 * @param entity       - Objet Game ou Item (relations populées obligatoires)
 * @param filename     - Nom du fichier source
 *
 * @example
 * // Pour un jeu
 * resolveMediaPath(game, 'cover.webp')
 * // → { path: "media/nintendo-switch/animal-crossing-new-horizons/cover.webp", ... }
 *
 * // Pour un item
 * resolveMediaPath(item, 'icon_lunette.webp')
 * // → { path: "media/nintendo-switch/animal-crossing-new-horizons/accessories/lunette.webp", ... }
 */
export function resolveMediaPath(
  entity:
    | (Game & { console: Console })
    | (Item & { game: Game & { console: Console }; category: Category }),
  filename: string,
): MediaPathResult {
  if ('category' in entity) {
    return resolveItemMediaPath(
      entity as Item & { game: Game & { console: Console }; category: Category },
      filename,
    )
  }
  return resolveGameMediaPath(entity as Game & { console: Console }, filename)
}
