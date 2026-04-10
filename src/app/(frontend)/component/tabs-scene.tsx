"use client";

import { useState, useCallback } from "react";
import Card from "@/app/component/card";

interface Subfolder {
  folder: string;
  name: string;
  iconUrl?: string | null;
}

interface FolderWithSubfolders {
  folder: string;
  subfolders: Subfolder[];
}

interface TabsSceneProps {
  foldersWithSubfolders: FolderWithSubfolders[];
  slug: string;
  gameSlug: string;
}

function TabPanel({
  folder,
  subfolders,
  slug,
  gameSlug,
}: {
  folder: string;
  subfolders: Subfolder[];
  slug: string;
  gameSlug: string;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-4">
      {subfolders.map((subfolder, index) => {
        if (!subfolder.folder) return null;
        return (
          <div
            key={subfolder.folder}
            style={{
              opacity: 0,
              animation: "cardAppear 0.35s ease forwards",
              animationDelay: `${index * 60}ms`,
            }}
          >
            <Card
              title={subfolder.name}
              type={slug}
              image={subfolder.iconUrl ?? "/icon/star.webp"}
              href={`/${slug}/${gameSlug}/${folder}/${subfolder.folder}`}
              loading="lazy"
            />
          </div>
        );
      })}
    </div>
  );
}

export default function TabsScene({
  foldersWithSubfolders,
  slug,
  gameSlug,
}: TabsSceneProps) {
  const firstFolder = foldersWithSubfolders[0]?.folder ?? "";
  const [activeTab, setActiveTab] = useState<string>(firstFolder);
  const [visited, setVisited] = useState<Set<string>>(() => new Set([firstFolder]));

  const handleTabClick = useCallback(
    (folder: string) => {
      if (folder === activeTab) return;
      setActiveTab(folder);
      setVisited((prev) => {
        if (prev.has(folder)) return prev;
        const next = new Set(prev);
        next.add(folder);
        return next;
      });
    },
    [activeTab]
  );

  return (
    <div className="w-full">
      <style>{`
        @keyframes cardAppear {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        role="tablist"
        aria-label="Game sections"
        className="w-full bg-gray-700 p-2 shadow-[inset_3px_3px_0_var(--light-main),inset_-3px_-3px_0_var(--dark-main)] flex gap-1 overflow-x-auto scrollbar-none"
      >
        {foldersWithSubfolders.map(({ folder }) => {
          const isActive = folder === activeTab;
          return (
            <button
              key={folder}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${folder}`}
              id={`tab-${folder}`}
              onClick={() => handleTabClick(folder)}
              className={[
                "relative px-4 py-2.5 text-xs font-medium capitalize cursor-pointer",
                "border-none outline-none whitespace-nowrap",
                "bg-(--color-main)",
                isActive
                  ? "shadow-[inset_3px_3px_0_var(--dark-main),inset_-3px_-3px_0_var(--light-main)]"
                  : "shadow-[inset_3px_3px_0_var(--light-main),inset_-3px_-3px_0_var(--dark-main)]",
              ].join(" ")}
            >
              {folder}
            </button>
          );
        })}
      </div>

      {foldersWithSubfolders.map(({ folder, subfolders }) => {
        if (!visited.has(folder)) return null;
        const isActive = folder === activeTab;
        return (
          <div
            key={folder}
            id={`tabpanel-${folder}`}
            role="tabpanel"
            aria-labelledby={`tab-${folder}`}
            hidden={!isActive}
            className="p-4"
          >
            {subfolders.length > 0 ? (
              <TabPanel
                folder={folder}
                subfolders={subfolders}
                slug={slug}
                gameSlug={gameSlug}
              />
            ) : (
              <p className="text-sm text-center opacity-40 py-8">
                No items in this section.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
