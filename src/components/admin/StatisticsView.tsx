'use client'

import React, { useEffect, useState } from 'react'

type ConsoleStats = {
  id: number
  name: string
  slug: string
  games: number
  items: number
  totalKb: number
}

type Stats = {
  consoles: number
  games: number
  categories: number
  items: number
  articles: number
  totalKb: number
  topGames: { title: string; itemCount: number; totalKb: number; console: string }[]
  consoleStats: ConsoleStats[]
  recentGames: { title: string; createdAt: string; console: string }[]
  recentItems: { name: string; createdAt: string; game: string; fileSize: string }[]
}

const P = [
  { bg: '#C4B8F5', text: '#3B2580', border: '#A99EE0' },
  { bg: '#FBBF99', text: '#7A3A18', border: '#E5A87E' },
  { bg: '#F9BFC7', text: '#7A1E35', border: '#E0A0AC' },
  { bg: '#FDCFA0', text: '#7A3A12', border: '#E0B882' },
  { bg: '#B8E8D4', text: '#1A5C40', border: '#8DCFB4' },
  { bg: '#F5D6F5', text: '#5C1A5C', border: '#D8B0D8' },
  { bg: '#B8D8F5', text: '#1A3A5C', border: '#8ABFE0' },
  { bg: '#F5F0B8', text: '#5C4A1A', border: '#D8CC8A' },
]

const WAVES = [
  [20, 28, 18, 32, 25, 35, 22, 38, 30, 42, 28, 44],
  [10, 18, 15, 28, 22, 35, 28, 40, 35, 42, 38, 44],
  [15, 25, 20, 35, 28, 40, 32, 38, 35, 42, 38, 44],
  [30, 22, 35, 18, 40, 25, 33, 20, 38, 28, 35, 30],
  [8, 20, 14, 30, 22, 36, 28, 40, 35, 42, 38, 44],
  [25, 18, 30, 22, 35, 28, 38, 32, 40, 35, 42, 38],
  [12, 22, 16, 32, 24, 38, 30, 42, 36, 44, 40, 44],
  [35, 28, 40, 30, 42, 35, 38, 40, 36, 42, 38, 44],
]

