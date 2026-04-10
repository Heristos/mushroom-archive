import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import JSZip from 'jszip'

import { resolveItemMediaPath } from '@/lib/media-path'
import type { Console, Game, Category } from '@/payload-types'

interface ImportResult {
  name: string
  status: 'success' | 'error'
  message?: string
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    const formData = await req.formData()
    const gameId = formData.get('gameId') as string
    const categoryId = formData.get('categoryId') as string
    const zipRaw = formData.get('zip') as File | null

    if (!gameId || !categoryId || !zipRaw) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    // Récupère le game (avec console populée) et la category
    const game = await payload.findByID({
      collection: 'games',
      id: Number(gameId),
      depth: 2, // peuple game.console
    })

    const category = await payload.findByID({
      collection: 'categories',
      id: Number(categoryId),
      depth: 1,
    })

    if (!game || typeof game.console === 'number') {
      return NextResponse.json({ error: 'Game ou console introuvable' }, { status: 400 })
    }

    // Parse the outer ZIP
    const outerBuffer = Buffer.from(await zipRaw.arrayBuffer())
    const outerZip = await JSZip.loadAsync(outerBuffer)

    // Group files by top-level folder
    const folders: Record<string, JSZip> = {}

    outerZip.forEach((relativePath, file) => {
      if (file.dir) return
      const parts = relativePath.split('/')
      if (parts.length < 2) return
      const folderName = parts[0]
      if (!folders[folderName]) {
        folders[folderName] = new JSZip()
      }
      folders[folderName].file(parts.slice(1).join('/'), file.nodeStream())
    })

    const results: ImportResult[] = []

    for (const [folderName] of Object.entries(folders)) {
      try {
        const iconFile = outerZip.file(`${folderName}/icon.webp`)

        let innerZipFile: JSZip.JSZipObject | null = null
        outerZip.forEach((relativePath, file) => {
          if (
            relativePath.startsWith(`${folderName}/`) &&
            relativePath.endsWith('.zip') &&
            !file.dir
          ) {
            innerZipFile = file
          }
        })

        if (!iconFile) {
          results.push({ name: folderName, status: 'error', message: 'icon.webp manquant' })
          continue
        }

        if (!innerZipFile) {
          results.push({ name: folderName, status: 'error', message: 'fichier .zip manquant' })
          continue
        }

        // Construit un item partiel pour résoudre les chemins
        const partialItem = {
          id: 0,
          name: folderName,
          game: game as Game & { console: Console },
          category: category as Category,
          updatedAt: '',
          createdAt: '',
        }

        const iconPath = resolveItemMediaPath(partialItem, 'icon.webp')

        const innerZipFileName =
          (innerZipFile as JSZip.JSZipObject).name.split('/').pop() || `${folderName}.zip`
        const zipPath = resolveItemMediaPath(partialItem, innerZipFileName)

        // Upload icon
        const iconBuffer = Buffer.from(await iconFile.async('arraybuffer'))

        const iconMedia = await payload.create({
          collection: 'items-media',
          data: {
            alt: `${folderName} icon`,
            mediaPath: iconPath.path,
          },
          file: {
            data: iconBuffer,
            mimetype: 'image/webp',
            name: iconPath.filename,
            size: iconBuffer.byteLength,
          },
        })

        // Upload ZIP
        const innerZipBuffer = Buffer.from(
          await (innerZipFile as JSZip.JSZipObject).async('arraybuffer'),
        )

        const zipMedia = await payload.create({
          collection: 'items-media',
          data: {
            alt: `${folderName} zip`,
            mediaPath: zipPath.path,
          },
          file: {
            data: innerZipBuffer,
            mimetype: 'application/zip',
            name: zipPath.filename,
            size: innerZipBuffer.byteLength,
          },
        })

        const fileSizeKB = String(Math.round(innerZipBuffer.byteLength / 1024))

        await payload.create({
          collection: 'items',
          data: {
            name: folderName,
            game: Number(gameId),
            category: Number(categoryId),
            icon: iconMedia.id,
            zipFile: zipMedia.id,
            fileSize: fileSizeKB,
          },
        })

        results.push({ name: folderName, status: 'success' })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue'
        results.push({ name: folderName, status: 'error', message })
      }
    }

    return NextResponse.json({ results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
