"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";

// Shown instead of a blank screen if rendering a page throws. retry() re-renders the page segment.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <p className="text-5xl">🧁</p>
      <h1 className="page-title mt-4">Something went wrong</h1>
      <p className="mt-3 text-charcoal/70">Sorry — this page hit a snag. Please try again in a moment.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button onClick={() => retry()} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-secondary">
          Go to the home page
        </Link>
      </div>
    </div>
  );
}
