import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'

const Games: CollectionConfig = {
  slug: 'games',
  admin: { useAsTitle: 'title' },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true },
    { name: 'console', type: 'relationship', relationTo: 'consoles', required: true, index: true },
    { name: 'icon', type: 'text', admin: { description: "Nom de l'icône (ex: mario, zelda...)" } },
    { name: 'description', type: 'textarea' },
    { name: 'coverImage', type: 'upload', relationTo: 'games-media' },
    {
      name: 'releaseDate',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy' } },
    },
  ],
}

export default Games
