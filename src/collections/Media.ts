import type { CollectionConfig } from 'payload'
import path from 'path'

import { authenticated } from '@/access/authenticated'

const mediaRoot = process.env.MEDIA_ROOT || 'media'

const buildMediaCollection = (args: {
  slug: string
  dir: string
  labels: { singular: string; plural: string }
}): CollectionConfig => ({
  slug: args.slug,
  labels: args.labels,
  admin: {
    group: 'Media',
  },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  upload: {
    staticDir: path.resolve(mediaRoot, args.dir),
    staticURL: `/media/${args.dir}`,
  },
  fields: [
    { name: 'alt', type: 'text' },
    {
      name: 'mediaPath',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Chemin calculé automatiquement depuis les relations',
      },
    },
  ],
})

export const ConsolesMedia = buildMediaCollection({
  slug: 'consoles-media',
  dir: 'consoles',
  labels: { singular: 'Media console', plural: 'Media consoles' },
})

export const GamesMedia = buildMediaCollection({
  slug: 'games-media',
  dir: 'games',
  labels: { singular: 'Media jeu', plural: 'Media jeux' },
})

export const CategoriesMedia = buildMediaCollection({
  slug: 'categories-media',
  dir: 'categories',
  labels: { singular: 'Media categorie', plural: 'Media categories' },
})

export const ItemsMedia = buildMediaCollection({
  slug: 'items-media',
  dir: 'items',
  labels: { singular: 'Media item', plural: 'Media items' },
})
