import Image from 'next/image'
import SquareBtn from './squarebtn'
import NavItem from './nav-item'
import Link from 'next/link'
import Icon from './Icon'
import BurgerMenu from './burger-menu'
import { getAllPlatforms, getGameList } from '@/app/api'
import SearchInput from './search-input'

export default async function Header() {
  const [consoles, games] = await Promise.all([getAllPlatforms(), getGameList()])

  return (
    <header
      className="sticky top-0 z-50 bg-(--color-main) text-white flex items-center h-16 p-4 gap-3"
      style={{
        boxShadow: 'inset 3px 3px 0px var(--light-main), inset -3px -3px 0px var(--dark-main)',
      }}
    >
      <div className="relative h-12 w-70 shrink-0 max-md:absolute max-md:left-1/2 max-md:-translate-x-1/2 z-0">
        <Link href="/">
          <Image
            src="/image/logo.png"
            alt="The Nintendo Resource"
            fill
            loading="eager"
            className="object-contain object-center"
          />
        </Link>
      </div>

      <div className="hidden lg:flex items-center gap-1">
        <SearchInput />
      </div>

      <nav className="hidden md:flex gap-4 ml-4">
        <NavItem href="/" label="Home" />
        <NavItem href="/stats" label="Stats" />
        <NavItem href="/help" label="Help" />
      </nav>

      <div className="md:hidden ml-auto relative z-20">
        <BurgerMenu consoles={consoles} games={games} />
      </div>
    </header>
  )
}
