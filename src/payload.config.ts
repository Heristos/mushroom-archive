import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { searchPlugin } from '@payloadcms/plugin-search'

import { Users } from './collections/Users'
import { CategoriesMedia, ConsolesMedia, GamesMedia, ItemsMedia } from './collections/Media'
import Consoles from './collections/Consoles'
import Games from './collections/Games'
import Categories from './collections/Categories'
import Items from './collections/Items'
import { Articles } from './collections/Article'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const defaultDbPath = path.resolve(dirname, '..', 'payload.db').replace(/\\/g, '/')
const databaseUrl = process.env.DATABASE_URL || `file:${defaultDbPath}`

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      afterNavLinks: ['@/components/admin/StatisticsNavLink'],
      views: {
        statistics: {
          Component: '@/components/admin/StatisticsView',
          path: '/statistics',
          meta: {
            title: 'Statistiques',
          },
        },
      },
    },
  },
  collections: [
    Users,
    ConsolesMedia,
    GamesMedia,
    CategoriesMedia,
    ItemsMedia,
    Consoles,
    Games,
    Categories,
    Items,
    Articles,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: databaseUrl,
    },
  }),
  upload: {
    createParentPath: true,
  },
  sharp,
  plugins: [
    searchPlugin({
      collections: ['games', 'items', 'articles'],
      defaultPriorities: {
        games: 10,
        items: 5,
        articles: 3,
      },
    }),
  ],
})
