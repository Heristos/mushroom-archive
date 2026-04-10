import Link from "next/link";

type Card = {
  title: string;
  type: string;
  image: string;
  href: string;
  loading?: "lazy" | "eager";
};

const hexPattern = {
  background: `
    linear-gradient(30deg, #1a1a1a 12%, transparent 12.5%, transparent 87%, #1a1a1a 87.5%),
    linear-gradient(150deg, #1a1a1a 12%, transparent 12.5%, transparent 87%, #1a1a1a 87.5%),
    linear-gradient(30deg, #1a1a1a 12%, transparent 12.5%, transparent 87%, #1a1a1a 87.5%),
    linear-gradient(150deg, #1a1a1a 12%, transparent 12.5%, transparent 87%, #1a1a1a 87.5%),
    linear-gradient(60deg, #1e1e1e 25%, transparent 25.5%, transparent 75%, #1e1e1e 75%),
    linear-gradient(60deg, #1e1e1e 25%, transparent 25.5%, transparent 75%, #1e1e1e 75%),
    #191919
  `,
  backgroundSize: "30px 52px",
  backgroundPosition: "0 0, 0 0, 15px 26px, 15px 26px, 0 0, 15px 26px",
};

export default function Card({
  title,
  type,
  image,
  href,
  loading = "lazy",
}: Card) {
  return (
    <Link href={href} className="block no-underline">
      <div
        style={hexPattern}
        className="border-2 border-gray-700 w-52 
        shadow-[inset_3px_3px_0_var(--light-main),inset_-3px_-3px_0_var(--dark-main)]
        transform hover:-translate-y-1 transition duration-150"
      >
        <div className="bg-(--color-main) shadow-[inset_2px_2px_0_var(--light-main),inset_-2px_-2px_0_var(--dark-main)] h-10 flex items-center justify-center">
          <span className="text-white text-xs font-semibold text-center uppercase">
            {type}
          </span>
        </div>

        <div className="flex items-center justify-center">
          <img
            src={image}
            alt={title}
            loading={loading}
            className="w-full h-32 object-cover"
          />
        </div>

        <div className="bg-gray-700 shadow-[inset_2px_2px_0_var(--light-main),inset_-2px_-2px_0_var(--dark-main)] h-10 flex items-center justify-center">
          <span className="text-white text-xs text-center line-clamp-1">
            {title}
          </span>
        </div>
      </div>
    </Link>
  );
}
