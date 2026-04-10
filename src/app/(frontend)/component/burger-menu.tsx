'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Console = { name: string; slug: string; icon?: string | null }
type Game = { title: string; slug: string; console: { slug: string } }
type SectionKey = 'consoles' | 'latestGames'

export default function BurgerMenu({ consoles, games }: { consoles: Console[]; games: Game[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    consoles: false,
    latestGames: false,
  })

  const recentGames = games.slice(0, 10)

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setIsOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const toggleSection = (key: SectionKey) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <>
      <button
        className="ml-auto md:hidden flex items-center justify-center w-10 h-10 text-white"
        style={{ boxShadow: isOpen ? 'inset 3px 3px 0px var(--dark-main), inset -3px -3px 0px var(--light-main)' : 'inset 3px 3px 0px var(--light-main), inset -3px -3px 0px var(--dark-main)' }}
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        <span className="text-xl leading-none">{isOpen ? '✕' : '☰'}</span>
      </button>

      <div
        className="fixed left-0 top-16 z-40 w-full overflow-y-auto"
        style={{
          height: 'calc(100vh - 4rem)',
          background: 'var(--color-main)',
          boxShadow: 'inset 3px 3px 0px var(--light-main), inset -3px -3px 0px var(--dark-main)',
          transform: isOpen ? 'translateY(0)' : 'translateY(-120%)',
          transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <nav className="flex flex-col py-4">
          <Link href="/" onClick={() => setIsOpen(false)}
            className="flex items-center gap-4 px-6 py-4 text-white font-bold tracking-widest uppercase text-base hover:bg-(--color-active-main) transition-colors"
            style={{ boxShadow: 'inset 0 -2px 0 var(--dark-main)' }}>
            <span>🏠</span>Home
          </Link>

          {/* Consoles Section */}
          <div>
            <button onClick={() => toggleSection('consoles')}
              className="w-full flex items-center justify-between px-6 py-4 text-white font-bold tracking-widest uppercase text-base hover:bg-(--color-active-main) transition-colors"
              style={{ boxShadow: 'inset 0 -2px 0 var(--dark-main)' }}>
              <span>Consoles</span>
              <span style={{ display: 'inline-block', transition: 'transform 0.2s', transform: openSections.consoles ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
            </button>
            <div style={{ maxHeight: openSections.consoles ? '1000px' : '0', overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              {consoles.map((c) => {
                const iconUrl = c.icon ? `/icon/${c.icon}.webp` : '/icon/default.webp'
                return (
                  <Link key={c.slug} href={`/${c.slug}`} onClick={() => setIsOpen(false)}
                    className="flex items-center gap-4 pl-12 pr-6 py-3 text-white text-sm hover:bg-(--color-active-main) transition-colors"
                    style={{ boxShadow: 'inset 0 -1px 0 var(--dark-main)' }}>
                    <Image
                      src={iconUrl}
                      alt={c.name}
                      width={20}
                      height={20}
                      style={{ objectFit: 'contain' }}
                    />
                    {c.name}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Latest Games Section */}
          <div>
            <button onClick={() => toggleSection('latestGames')}
              className="w-full flex items-center justify-between px-6 py-4 text-white font-bold tracking-widest uppercase text-base hover:bg-(--color-active-main) transition-colors"
              style={{ boxShadow: 'inset 0 -2px 0 var(--dark-main)' }}>
              <span>Latest Games</span>
              <span style={{ display: 'inline-block', transition: 'transform 0.2s', transform: openSections.latestGames ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
            </button>
            <div style={{ maxHeight: openSections.latestGames ? '1000px' : '0', overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              {recentGames.map((g) => (
                <Link key={g.slug} href={`/${g.console?.slug}/${g.slug}`} onClick={() => setIsOpen(false)}
                  className="flex items-center gap-4 pl-12 pr-6 py-3 text-white text-sm hover:bg-(--color-active-main) transition-colors"
                  style={{ boxShadow: 'inset 0 -1px 0 var(--dark-main)' }}>
                  {g.title}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </>
  )
}