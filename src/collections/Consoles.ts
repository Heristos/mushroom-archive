import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'

const Consoles: CollectionConfig = {
  slug: 'consoles',
  admin: { useAsTitle: 'name' },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    {
      name: 'icon',
      type: 'text',
      admin: { description: "Nom de l'icône (ex: switch, 3ds, gba...)" },
    },
    { name: 'image', type: 'upload', relationTo: 'consoles-media' },
    {
      name: 'releaseDate',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy' } },
    },
  ],
}

export default Consoles
