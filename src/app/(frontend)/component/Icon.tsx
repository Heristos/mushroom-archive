import Image from "next/image";

type IconProps = {
  icon: string;
  alt?: string;
  className?: string;
  size?: "xxs" | "xs" | "s" | "m" | "l" | "xl" | "xxl";
};

const sizeMap: Record<NonNullable<IconProps["size"]>, number> = {
  xxs: 0.25,
  xs: 0.5,
  s: 0.75,
  m: 1,
  l: 1.25,
  xl: 1.5,
  xxl: 1.75,
};

export default function Icon({
  icon,
  alt = "",
  className = "",
  size = "l",
}: IconProps) {
  const dimension = sizeMap[size];

  return (
    <span className="inline-flex items-center leading-none">
      <Image
        src={`/icon/${icon}.webp`}
        alt={alt}
        width={16}
        height={16}
        className={className}
        style={{
          width: `${dimension}em`,
          height: "auto",
          objectFit: "contain",
        }}
      />
    </span>
  );
}