function formatSize(kb: number): string {
  if (kb === 0) return '0 KB'
  if (kb < 1024) return `${kb} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 300,
    h = 52
  const min = Math.min(...data),
    max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i): [number, number] => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / range) * (h * 0.7) - 6,
  ])
  const line = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const fill = [...pts.map(([x, y]) => `${x},${y}`), `${w},${h}`, `0,${h}`].join(' ')
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', height: h }}
    >
      <polygon points={fill} fill={color} opacity={0.22} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  )
}

export default function StatisticsView() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [consolesRes, gamesRes, categoriesRes, itemsRes, articlesRes] = await Promise.all([
          fetch('/api/consoles?limit=100&depth=0'),
          fetch('/api/games?limit=1000&depth=1&sort=-createdAt'),
          fetch('/api/categories?limit=0'),
          fetch('/api/items?limit=1000&depth=2&sort=-createdAt'),
          fetch('/api/articles?limit=0'),
        ])
        const [cd, gd, catd, id, ad] = await Promise.all([
          consolesRes.json(),
          gamesRes.json(),
          categoriesRes.json(),
          itemsRes.json(),
          articlesRes.json(),
        ])

        const allItems: any[] = id.docs ?? []
        const allGames: any[] = gd.docs ?? []
        const allConsoles: any[] = cd.docs ?? []

        const totalKb = allItems.reduce(
          (a: number, it: any) => a + (parseInt(it.fileSize ?? '0', 10) || 0),
          0,
        )

        const itemsByGame: Record<
          string,
          { title: string; count: number; kb: number; console: string }
        > = {}
        for (const it of allItems) {
          const g = typeof it.game === 'object' ? it.game : null
          if (!g) continue
          if (!itemsByGame[g.id])
            itemsByGame[g.id] = {
              title: g.title,
              count: 0,
              kb: 0,
              console: typeof g.console === 'object' ? g.console?.name : '—',
            }
          itemsByGame[g.id].count++
          itemsByGame[g.id].kb += parseInt(it.fileSize ?? '0', 10) || 0
        }
        const topGames = Object.values(itemsByGame)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .map((g) => ({ title: g.title, itemCount: g.count, totalKb: g.kb, console: g.console }))

        const cmap: Record<number, ConsoleStats> = {}
        for (const c of allConsoles)
          cmap[c.id] = { id: c.id, name: c.name, slug: c.slug, games: 0, items: 0, totalKb: 0 }
        for (const g of allGames) {
          const cid = typeof g.console === 'object' ? g.console?.id : g.console
          if (cmap[cid]) cmap[cid].games++
        }
        for (const it of allItems) {
          const g = typeof it.game === 'object' ? it.game : null
          if (!g) continue
          const cid = typeof g.console === 'object' ? g.console?.id : g.console
          if (cmap[cid]) {
            cmap[cid].items++
            cmap[cid].totalKb += parseInt(it.fileSize ?? '0', 10) || 0
          }
        }
        const consoleStats = Object.values(cmap)
          .filter((c) => c.games > 0 || c.items > 0)
          .sort((a, b) => b.items - a.items)

        setStats({
          consoles: cd.totalDocs ?? 0,
          games: gd.totalDocs ?? 0,
          categories: catd.totalDocs ?? 0,
          items: id.totalDocs ?? 0,
          articles: ad.totalDocs ?? 0,
          totalKb,
          topGames,
          consoleStats,
          recentGames: allGames.slice(0, 6).map((g: any) => ({
            title: g.title,
            createdAt: g.createdAt,
            console: typeof g.console === 'object' ? g.console?.name : '—',
          })),
          recentItems: allItems.slice(0, 6).map((it: any) => ({
            name: it.name,
            createdAt: it.createdAt,
            game: typeof it.game === 'object' ? it.game?.title : '—',
            fileSize: it.fileSize ?? '0',
          })),
        })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading)
    return (
      <div className="ps-page">
        <Style />
        <div className="ps-header">
          <div className="ps-wrap">
            <h1 className="ps-h1">Statistiques</h1>
          </div>
        </div>
        <div
          className="ps-wrap"
          style={{
            paddingTop: 40,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 300,
          }}
        >
          <div className="ps-spinner" />
        </div>
      </div>
    )

  if (!stats) return null

  const avgItemsPerGame = stats.games > 0 ? (stats.items / stats.games).toFixed(1) : '0'
  const avgSizePerItem =
    stats.items > 0 ? formatSize(Math.round(stats.totalKb / stats.items)) : '0 KB'

  return (
    <div className="ps-page">
      <Style />

      <div className="ps-header">
        <div className="ps-wrap">
          <h1 className="ps-h1">Statistiques</h1>
        </div>
      </div>

      <div className="ps-wrap">
        {/* ── Section 1: KPI tiles ── */}
        <div className="ps-section-title">Vue globale</div>
        <div className="ps-grid-6">
          {[
            { label: 'Consoles', value: stats.consoles, unit: null, i: 0 },
            { label: 'Jeux', value: stats.games, unit: null, i: 1 },
            { label: 'Catégories', value: stats.categories, unit: null, i: 2 },
            { label: 'Items', value: stats.items, unit: null, i: 3 },
            { label: 'Articles', value: stats.articles, unit: null, i: 4 },
            { label: 'Taille archive', value: formatSize(stats.totalKb), unit: null, i: 5 },
            { label: 'Moy. items / jeu', value: avgItemsPerGame, unit: null, i: 6 },
            { label: 'Taille moy. item', value: avgSizePerItem, unit: null, i: 7 },
          ].map(({ label, value, i }) => {
            const p = P[i % P.length]
            return (
              <div
                key={label}
                className="ps-tile ps-tile-kpi"
                style={{ background: p.bg, borderColor: p.border }}
              >
                <p className="ps-tile-label" style={{ color: p.text }}>
                  {label}
                </p>
                <p className="ps-tile-value" style={{ color: p.text }}>
                  {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
                </p>
                <Sparkline data={WAVES[i % WAVES.length]} color={p.text} />
              </div>
            )
          })}
        </div>

        {/* ── Section 2: Console tiles ── */}
        <div className="ps-section-title">Par console</div>
        <div className="ps-grid-auto">
          {stats.consoleStats.map((c, i) => {
            const p = P[i % P.length]
            return (
              <div
                key={c.id}
                className="ps-tile ps-tile-console"
                style={{ background: p.bg, borderColor: p.border }}
              >
                <p className="ps-tile-label" style={{ color: p.text }}>
                  {c.name}
                </p>
                <p className="ps-tile-value" style={{ color: p.text }}>
                  {c.items.toLocaleString('fr-FR')}
                </p>
                <p className="ps-tile-meta" style={{ color: p.text }}>
                  {c.games} jeux · {formatSize(c.totalKb)}
                </p>
                <Sparkline data={WAVES[i % WAVES.length]} color={p.text} />
              </div>
            )
          })}
        </div>

        {/* ── Section 3: Top games as tiles ── */}
        <div className="ps-section-title">Top 10 jeux par items</div>
        <div className="ps-grid-auto">
          {stats.topGames.map((g, i) => {
            const p = P[i % P.length]
            return (
              <div
                key={i}
                className="ps-tile ps-tile-game"
                style={{ background: p.bg, borderColor: p.border }}
              >
                <p className="ps-tile-label" style={{ color: p.text }} title={g.title}>
                  {g.title.length > 18 ? g.title.slice(0, 18) + '…' : g.title}
                </p>
                <p className="ps-tile-value" style={{ color: p.text }}>
                  {g.itemCount}
                </p>
                <p className="ps-tile-meta" style={{ color: p.text }}>
                  {g.console} · {formatSize(g.totalKb)}
                </p>
                <Sparkline data={WAVES[i % WAVES.length]} color={p.text} />
              </div>
            )
          })}
        </div>

        {/* ── Section 4: Recent tiles ── */}
        <div className="ps-recent-row">
          <div className="ps-recent-col">
            <div className="ps-section-title" style={{ marginBottom: 12 }}>
              Jeux récents
            </div>
            <div className="ps-grid-2">
              {stats.recentGames.map((g, i) => {
                const p = P[i % P.length]
                return (
                  <div
                    key={i}
                    className="ps-tile ps-tile-recent"
                    style={{ background: p.bg, borderColor: p.border }}
                  >
                    <p className="ps-tile-label" style={{ color: p.text }}>
                      {g.console}
                    </p>
                    <p className="ps-tile-name" style={{ color: p.text }} title={g.title}>
                      {g.title.length > 16 ? g.title.slice(0, 16) + '…' : g.title}
                    </p>
                    <p className="ps-tile-date" style={{ color: p.text }}>
                      {new Date(g.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                    <Sparkline data={WAVES[i % WAVES.length]} color={p.text} />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="ps-recent-col">
            <div className="ps-section-title" style={{ marginBottom: 12 }}>
              Items récents
            </div>
            <div className="ps-grid-2">
              {stats.recentItems.map((it, i) => {
                const p = P[(i + 2) % P.length]
                const kb = parseInt(it.fileSize, 10) || 0
                return (
                  <div
                    key={i}
                    className="ps-tile ps-tile-recent"
                    style={{ background: p.bg, borderColor: p.border }}
                  >
                    <p className="ps-tile-label" style={{ color: p.text }} title={it.game}>
                      {it.game.length > 14 ? it.game.slice(0, 14) + '…' : it.game}
                    </p>
                    <p className="ps-tile-name" style={{ color: p.text }} title={it.name}>
                      {it.name.length > 16 ? it.name.slice(0, 16) + '…' : it.name}
                    </p>
                    <p className="ps-tile-date" style={{ color: p.text }}>
                      {formatSize(kb)} · {new Date(it.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                    <Sparkline data={WAVES[i % WAVES.length]} color={p.text} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Style() {
  return (
    <style>{`
      .ps-page {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      /* Header */
      .ps-header {
        position: sticky;
        top: 0;
        z-index: 10;
        background-color: var(--theme-bg);
        border-bottom: 1px solid var(--theme-border-color);
      }

      /* Centered wrapper */
      .ps-wrap {
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
        padding: 0 32px;
        box-sizing: border-box;
      }

      .ps-header .ps-wrap {
        display: flex;
        align-items: center;
        padding-top: 18px;
        padding-bottom: 18px;
      }

      .ps-h1 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--theme-text);
      }

      /* Content wrap */
      .ps-page > .ps-wrap {
        padding-top: 28px;
        padding-bottom: 48px;
        display: flex;
        flex-direction: column;
        gap: 28px;
      }

      /* Section labels */
      .ps-section-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.09em;
        color: var(--theme-text-dim);
        margin-bottom: -16px;
      }

      /* ── Grids ── */
      .ps-grid-6 {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
        gap: 12px;
      }
      .ps-grid-auto {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
        gap: 12px;
      }
      .ps-grid-2 {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 10px;
      }
      .ps-recent-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 28px;
        align-items: start;
      }
      .ps-recent-col {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 0;
      }

      /* ── Tiles ── */
      .ps-tile {
        border-radius: 14px;
        border: 1px solid transparent;
        overflow: hidden;
        position: relative;
        display: flex;
        flex-direction: column;
        padding: 16px 18px 0;
        box-sizing: border-box;
      }

      .ps-tile-kpi {
        height: 120px;
      }
      .ps-tile-console {
        height: 115px;
      }
      .ps-tile-game {
        height: 115px;
      }
      .ps-tile-recent {
        height: 105px;
      }

      .ps-tile-label {
        margin: 0 0 3px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        opacity: 0.7;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ps-tile-value {
        margin: 0;
        font-size: 2rem;
        font-weight: 700;
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }
      .ps-tile-meta {
        margin: 4px 0 0;
        font-size: 11px;
        opacity: 0.65;
        font-weight: 500;
      }
      .ps-tile-name {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
        line-height: 1.2;
      }
      .ps-tile-date {
        margin: 3px 0 0;
        font-size: 11px;
        opacity: 0.6;
      }

      /* Loading */
      .ps-spinner {
        width: 28px;
        height: 28px;
        border: 2px solid rgba(0,0,0,0.1);
        border-top-color: #888;
        border-radius: 50%;
        animation: ps-spin 0.65s linear infinite;
      }
      @keyframes ps-spin { to { transform: rotate(360deg); } }

      @media (max-width: 700px) {
        .ps-recent-row { grid-template-columns: 1fr; }
        .ps-wrap { padding: 0 16px; }
      }
    `}</style>
  )
}
