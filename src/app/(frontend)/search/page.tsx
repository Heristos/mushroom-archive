import Card from '@/app/component/card'
import SectionDropdown from '@/app/component/sectiondropdown'
import { searchGames, searchItems } from '@/app/api'

interface pageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: pageProps) {
  const { q } = await searchParams

  if (!q) {
    return (
      <main>
        <div className="flex items-center justify-center h-32 text-white opacity-50">
          Entrez un terme de recherche
        </div>
      </main>
    )
  }

  const [games, items] = await Promise.all([searchGames(q), searchItems(q)])

  return (
    <main>
      <div className="mt-16">
        <SectionDropdown title={`Games — ${games.length} résultat(s)`}>
          {games.length > 0 ? (
            games.map((game) => (
              <Card
                key={game.slug}
                title={game.title}
                image={game.coverImage ?? '/icon/star.webp'}
                  href={`/${game.consoleSlug}/${game.slug}`}
                type={game.consoleSlug}
              />
            ))
          ) : (
            <p className="text-white opacity-50 py-8">No games found</p>
          )}
        </SectionDropdown>
      </div>

      <SectionDropdown title={`Assets — ${items.length} résultat(s)`}>
        {items.length > 0 ? (
          items.map(
            (item: {
              id: number
              name: string
              icon: string | null
              gameSlug: string
              consoleSlug: string
              category: string
            }) => (
              <Card
                key={item.id}
                title={item.name}
                image={item.icon ?? '/icon/star.webp'}
                  href={`/${item.consoleSlug}/${item.gameSlug}/${item.category}/${item.id}`}
                type={item.consoleSlug}
              />
            ),
          )
        ) : (
          <p className="text-white opacity-50 py-8">No assets found</p>
        )}
      </SectionDropdown>
    </main>
  )
}
