import { getPayload } from 'payload'
import config from '@payload-config'
import StatsBoard from '../component/stats-board'

async function getStats() {
  const payload = await getPayload({ config })

  const [gamesCount, itemsCount, consolesCount, articlesCount] = await Promise.all([
    payload.count({ collection: 'games' }),
    payload.count({ collection: 'items' }),
    payload.count({ collection: 'consoles' }),
    payload.count({ collection: 'articles' }),
  ])

  const allItems = await payload.find({
    collection: 'items',
    limit: 0,
    depth: 1,
    select: { fileSize: true, game: true },
  })

  const totalKB = allItems.docs.reduce((acc, item) => {
    return acc + parseInt((item.fileSize as string) ?? '0', 10)
  }, 0)
  const totalGB = (totalKB / 1024 / 1024).toFixed(2)
  const totalMB = (totalKB / 1024).toFixed(0)

  const countByGame = allItems.docs.reduce(
    (acc, item) => {
      const game = item.game as { id: number; title: string } | null
      if (!game) return acc
      acc[game.id] = {
        title: game.title,
        count: (acc[game.id]?.count ?? 0) + 1,
      }
      return acc
    },
    {} as Record<number, { title: string; count: number }>,
  )

  const topGames = Object.values(countByGame)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const recentArticles = await payload.find({
    collection: 'articles',
    limit: 3,
    sort: '-publishedAt',
    where: {
      publishedAt: { less_than_equal: new Date().toISOString() },
    },
  })

  const recentGames = await payload.find({
    collection: 'games',
    limit: 5,
    sort: '-createdAt',
    depth: 1,
  })

  const allConsoles = await payload.find({
    collection: 'consoles',
    limit: 0,
    depth: 1,
    sort: 'name',
  })

  return {
    counts: {
      games: gamesCount.totalDocs,
      items: itemsCount.totalDocs,
      consoles: consolesCount.totalDocs,
      articles: articlesCount.totalDocs,
    },
    totalKB,
    totalMB,
    totalGB,
    topGames,
    recentArticles: recentArticles.docs,
    recentGames: recentGames.docs,
    consoles: allConsoles.docs,
  }
}

export default async function StatsPage() {
  const stats = await getStats()

  return (
    <div className="mx-auto">
      <StatsBoard
        title="📊 Chiffres clés"
        rows={[
          ['🎮 Jeux', stats.counts.games],
          ['📦 Items', stats.counts.items],
          ['🕹️ Consoles', stats.counts.consoles],
          ['📰 Articles', stats.counts.articles],
        ]}
      />

      <StatsBoard
        title="💾 Stockage"
        rows={[
          ['Total items', stats.counts.items],
          ['Taille totale (MB)', `${stats.totalMB} MB`],
          ['Taille totale (GB)', `${stats.totalGB} GB`],
          [
            'Taille moyenne / item',
            stats.counts.items > 0 ? `${Math.round(stats.totalKB / stats.counts.items)} KB` : '—',
          ],
        ]}
      />

      <StatsBoard
        title="🏆 Top jeux (par nombre d'items)"
        rows={stats.topGames.map((game, i) => [`${i + 1}. ${game.title}`, `${game.count} items`])}
      />

      <StatsBoard
        title="🆕 Jeux récemment ajoutés"
        rows={Array.from({ length: Math.ceil(stats.recentGames.length / 2) }, (_, i) => [
          stats.recentGames[i * 2]?.title ?? '—',
          stats.recentGames[i * 2 + 1]?.title ?? '—',
        ])}
      />

      <StatsBoard
        title="🕹️ Consoles supportées"
        rows={Array.from({ length: Math.ceil(stats.consoles.length / 2) }, (_, i) => [
          stats.consoles[i * 2]?.name ?? '—',
          stats.consoles[i * 2 + 1]?.name ?? '—',
        ])}
      />

      <StatsBoard
        title="📰 Derniers articles"
        rows={stats.recentArticles.map((article) => [
          article.title,
          article.publishedAt
            ? new Date(article.publishedAt as string).toLocaleDateString('fr-FR')
            : '—',
        ])}
      />
    </div>
  )
}
