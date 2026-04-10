import Link from "next/link";

interface BtnProps {
  href: string;
  title: string;
}

export default function Btn({ href, title }: BtnProps) {
  return (
    <Link
      className="
        bg-(--color-main)
        active:bg-(--color-active-main)
        hover:bg-(--color-hover-main)
        active:shadow-[inset_3px_3px_0_var(--dark-main),inset_-3px_-3px_0_var(--light-main)]
        shadow-[inset_3px_3px_0_var(--light-main),inset_-3px_-3px_0_var(--dark-main)]
        p-2
        inline-block
      "
      href={href}
    >
      {title}
    </Link>
  );
}
