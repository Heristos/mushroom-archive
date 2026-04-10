'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function OutilsNavGroup() {
  const pathname = usePathname()
  const isStatisticsActive = pathname?.includes('/admin/statistics')
  const isIconGenActive = pathname?.includes('/tools/3d')
  const [isOpen, setIsOpen] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<string>('auto')

  useEffect(() => {
    if (contentRef.current) {
      if (isOpen) {
        const scrollHeight = contentRef.current.scrollHeight
        setHeight(`${scrollHeight}px`)
        setTimeout(() => setHeight('auto'), 200)
      } else {
        const scrollHeight = contentRef.current.scrollHeight
        setHeight(`${scrollHeight}px`)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setHeight('0px'))
        })
      }
    }
  }, [isOpen])

  const linkStyle = {
    textDecoration: 'none',
  }

  const linkHoverStyle = `
    .outils-nav-link:hover .nav__link-label {
      text-decoration: underline;
    }
  `

  return (
    <>
      <style>{linkHoverStyle}</style>
      <div className="nav-group Outils" id="nav-group-Outils">
        <button
          className={`nav-group__toggle ${isOpen ? 'nav-group__toggle--open' : ''}`}
          tabIndex={0}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="nav-group__label">Outils</div>
          <div className="nav-group__indicator">
            <svg
              className="icon icon--chevron nav-group__indicator"
              height="100%"
              style={{
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 200ms ease',
              }}
              viewBox="0 0 20 20"
              width="100%"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path className="stroke" d="M14 8L10 12L6 8" strokeLinecap="square" />
            </svg>
          </div>
        </button>

        <div
          ref={contentRef}
          aria-hidden={!isOpen}
          style={{
            height,
            overflow: 'hidden',
            transition: 'height 200ms ease',
          }}
        >
          <div>
            <div className="nav-group__content">
              <Link
                className={`nav__link outils-nav-link${isStatisticsActive ? ' nav__link--active' : ''}`}
                id="nav-statistics"
                href="/admin/statistics"
                style={linkStyle}
              >
                <span className="nav__link-label">Statistiques</span>
              </Link>
              <Link
                className={`nav__link outils-nav-link${isIconGenActive ? ' nav__link--active' : ''}`}
                id="nav-icon-generator"
                href="/tools/3d"
                style={linkStyle}
              >
                <span className="nav__link-label">Icon Generator</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
