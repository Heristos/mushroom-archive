import Link from "next/link";
import Icon from "./Icon";

export default async function NavItem({
  href,
  label,
  children,
  icon,
}: {
  href: string;
  label: string;
  children?: React.ReactNode;
  icon?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 px-2 py-1 text-lg
                 text-white text-shadow-black no-underline
                 transition-colors duration-300 hover:text-gray-400"
    >
      {children}
      <span className="flex items-center gap-1">
        {icon && <Icon icon={icon} />}
        {label}
      </span>
    </Link>
  );
}
