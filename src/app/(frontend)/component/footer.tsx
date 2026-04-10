import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="bg-(--color-main) text-white"
      style={{
        boxShadow:
          "inset 3px 3px 0px var(--light-main), inset -3px -3px 0px var(--dark-main)",
      }}
    >
      <div className="container mx-auto text-center text-xl py-4 px-6">
        <p>© 2026 THE MUSHROOM ARCHIVE</p>
        <p className="text-sm mt-1">
          This site is not affiliated with Nintendo in any way and is for
          archival purposes only. - Ce site n&apos;est affilié en aucune façon à
          Nintendo et a uniquement un but d&apos;archivage.
        </p>
        <p className="text-sm mt-2">
          <Link href="/legal" className="underline hover:text-gray-300 mx-2">
            Legal Notice
          </Link>
          |
          <Link href="/terms" className="underline hover:text-gray-300 mx-2">
            Terms of Use
          </Link>
          |
          <Link href="/privacy" className="underline hover:text-gray-300 mx-2">
            Privacy Policy
          </Link>
        </p>
      </div>
    </footer>
  );
}
