import TitleSidebar from "./title-sidebar";
import SidebarLink from "./sidebar-link";
import Icon from "./Icon";
import { getAllPlatforms, getGameList } from "@/app/api";
import Image from "next/image";

export default async function RightSidebar() {
  const [consoles, games] = await Promise.all([
    getAllPlatforms(),
    getGameList(),
  ]);

  const topConsoles = consoles.slice(0, 5);
  const recentGames = games.slice(0, 10);

  return (
    <aside className="
      sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto
      flex flex-col gap-4 bg-(--color-main)
      shadow-[inset_3px_3px_0_var(--dark-main),inset_-3px_-3px_0_var(--dark-main)]
      w-0 md:w-56 lg:w-70 transition-all duration-300
    ">
      <TitleSidebar title="Popular Consoles" />
      <ul className="flex flex-col gap-2 p-1">
        {topConsoles.map((c: { name: string; slug: string; icon?: string | null }) => (
          <SidebarLink
            key={c.slug}
            href={`/${c.slug}`}
            label={c.name}
            activeEnabled={false}
            icon={
              c.icon ? (
                <Image
                  src={`/icon/${c.icon}.webp`}
                  alt={c.name}
                  width={20}
                  height={20}
                  style={{ objectFit: 'contain' }}
                />
              ) : undefined
            }
          />
        ))}
      </ul>

      <TitleSidebar title="Popular Games" />
      <ul className="flex flex-col gap-2 p-1">
        {recentGames.map((g: { title: string; slug: string; icon?: string | null; console: { slug: string } }) => (
          <SidebarLink
            key={g.slug}
            href={`/${g.console?.slug}/${g.slug}`}
            label={g.title}
            icon={
              g.icon ? (
                <Image
                  src={`/icon/${g.icon}.webp`}
                  alt={g.title}
                  width={20}
                  height={20}
                  style={{ objectFit: 'contain' }}
                />
              ) : undefined
            }
            activeEnabled={false}
          />
        ))}
      </ul>
    </aside>
  );
}
