import Image from 'next/image'
import Link from 'next/link'
import Icon from './component/Icon'

export default function NotFound() {
  return (
    <html>
      <body>
        <main className="container mx-auto py-64 text-center">
          <Image
            src="/image/404.gif"
            alt="Illustration d'une page introuvable avec un château"
            width={64}
            height={64}
            loading="eager"
            className="mb-8 mx-auto scale-512"
          />

          <article className="mt-48 p-8">
            {/* Title */}
            <h1 className="text-4xl font-bold mb-8">Oups ! Erreur 404</h1>

            {/* Body */}
            <section className="text-lg leading-relaxed">
              <p className="mb-4">
                Il semble que cette page se trouve dans un autre <Icon icon="castle" size="xxl" />{' '}
                château...
              </p>

              <p className="mb-4">Retournez au royaume champignon pour continuer votre chemin !</p>
            </section>
          </article>

          <Link
            href="/"
            className="inline-block bg-red-600 
              hover:bg-red-500 
              active:bg-red-800 
              active:shadow-[inset_3px_3px_0_var(--dark-main),inset_-3px_-3px_0_var(--light-main)] 
              shadow-[inset_3px_3px_0_var(--light-main),inset_-3px_-3px_0_var(--dark-main)] 
              font-bold py-2 px-6 animate-pulse hover:animate-none active:animate-none"
            aria-label="Retourner à la page d'accueil"
          >
            Retour à l&apos;Accueil
          </Link>
        </main>
      </body>
    </html>
  )
}
