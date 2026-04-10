"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function AlphabetFilter() {
  const searchParams = useSearchParams();
  const activeLetter = searchParams.get("letter");

  const letters = [
    "#",
    ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
  ];

  const row1 = letters.slice(0, 14);
  const row2 = letters.slice(14);

  return (
    <div className="sticky top-16 z-40 w-full bg-(--color-main) mb-8">
      <nav aria-label="Filtre alphabétique" className="w-full lg:flex">
        <div className="flex w-full">
          {row1.map((letter) => (
            <LetterLink
              key={letter}
              letter={letter}
              isActive={
                letter === "#"
                  ? !activeLetter || activeLetter === "#"
                  : activeLetter === letter
              }
            />
          ))}
        </div>

        <div className="flex w-full lg:hidden">
          {row2.map((letter) => (
            <LetterLink
              key={letter}
              letter={letter}
              isActive={activeLetter === letter}
            />
          ))}
        </div>

        <div className="hidden lg:flex lg:w-full">
          {row2.map((letter) => (
            <LetterLink
              key={letter}
              letter={letter}
              isActive={activeLetter === letter}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}

function LetterLink({
  letter,
  isActive,
}: {
  letter: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={letter === "#" ? "?" : `?letter=${letter}`}
      aria-label={`Filtrer par ${
        letter === "#" ? "tous les jeux" : `lettre ${letter}`
      }`}
      aria-current={isActive ? "page" : undefined}
      className={[
        "flex-1 text-center py-1.5 select-none transition-colors duration-100",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current",
        isActive
          ? "bg-white/20 font-bold shadow-[inset_3px_3px_0_var(--dark-main),inset_-3px_-3px_0_var(--light-main)]"
          : "bg-(--color-main) hover:bg-white/10 active:bg-[--color-active-main] shadow-[inset_3px_3px_0_var(--light-main),inset_-3px_-3px_0_var(--dark-main)] active:shadow-[inset_3px_3px_0_var(--dark-main),inset_-3px_-3px_0_var(--light-main)]",
      ].join(" ")}
    >
      {letter}
    </Link>
  );
}
