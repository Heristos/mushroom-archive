'use client'

/**
 * TargetPathField — composant custom Payload v3
 *
 * Utilisé dans les collections media (consoles-media, games-media,
 * categories-media, items-media).
 *
 * Comportement :
 *  - S'il est rendu dans le formulaire d'une collection parente (ex: Games,
 *    Items) via le drawer d'upload inline, il lit les champs du formulaire
 *    parent pour construire le chemin automatiquement.
 *  - Sinon (ouverture directe depuis la liste items-media), le champ reste
 *    éditable librement.
 *
 * Champs écoutés selon la collection parente détectée :
 *
 *  games-media     : console (via game.console) + game.slug
 *    → {console-slug}/{game-slug}/
 *
 *  items-media     : game → console + game.slug + category.name + item.name
 *    → {console-slug}/{game-slug}/{category-slug}/{item-slug}.
 *
 *  consoles-media  : pas de relation → édition libre
 *  categories-media: pas de relation → édition libre
 *
 * L'utilisateur peut toujours modifier le chemin manuellement.
 * Un bouton "↺ Auto" permet de revenir au chemin calculé.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useField, useFormFields, FieldLabel, useDocumentInfo } from '@payloadcms/ui'

// ─── helpers ─────────────────────────────────────────────────────────────────

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
}

async function fetchJSON(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ─── composant ───────────────────────────────────────────────────────────────

type Props = {
  path: string
  label?: string
  // passé depuis la config de la collection pour indiquer le mode
  collectionSlug?: string
}

const TargetPathField: React.FC<Props> = ({ path, label, collectionSlug }) => {
  const { value, setValue } = useField<string>({ path })

  // Champs potentiellement présents dans le formulaire parent (Items, Games…)
  const gameField     = useFormFields(([f]) => f['game'])
  const categoryField = useFormFields(([f]) => f['category'])
  const nameField     = useFormFields(([f]) => f['name'])
  const consoleField  = useFormFields(([f]) => f['console'])
  const titleField    = useFormFields(([f]) => f['title'])
  const slugField     = useFormFields(([f]) => f['slug'])

  const gameId     = gameField?.value     as number | string | null | undefined
  const categoryId = categoryField?.value as number | string | null | undefined
  const itemName   = nameField?.value     as string | undefined
  const consoleId  = consoleField?.value  as number | string | null | undefined
  const gameTitle  = titleField?.value    as string | undefined
  const gameSlugV  = slugField?.value     as string | undefined

  const [autoPath, setAutoPath]   = useState<string>('')
  const [loading, setLoading]     = useState(false)
  const userEdited = useRef(false)

  // Détecte si on est dans le formulaire Games (a console + title/slug mais pas game)
  const isGamesContext  = !!consoleId && (!!gameTitle || !!gameSlugV) && !gameId
  // Détecte si on est dans le formulaire Items (a game + category + name)
  const isItemsContext  = !!gameId && !!categoryId && !!itemName

  const compute = useCallback(async () => {
    setLoading(true)
    try {
      if (isItemsContext) {
        // Items : console/game/category/item.
        const [game, category] = await Promise.all([
          fetchJSON(`/api/games/${gameId}?depth=1`),
          fetchJSON(`/api/categories/${categoryId}?depth=0`),
        ])
        const console_ = typeof game.console === 'object' ? game.console : null
        if (!console_) return

        const cs = console_.slug ?? toSlug(console_.name)
        const gs = game.slug     ?? toSlug(game.title)
        const ca = toSlug(category.name)
        const it = toSlug(itemName!)

        setAutoPath(`${cs}/${gs}/${ca}/${it}.`)
        if (!userEdited.current) setValue(`${cs}/${gs}/${ca}/${it}.`)

      } else if (isGamesContext) {
        // Games : console/game-slug/
        const console_ = await fetchJSON(`/api/consoles/${consoleId}?depth=0`)
        const cs = console_.slug ?? toSlug(console_.name)
        const gs = gameSlugV     ?? toSlug(gameTitle ?? '')

        setAutoPath(`${cs}/${gs}/`)
        if (!userEdited.current) setValue(`${cs}/${gs}/`)

      } else {
        setAutoPath('')
      }
    } catch (_) {
      // fetch échoué, on laisse l'utilisateur remplir manuellement
    } finally {
      setLoading(false)
    }
  }, [isItemsContext, isGamesContext, gameId, categoryId, itemName, consoleId, gameTitle, gameSlugV])

  useEffect(() => {
    userEdited.current = false
    compute()
  }, [compute])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    userEdited.current = true
    setValue(e.target.value)
  }

  const handleReset = () => {
    userEdited.current = false
    setValue(autoPath)
  }

  const placeholder =
    collectionSlug === 'items-media'  ? 'console/game/category/item.ext' :
    collectionSlug === 'games-media'  ? 'console/game/fichier.ext' :
    collectionSlug === 'consoles-media' ? 'consoles/fichier.ext' :
    'dossier/fichier.ext'

  return (
    <div style={{ marginBottom: '1rem' }}>
      <FieldLabel label={label ?? 'Chemin de stockage'} htmlFor={path} />

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          id={path}
          type="text"
          value={value ?? ''}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={loading}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: '4px',
            border: '1px solid var(--theme-elevation-150)',
            background: loading
              ? 'var(--theme-elevation-50)'
              : 'var(--theme-input-bg)',
            color: 'var(--theme-text)',
            fontSize: '14px',
            opacity: loading ? 0.6 : 1,
          }}
        />

        {autoPath && userEdited.current && (
          <button
            type="button"
            onClick={handleReset}
            title="Revenir au chemin calculé automatiquement"
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid var(--theme-elevation-150)',
              background: 'var(--theme-elevation-50)',
              color: 'var(--theme-text)',
              cursor: 'pointer',
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            ↺ Auto
          </button>
        )}
      </div>

      {loading && (
        <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--theme-elevation-400)' }}>
          Calcul du chemin…
        </p>
      )}

      {!loading && autoPath && (
        <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--theme-elevation-500)' }}>
          Chemin calculé : <code style={{ userSelect: 'all' }}>{autoPath}</code>
        </p>
      )}

      <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--theme-elevation-400)' }}>
        Chemin relatif au dossier <code>media/</code>. Modifiable librement.
      </p>
    </div>
  )
}

export default TargetPathField
