'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

type Article = {
  id: string
  title: string
  author?: string
  publishedAt?: string
  content?: any
}

function renderNodes(nodes: any[]): React.ReactNode {
  return nodes.map((node, i) => renderNode(node, i))
}

function renderNode(node: any, key: number): React.ReactNode {
  switch (node.type) {
    case 'text': {
      let el: React.ReactNode = node.text
      if (node.format & 1) el = <strong>{el}</strong>
      if (node.format & 2) el = <em>{el}</em>
      if (node.format & 4) el = <u>{el}</u>
      if (node.format & 8) el = <s>{el}</s>
      if (node.format & 16) el = <code className="bg-white/10 px-1 rounded text-sm">{el}</code>
      return <span key={key}>{el}</span>
    }
    case 'paragraph':
      return (
        <p key={key} className="mb-3 leading-relaxed">
          {renderNodes(node.children)}
        </p>
      )
    case 'heading': {
      const Tag = node.tag
      const styles: Record<string, string> = {
        h1: 'text-3xl font-bold mt-8 mb-4',
        h2: 'text-2xl font-bold mt-6 mb-3',
        h3: 'text-xl font-semibold mt-5 mb-2',
        h4: 'text-lg font-semibold mt-4 mb-2',
      }
      return (
        <Tag key={key} className={styles[node.tag] ?? 'font-semibold mt-4 mb-2'}>
          {renderNodes(node.children)}
        </Tag>
      )
    }
    case 'list': {
      const List = node.listType === 'number' ? 'ol' : 'ul'
      return (
        <List
          key={key}
          className={`mb-3 pl-6 ${node.listType === 'number' ? 'list-decimal' : 'list-disc'}`}
        >
          {node.children.map((item: any, i: number) => (
            <li key={i} className="mb-1">
              {renderNodes(item.children)}
            </li>
          ))}
        </List>
      )
    }
    case 'link':
    case 'autolink':
      return (
        <a key={key} href={node.fields?.url ?? node.url ?? '#'} className="text-blue-400 underline">
          {renderNodes(node.children)}
        </a>
      )
    case 'quote':
      return (
        <blockquote key={key} className="border-l-2 border-white/30 pl-4 my-3 italic text-white/60">
          {renderNodes(node.children)}
        </blockquote>
      )
    default:
      return null
  }
}

function ArticleContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? '1'

  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/articles/${id}?depth=2&draft=false&locale=undefined&trash=false`,
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setArticle)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="px-6 py-4">Chargement…</p>
  if (error) return <p className="px-6 py-4">Erreur : {error}</p>
  if (!article) return null

  return (
    <article className="px-6 lg:px-16 py-12">
      <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
      <p className="text-white/50 text-sm mb-8">
        Posted by {article.author ?? 'MushArchive Team'} —{' '}
        {article.publishedAt
          ? new Date(article.publishedAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : ''}
      </p>
      <div>{article.content?.root?.children && renderNodes(article.content.root.children)}</div>
    </article>
  )
}

export default function ArticlePage() {
  return (
    <Suspense fallback={<p className="px-6 py-4">Chargement…</p>}>
      <ArticleContent />
    </Suspense>
  )
}
