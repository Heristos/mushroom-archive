const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || ''
const mediaBaseUrl = process.env.NEXT_PUBLIC_MEDIA_URL || ''
const REVALIDATE = 3600

const get = async (endpoint: string) => {
  try {
    const response = await fetch(`${apiBaseUrl}/${endpoint}`, {
      next: { revalidate: REVALIDATE },
    })
    if (!response.ok) throw new Error('Erreur API : ' + response.statusText)
    return await response.json()
  } catch (error) {
    console.error(error)
    return null
  }
}

const mediaUrl = (url?: string | null) => {
  if (!url) return null

  // déjà une URL complète → ne touche pas
  if (url.startsWith('http')) return url

  return `${mediaBaseUrl}${url}`
}

const parseKb = (value?: string | number): number => {
  const parsed = parseInt(String(value ?? '0'), 10)
  return isNaN(parsed) ? 0 : parsed
}

export const getAllPlatforms = async (): Promise<
  { slug: string; name: string; icon?: string | null }[]
> => {
  const data = await get('consoles?limit=100&sort=id')
  return (data?.docs ?? []).map(
    (c: { slug: string; name: string; icon?: { url: string } | string }) => ({
      ...c,
      icon:
        typeof c.icon === 'object' && c.icon?.url
          ? mediaUrl(c.icon.url)
          : typeof c.icon === 'string'
            ? c.icon
            : undefined,
    }),
  )
}

export const searchGames = async (query: string) => {
  const [gamesByTitle, gamesByItems] = await Promise.all([
    get(`games?where[title][like]=${encodeURIComponent(query)}&limit=50&depth=1&sort=title`),
    get(`items?where[name][like]=${encodeURIComponent(query)}&limit=100&depth=2&sort=name`),
  ])

  const gamesMap = new Map()

  for (const g of gamesByTitle?.docs ?? []) {
    gamesMap.set(g.slug, {
      slug: g.slug,
      title: g.title,
      coverImage: mediaUrl(g.coverImage?.url),
      consoleSlug: g.console?.slug ?? '',
    })
  }

  for (const item of gamesByItems?.docs ?? []) {
    const g = item.game
    if (!g || gamesMap.has(g.slug)) continue
    gamesMap.set(g.slug, {
      slug: g.slug,
      title: g.title,
      coverImage: mediaUrl(g.coverImage?.url),
      consoleSlug: g.console?.slug ?? '',
    })
  }

  return Array.from(gamesMap.values())
}

export const searchItems = async (query: string) => {
  const data = await get(
    `items?where[name][like]=${encodeURIComponent(query)}&limit=50&depth=2&sort=name`,
  )
  return (data?.docs ?? []).map(
    (item: {
      id: number
      name: string
      icon?: { url: string }
      game?: { slug: string; title: string; console?: { slug: string } }
      category?: { name: string }
    }) => ({
      id: item.id,
      name: item.name,
      icon: mediaUrl(item.icon?.url),
      gameSlug: item.game?.slug ?? '',
      consoleSlug: item.game?.console?.slug ?? '',
      category: item.category?.name ?? '',
    }),
  )
}

export const getPlatformTotalSize = async (platform: string): Promise<number> => {
  const data = await get(`items?where[game.console.slug][equals]=${platform}&limit=1000&depth=0`)
  const docs = data?.docs ?? []
  return docs.reduce((acc: number, item: { fileSize?: string | number }) => {
    return acc + parseKb(item.fileSize)
  }, 0)
}

export const getPlatformTotalAssets = async (platform: string): Promise<number> => {
  const data = await get(`items?where[game.console.slug][equals]=${platform}&limit=0&depth=0`)
  return data?.totalDocs ?? 0
}

export const getPlatformGames = async (platform: string) => {
  const data = await get(
    `games?where[console.slug][equals]=${platform}&limit=1000&depth=1&sort=title`,
  )
  return (data?.docs ?? []).map(
    (g: {
      id: number
      title: string
      slug: string
      icon?: string
      coverImage?: { url: string }
    }) => ({
      folder: g.slug,
      name: g.title,
      icon: mediaUrl(g.coverImage?.url),
      gameIcon: g.icon, // ou ajoute-le selon ce dont left-sidebar a besoin
    }),
  )
}

export const getPlatformStats = async (platform: string) => {
  const games = await getPlatformGames(platform)
  return { totalGames: games.length }
}

export const getGameItemStats = async (gameSlug: string) => {
  const [itemsData, sizeData] = await Promise.all([
    get(`items?where[game.slug][equals]=${gameSlug}&limit=0&depth=0`),
    get(`items?where[game.slug][equals]=${gameSlug}&limit=1000&depth=0`),
  ])
  const itemCount: number = itemsData?.totalDocs ?? 0
  const totalSize: number = (sizeData?.docs ?? []).reduce(
    (acc: number, item: { fileSize?: string | number }) => acc + parseKb(item.fileSize),
    0,
  )
  return { itemCount, totalSize }
}

export const getGameFolders = async (platform: string, game: string) => {
  const [catData, gameData] = await Promise.all([
    get(`categories?where[game.slug][equals]=${game}&limit=100&depth=0&sort=name`),
    get(`games?where[slug][equals]=${game}&limit=1&depth=0`),
  ])
  const categories = catData?.docs ?? []

  if (!categories.length) return null

  const itemsData = await get(`items?where[game.slug][equals]=${game}&limit=0&depth=0`)
  const assetsCount = itemsData?.totalDocs ?? 0

  return {
    folders: categories.map((cat: { name: string }) => cat.name),
    assetsCount,
    categoryCount: categories.length,
    gameTitle: gameData?.docs?.[0]?.title ?? game,
  }
}

export const getFolderSubfolders = async (platform: string, game: string, folder: string) => {
  const data = await get(
    `items?where[game.slug][equals]=${game}&where[category.name][equals]=${folder}&limit=1000&depth=1&sort=name`,
  )
  const items = data?.docs ?? []

  return {
    subfolders: items.map((item: { name: string; id: number; icon?: { url: string } }) => ({
      folder: String(item.id),
      name: item.name,
      iconUrl: mediaUrl(item.icon?.url),
    })),
  }
}

export const getAllGameSubfolders = async (platform: string, game: string, folders: string[]) => {
  return await Promise.all(
    folders.map(async (folder) => {
      const data = await getFolderSubfolders(platform, game, folder)
      return { folder, subfolders: data?.subfolders ?? [] }
    }),
  )
}

export const getItemInfo = async (
  platform: string,
  game: string,
  section: string,
  item: string,
) => {
  const data = await get(`items/${item}?depth=2`)
  if (!data) return null

  return {
    name: data.name,
    zipSizeFormatted: data.fileSize ?? '—',
    gameName: data.game?.title ?? '—',
    downloadUrl: mediaUrl(data.zipFile?.url) ?? '/404',
    zipUrl: mediaUrl(data.zipFile?.url) ?? '',
    iconUrl: mediaUrl(data.icon?.url),
  }
}

export const getGameList = async () => {
  const data = await get('games?limit=10000&depth=1&sort=-createdAt')
  return (data?.docs ?? []).map(
    (g: {
      slug: string
      title: string
      icon?: { url: string } | string
      console?: { slug: string }
      coverImage?: { url: string }
    }) => ({
      ...g,
      icon:
        typeof g.icon === 'object' && g.icon?.url
          ? mediaUrl(g.icon.url)
          : typeof g.icon === 'string'
            ? g.icon
            : undefined,
      coverImage: g.coverImage?.url ? mediaUrl(g.coverImage.url) : undefined,
    }),
  )
}
