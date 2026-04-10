import type { CollectionConfig } from 'payload'

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
  },
  access: { read: () => true },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      required: true,
      admin: {
        description: 'Identifiant URL, ex: "bienvenue-sur-musharchive"',
      },
    },
    {
      name: 'author',
      type: 'text',
      defaultValue: 'MushArchive Team',
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'dd/MM/yyyy',
        },
      },
    },
    {
      name: 'content',
      type: 'richText',
    },
  ],
}
