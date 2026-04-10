import AlphabetFilter from '@/app/component/alphabet-filter'
import StatsBoard from '@/app/component/stats-board'
import TabsScene from '@/app/component/tabs-scene'
import { getGameFolders, getAllGameSubfolders } from '@/app/api'
import { notFound } from 'next/navigation'

interface Params {
  slug: string
  gameSlug: string
}

interface Subfolder {
  folder: string
  name: string
}

interface FolderWithSubfolders {
  folder: string
  subfolders: Subfolder[]
}

export const dynamic = 'force-dynamic'

// ─── Page ─────────────────────────────────────────────────

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<{ letter?: string }>
}) {
  const { slug, gameSlug } = await params
  const { letter } = await searchParams

  const dataGame = await getGameFolders(slug, gameSlug).catch(() => null)

  if (!dataGame) notFound()

  const folders: string[] = dataGame.folders ?? []

  const foldersWithSubfolders: FolderWithSubfolders[] = await getAllGameSubfolders(
    slug,
    gameSlug,
    folders,
  ).catch(() => folders.map((folder) => ({ folder, subfolders: [] })))

  // 🔎 filtre alphabétique
  const filteredFolders: FolderWithSubfolders[] = foldersWithSubfolders.map((folder) => ({
    ...folder,
    subfolders: folder.subfolders.filter((sub) => {
      if (!letter || letter === '#') return true

      return sub.name.toUpperCase().startsWith(letter.toUpperCase())
    }),
  }))

  const rowsDataGame = [
    ['Assets', String(dataGame.assetsCount ?? 0)],
    ['Categories', String(dataGame.categoryCount ?? 0)],
  ]

  return (
    <main>
      <AlphabetFilter />

      <StatsBoard rows={rowsDataGame} title={dataGame.gameTitle} />

      <TabsScene foldersWithSubfolders={filteredFolders} slug={slug} gameSlug={gameSlug} />
    </main>
  )
}
