import fs from 'fs'
import path from 'path'
import FormData from 'form-data'
import fetch from 'node-fetch'

const API_URL = 'http://localhost:3000/api'

const IMPORT_DIR = process.argv[2]    // chemin du dossier
const GAME_SLUG = process.argv[3]     // ex: pokemon-scarlet
const CATEGORY_NAME = process.argv[4] // ex: EUR

if (!IMPORT_DIR || !GAME_SLUG || !CATEGORY_NAME) {
  console.error('Usage: node scripts/import.mjs <dossier> <game-slug> <categorie>')
  console.error('Ex:    node scripts/import.mjs ./import pokemon-scarlet EUR')
  process.exit(1)
}

async function login() {
  const res = await fetch(`${API_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.PAYLOAD_EMAIL,
      password: process.env.PAYLOAD_PASSWORD,
    }),
  })
  const data = await res.json()
  if (!data.token) throw new Error('Login échoué, vérifie PAYLOAD_EMAIL et PAYLOAD_PASSWORD')
  return data.token
}

async function findGame(slug, token) {
  const res = await fetch(`${API_URL}/games?where[slug][equals]=${slug}`, {
    headers: { Authorization: `JWT ${token}` },
  })
  const data = await res.json()
  if (!data.docs.length) throw new Error(`Jeu "${slug}" introuvable !`)
  return data.docs[0]
}

async function findCategory(name, gameId, token) {
  const res = await fetch(`${API_URL}/categories?where[name][equals]=${name}&where[game][equals]=${gameId}`, {
    headers: { Authorization: `JWT ${token}` },
  })
  const data = await res.json()
  if (!data.docs.length) throw new Error(`Catégorie "${name}" introuvable pour ce jeu !`)
  return data.docs[0]
}

async function uploadMedia(filePath, token) {
  const form = new FormData()
  form.append('file', fs.createReadStream(filePath))
  form.append('alt', path.basename(filePath))
  const res = await fetch(`${API_URL}/media`, {
    method: 'POST',
    headers: { Authorization: `JWT ${token}`, ...form.getHeaders() },
    body: form,
  })
  const data = await res.json()
  return data.doc
}

async function createItem(name, categoryId, iconId, zipId, token) {
  const res = await fetch(`${API_URL}/items`, {
    method: 'POST',
    headers: { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      category: categoryId,
      icon: iconId,
      zipFile: zipId,
    }),
  })
  const data = await res.json()
  return data.doc
}

async function main() {
  console.log('🔐 Connexion...')
  const token = await login()

  console.log(`🎮 Recherche du jeu "${GAME_SLUG}"...`)
  const game = await findGame(GAME_SLUG, token)
  console.log(`✅ Jeu trouvé : ${game.title}`)

  console.log(`📂 Recherche de la catégorie "${CATEGORY_NAME}"...`)
  const category = await findCategory(CATEGORY_NAME, game.id, token)
  console.log(`✅ Catégorie trouvée : ${category.name}`)

  const subDirs = fs.readdirSync(IMPORT_DIR).filter(f =>
    fs.statSync(path.join(IMPORT_DIR, f)).isDirectory()
  )

  console.log(`\n📦 ${subDirs.length} items à importer...\n`)

  for (const dir of subDirs) {
    const dirPath = path.join(IMPORT_DIR, dir)
    const iconPath = path.join(dirPath, 'icon.webp')
    const zipFile = fs.readdirSync(dirPath).find(f => f.endsWith('.zip'))

    if (!zipFile) {
      console.warn(`⚠️  Pas de ZIP dans "${dir}", ignoré`)
      continue
    }
    if (!fs.existsSync(iconPath)) {
      console.warn(`⚠️  Pas d'icon.webp dans "${dir}", ignoré`)
      continue
    }

    const zipPath = path.join(dirPath, zipFile)

    console.log(`⬆️  Upload icon pour "${dir}"...`)
    const icon = await uploadMedia(iconPath, token)

    console.log(`⬆️  Upload ZIP pour "${dir}"...`)
    const zip = await uploadMedia(zipPath, token)

    console.log(`✨ Création de l'item "${dir}"...`)
    await createItem(dir, category.id, icon.id, zip.id, token)

    console.log(`✅ "${dir}" importé !\n`)
  }

  console.log('🎉 Import terminé !')
}

main().catch(err => {
  console.error('❌ Erreur :', err.message)
  process.exit(1)
})
