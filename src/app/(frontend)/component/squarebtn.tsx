import Link from "next/link";
import { ReactNode } from "react";

type SquareBtnProps = {
  title?: string;
  children?: ReactNode;
  href?: string;
  className?: string;
  size?: number;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
};

export default function SquareBtn({
  title,
  children,
  href = "/",
  className = "",
  size = 32,
  onClick,
}: SquareBtnProps) {
  const content = title ?? children;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
      bg-[--color-main] 
      active:bg-[--color-active-main] 
      hover:bg-white/10 
      active:shadow-[inset_3px_3px_0_var(--dark-main),inset_-3px_-3px_0_var(--light-main)] 
      shadow-[inset_3px_3px_0_var(--light-main),inset_-3px_-3px_0_var(--dark-main)] 
      flex items-center justify-center ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <div
        style={{
          width: "50%",
          height: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {content}
      </div>
    </Link>
  );
}
