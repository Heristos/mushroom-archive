/**
 * /api/repair-media
 *
 * Script de réparation one-shot pour les entrées items-media dont filename
 * pointe encore vers le nom de fichier plat (ex: "eye-patch.webp") alors que
 * le fichier a déjà été déplacé dans la hiérarchie
 * MEDIA_ROOT/{console}/{game}/{category}/{item}.ext
 *
 * Causes du problème : les hooks afterChange de Media.ts et Items.ts
 * déplaçaient les fichiers sur le disque mais n'actualisaient pas filename
 * ni url dans la base de données.
 *
 * Ce que fait la réparation :
 *  1. Charge tous les items-media dont targetPath est renseigné
 *     mais filename ne contient pas de "/" (= chemin plat, pas encore mis à jour).
 *  2. Pour chacun, vérifie que le fichier existe bien à MEDIA_ROOT/targetPath.
 *  3. Si oui, met à jour filename et url dans la DB.
 *  4. Rapporte les entrées non réparables (fichier introuvable).
 *
 * Utilisation : POST /api/repair-media   (aucun body requis)
 * Protégé par : ?secret=REPAIR_SECRET (env REPAIR_SECRET)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { existsSync } from 'fs'
import path from 'path'

const mediaRoot = process.env.MEDIA_ROOT || 'media'

interface RepairResult {
  id: number
  oldFilename: string
  targetPath: string
  status: 'fixed' | 'missing' | 'skipped'
  message?: string
}

export async function POST(req: NextRequest) {
  // Protection minimale par secret
  const secret = req.nextUrl.searchParams.get('secret')
  if (process.env.REPAIR_SECRET && secret !== process.env.REPAIR_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config })

  // Récupère toutes les entrées items-media avec pagination
  const allDocs: any[] = []
  let page = 1
  while (true) {
    const result = await payload.find({
      collection: 'items-media',
      limit: 100,
      page,
      depth: 0,
    })
    allDocs.push(...result.docs)
    if (page >= result.totalPages) break
    page++
  }

  const results: RepairResult[] = []

  for (const doc of allDocs) {
    const filename   = doc.filename as string | undefined
    const targetPath = doc.targetPath as string | undefined

    // Rien à faire si pas de targetPath ou si filename contient déjà un "/"
    // (= déjà réparé ou créé après le fix)
    if (!targetPath || !filename) {
      results.push({ id: doc.id, oldFilename: filename ?? '', targetPath: targetPath ?? '', status: 'skipped', message: 'targetPath ou filename manquant' })
      continue
    }

    if (filename.includes('/')) {
      results.push({ id: doc.id, oldFilename: filename, targetPath, status: 'skipped', message: 'filename déjà hiérarchique' })
      continue
    }

    // Vérifie que le fichier est bien à l'emplacement cible
    const fullPath = path.resolve(mediaRoot, targetPath)
    if (!existsSync(fullPath)) {
      results.push({ id: doc.id, oldFilename: filename, targetPath, status: 'missing', message: `Fichier introuvable : ${fullPath}` })
      continue
    }

    // Met à jour filename et url
    try {
      await payload.update({
        collection: 'items-media',
        id: doc.id,
        data: {
          filename: targetPath,
          url: `/media/items/${targetPath}`,
        },
      })
      results.push({ id: doc.id, oldFilename: filename, targetPath, status: 'fixed' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      results.push({ id: doc.id, oldFilename: filename, targetPath, status: 'missing', message: `Erreur update DB : ${msg}` })
    }
  }

  const fixed   = results.filter(r => r.status === 'fixed').length
  const missing = results.filter(r => r.status === 'missing').length
  const skipped = results.filter(r => r.status === 'skipped').length

  return NextResponse.json({
    summary: { total: allDocs.length, fixed, missing, skipped },
    details: results,
  })
}
