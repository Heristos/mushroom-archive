'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SquareBtn from './squarebtn'
import Icon from './Icon'

export default function SearchInput() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = () => {
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className="hidden lg:flex items-center gap-1">
      <input
        type="text"
        placeholder="Search bar"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        className="bg-(--color-main) p-2 text-sm h-8 outline-none text-white"
        style={{
          boxShadow: 'inset 3px 3px 0px var(--dark-main), inset -3px -3px 0px var(--light-main)',
        }}
      />
      <SquareBtn
        href="#"
        onClick={(e) => {
          e.preventDefault()
          handleSearch()
        }}
      >
        <Icon icon="bill-ball" />
      </SquareBtn>
    </div>
  )
}
