"use client";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

// Controlled: the page owns the text, so "All categories" (or anything else) clearing the search also
// clears what's in the box. Filtering is client-side and the page defers it, so no debounce is needed.
export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative w-full max-w-md">
      <label htmlFor="product-search" className="sr-only">
        Search products
      </label>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </svg>
      <input
        id="product-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search cakes, sweets, snacks…"
        autoComplete="off"
        className="field rounded-full py-2.5 pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-lg leading-none text-charcoal/50 transition hover:bg-gold-light/40 hover:text-ink"
        >
          ×
        </button>
      )}
    </div>
  );
}
