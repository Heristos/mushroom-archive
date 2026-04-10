import type { CollectionConfig } from 'payload'

import { authenticated } from '@/access/authenticated'

const Categories: CollectionConfig = {
  slug: 'categories',
  admin: { useAsTitle: 'name' },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'game', type: 'relationship', relationTo: 'games', required: true },
  ],
}

export default Categories
