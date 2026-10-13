import Link from "next/link";
import CrownMark from "@/components/CrownMark";

// Rendered inside the root layout (navbar + footer) for any URL that doesn't match a page.
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <CrownMark className="h-8 w-8 text-gold" />
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-plum">Error 404</p>
      <h1 className="page-title mt-2">This page isn&apos;t on the menu</h1>
      <p className="mt-3 text-charcoal/70">
        The link may be old, or the page may have moved. Everything we bake is still just a click away.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          Browse the menu
        </Link>
        <Link href="/contact" className="btn-secondary">
          Contact us
        </Link>
      </div>
    </div>
  );
}
