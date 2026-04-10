import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'

const Items: CollectionConfig = {
  slug: 'items',
  admin: {
    useAsTitle: 'name',
    components: {
      // Adds the "Import ZIP" button before the list table (next to "Create New")
      beforeListTable: ['@/components/BulkImportButton'],
    },
  },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        const zipFileId =
          typeof data.zipFile === 'object' && data.zipFile !== null
            ? data.zipFile.id
            : data.zipFile

        if (zipFileId) {
          const media = await req.payload.findByID({
            collection: 'items-media',
            id: zipFileId,
            overrideAccess: false,
            req,
          })

          if (media?.filesize) {
            data.fileSize = String(Math.round(media.filesize / 1024))
          }
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'game',
      type: 'relationship',
      relationTo: 'games',
      required: true,
      admin: { description: 'Sélectionne le jeu pour filtrer les catégories' },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      filterOptions: ({ data }) => {
        if (!data?.game) return true
        return { game: { equals: data.game } }
      },
    },
    { name: 'zipFile', type: 'upload', relationTo: 'items-media' },
    { name: 'icon', type: 'upload', relationTo: 'items-media' },
    {
      name: 'fileSize',
      type: 'text',
      admin: { readOnly: true, description: 'Calculé automatiquement depuis le ZIP (en KB)' },
    },
  ],
}

export default Items
