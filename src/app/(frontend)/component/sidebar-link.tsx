"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarLinkProps = {
  href?: string;
  label: string;
  activeEnabled?: boolean;
  icon?: React.ReactNode;
};

export default function SidebarLink({
  href,
  label,
  activeEnabled = false,
  icon,
}: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive =
    activeEnabled && href
      ? pathname === href || pathname.startsWith(href + "/")
      : false; // isActive est true uniquement si activeEnabled et href existent, et que l'URL courante est exactement href ou commence par href + "/".

  if (!href) {
    return (
      <li className="overflow-hidden w-full">
        <span className="flex items-center gap-2 text-white/50 text-sm p-1 cursor-default">
          {icon}
          {label}
        </span>
      </li>
    );
  }

  const shouldAnimate = label.length > 28;

  return (
    <li className="overflow-hidden w-full">
      <Link
        href={href}
        className={`flex items-center gap-2 text-sm p-1 transition-colors duration-300 ${
          isActive
            ? "text-white bg-(--color-active-main) shadow-[inset_3px_3px_0_var(--dark-main),inset_-3px_-3px_0_var(--light-main)] font-semibold"
            : "text-white/90 hover:text-white hover:bg-white/25"
        }`}
      >
        {shouldAnimate ? (
          <div className="overflow-hidden w-full">
            <div className="flex w-max animate-marquee whitespace-nowrap">
              <span>
                {icon}
                {label}
                <span className="px-4">-</span>
              </span>
              <span>
                {icon}
                {label}
                <span className="px-4">-</span>
              </span>
            </div>
          </div>
        ) : (
          <span className="whitespace-nowrap flex items-start gap-2">
            {icon}
            {label}
          </span>
        )}
      </Link>
    </li>
  );
}
