import AlphabetFilter from '@/app/component/alphabet-filter'
import Card from '@/app/component/card'
import StatsBoard from '@/app/component/stats-board'
import SectionDropdown from '@/app/component/sectiondropdown'
import {
  getPlatformGames,
  getAllPlatforms,
  getGameItemStats,
  getPlatformTotalSize,
  getPlatformTotalAssets,
} from '@/app/api'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Game {
  folder: string
  name: string
  icon: string | null
}

interface pageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ letter?: string }>
}

const formatSize = (kb: number) => {
  if (kb >= 1_073_741_824) return `${(kb / 1_073_741_824).toFixed(1)} TB`
  if (kb >= 1_048_576) return `${(kb / 1_048_576).toFixed(1)} GB`
  if (kb >= 1_024) return `${(kb / 1_024).toFixed(1)} MB`
  return `${kb} KB`
}

export default async function ConsolePage({ params, searchParams }: pageProps) {
  const { slug } = await params
  const { letter } = await searchParams

  const games: Game[] = await getPlatformGames(slug)
  if (!games) notFound()

  const [gamesWithStats, totalSize, totalAssets] = await Promise.all([
    Promise.all(
      games.map(async (game) => {
        const { itemCount, totalSize } = await getGameItemStats(game.folder)
        return { ...game, itemCount, totalSize }
      }),
    ),
    getPlatformTotalSize(slug),
    getPlatformTotalAssets(slug),
  ])

  const biggestGame = gamesWithStats.reduce(
    (max, g) => (g.itemCount > (max?.itemCount ?? -1) ? g : max),
    gamesWithStats[0],
  )

  const filteredGames = games.filter((game: Game) => {
    if (!letter || letter === '#') return true
    return game.name.toUpperCase().startsWith(letter.toUpperCase())
  })

  const rowsData = [
    ['Number of Games', String(games.length)],
    ['Number of Assets', String(totalAssets)],
    ['Total Size of Assets', formatSize(totalSize)],
    [
      'Game with the Most Assets',
      biggestGame ? `${biggestGame.name} (${biggestGame.itemCount} items)` : '—',
    ],
  ]

  return (
    <main>
      <AlphabetFilter />
      <StatsBoard rows={rowsData} title={slug.toUpperCase()} />
      <SectionDropdown title="Games available">
        {filteredGames.map((game: Game) => (
          <Card
            key={game.folder}
            title={game.name}
            image={game.icon ?? '/icon/star.webp'}
            href={`/${slug}/${game.folder}`}
            type={slug}
          />
        ))}
      </SectionDropdown>
    </main>
  )
}
