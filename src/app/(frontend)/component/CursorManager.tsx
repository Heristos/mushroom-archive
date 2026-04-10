'use client'

import { useEffect } from 'react'

const RESIZE_CLASS_MAP: Record<string, string> = {
  'ew-resize': 'cursor-ew-resize',
  'col-resize': 'cursor-ew-resize',
  'ns-resize': 'cursor-ns-resize',
  'row-resize': 'cursor-ns-resize',
  'nwse-resize': 'cursor-nwse-resize',
  'nesw-resize': 'cursor-nesw-resize',
  'n-resize': 'cursor-ns-resize',
  's-resize': 'cursor-ns-resize',
  'e-resize': 'cursor-ew-resize',
  'w-resize': 'cursor-ew-resize',
  'nw-resize': 'cursor-nwse-resize',
  'se-resize': 'cursor-nwse-resize',
  'ne-resize': 'cursor-nesw-resize',
  'sw-resize': 'cursor-nesw-resize',
}

const RESIZE_CURSOR_VALUES = new Set(Object.keys(RESIZE_CLASS_MAP))

const ALL_CLASSES = ['cursor-grabbing', ...new Set(Object.values(RESIZE_CLASS_MAP))]

const CLICKABLE = [
  'a:not([disabled])',
  'button:not([disabled])',
  '[role="button"]:not([disabled])',
  '[role="link"]',
  'label[for]',
  'select:not([disabled])',
  'summary',
  '[onclick]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

// Remonte le DOM pour trouver un curseur resize déclaré en inline ou data-cursor
function findResizeCursor(el: HTMLElement): string | null {
  let node: HTMLElement | null = el
  while (node && node !== document.documentElement) {
    // 1. data-cursor attribute (notre convention)
    const dataCursor = node.dataset?.cursor
    if (dataCursor && RESIZE_CURSOR_VALUES.has(dataCursor)) return dataCursor

    // 2. Style inline
    const inline = node.style?.cursor
    if (inline && RESIZE_CURSOR_VALUES.has(inline)) return inline

    node = node.parentElement
  }
  return null
}

export default function CursorManager() {
  useEffect(() => {
    // Style temporaire pour lire le vrai curseur natif sans notre !important
    const tempStyle = document.createElement('style')
    tempStyle.textContent = '* { cursor: unset !important; }'

    const clearResize = () =>
      ALL_CLASSES.filter((c) => c !== 'cursor-grabbing').forEach((cls) =>
        document.body.classList.remove(cls),
      )

    const onMouseMove = (e: MouseEvent) => {
      if (document.body.classList.contains('cursor-grabbing')) return

      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      if (!el) return

      // Priorité 1 : chercher un resize déclaré explicitement (inline / data-cursor)
      const explicitResize = findResizeCursor(el)
      if (explicitResize) {
        clearResize()
        const cls = RESIZE_CLASS_MAP[explicitResize]
        if (cls) document.body.classList.add(cls)
        return
      }

      // Priorité 2 : lire le vrai curseur natif en neutralisant notre override
      document.head.appendChild(tempStyle)
      const realCursor = window.getComputedStyle(el).cursor
      document.head.removeChild(tempStyle)

      clearResize()
      const resizeClass = RESIZE_CLASS_MAP[realCursor] ?? null
      if (resizeClass) document.body.classList.add(resizeClass)
    }

    const onMouseDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null
      if (!el) return
      if (el.closest(CLICKABLE)) {
        ALL_CLASSES.forEach((cls) => document.body.classList.remove(cls))
        document.body.classList.add('cursor-grabbing')
      }
    }

    const onMouseUp = () => {
      document.body.classList.remove('cursor-grabbing')
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mouseup', onMouseUp)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mouseup', onMouseUp)
      if (tempStyle.parentNode) document.head.removeChild(tempStyle)
    }
  }, [])

  return null
}
