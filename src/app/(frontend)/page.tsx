import Image from "next/image";
import Icon from "./component/Icon";
import AlphabetFilter from "./component/alphabet-filter";

export default function Home() {
  return (
    <main className="px-4">
      {/* Banner */}
      <Image
        src={"/image/banner.webp"}
        alt={"Banner"}
        width={800}
        height={400}
        className="mx-auto mt-16 w-full max-w-3xl object-contain"
      />

      <article className="mt-16">
        {/* Title */}
        <h1 className="text-xl sm:text-2xl lg:text-2xl font-bold mb-2 flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-4">
          <Icon icon={"bowser"} size="l"></Icon>
          Bienvenue sur THE NINTENDO RESOURCE
        </h1>

        <p className="text-white/50 mb-6 text-xs sm:text-sm lg:text-sm">
          Posted by NintenArc — February 18, 2026
        </p>

        {/* Body */}
        <div className="text-white/90 space-y-4">
          <p className="text-sm sm:text-base lg:text-sm">
            THE NINTENDO RESOURCE est une plateforme dédiée à l&apos;archivage
            et à la mise à disposition des ressources originales issues des jeux
            Nintendo.
          </p>

          <p className="text-sm sm:text-base lg:text-sm">
            Vous trouverez ici des modèles 3D, textures, sprites, effets sonores
            et musiques, tous extraits directement des jeux d&apos;origine.
          </p>

          <p className="text-sm sm:text-base lg:text-sm">
            Chaque fichier proposé au téléchargement est conservé dans son état
            brut : aucune modification, aucune retouche, aucune altération du
            rendu final. Les géométries restent intactes, les textures
            conservent leur résolution native, les sprites leur format original
            et les pistes audio leur qualité source.
          </p>

          <p className="text-sm sm:text-base lg:text-sm">
            Le site s&apos;adresse aux développeurs, artistes, archivistes et
            passionnés souhaitant analyser, étudier ou référencer les ressources
            techniques des jeux Nintendo dans leur forme authentique.
          </p>

          <h2 className="text-base sm:text-lg lg:text-base font-bold mt-4 mb-2">
            Contenu disponible sur le site :
          </h2>

          <ul className="list-disc list-inside space-y-2">
            <li className="flex items-start gap-2 text-sm sm:text-base lg:text-sm">
              <Icon icon="squid"></Icon>Modèles 3D originaux, retranscrits vers
              des formats standards
            </li>
            <li className="flex items-start gap-2 text-sm sm:text-base lg:text-sm">
              <Icon icon="polished-brick"></Icon>Textures extraites,
              retranscrites vers des formats standards
            </li>
            <li className="flex items-start gap-2 text-sm sm:text-base lg:text-sm">
              <Icon icon="mario"></Icon>Sprites et assets 2D, retranscrits vers
              des formats standards
            </li>
            <li className="flex items-start gap-2 text-sm sm:text-base lg:text-sm">
              <Icon icon="green-koopa"></Icon>Effets sonores bruts, retranscrits
              vers des formats standards
            </li>
            <li className="flex items-start gap-2 text-sm sm:text-base lg:text-sm">
              <Icon icon="spiny"></Icon>Musiques issues directement des jeux,
              retranscrites vers des formats standards
            </li>
          </ul>

          <p className="text-sm sm:text-base lg:text-sm mt-4 sm:mt-6">
            Explorez. Téléchargez. Analysez. Toutes les ressources sont
            organisées de manière structurée afin de garantir un accès rapide et
            efficace aux fichiers.
          </p>
          <br/>
        </div>
      </article>
    </main>
  );
}
