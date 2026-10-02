"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch, resolveImageUrl } from "@/lib/api";
import { Category, Product, ReviewSummary } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { matchesSearch } from "@/lib/search";
import { playPopSound } from "@/lib/sound";
import { emojiFor } from "@/lib/categoryDisplay";
import SearchBar from "@/components/SearchBar";
import Hero from "@/components/Hero";
import AnnouncementTicker from "@/components/AnnouncementTicker";
import QuantityStepper from "@/components/QuantityStepper";

function FeatureIcon({ name }: { name: "oven" | "cake" | "pay" }) {
  const paths: Record<string, React.ReactNode> = {
    oven: (
      <>
        <path d="M4 20h16" />
        <path d="M6 20V9a6 6 0 0 1 12 0v11" />
        <path d="M9 20v-6a3 3 0 0 1 6 0v6" />
      </>
    ),
    cake: (
      <>
        <path d="M4 20v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6" />
        <path d="M4 20h16" />
        <path d="M8 12V9M12 12V9M16 12V9" />
        <path d="M12 4v2.5" />
        <circle cx="12" cy="3" r="0.6" fill="currentColor" />
      </>
    ),
    pay: (
      <>
        <rect x="3.5" y="6.5" width="17" height="12" rx="2" />
        <path d="M3.5 10.5h17" />
        <path d="M7 14.5h4" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

const LANDING_FEATURES: { title: string; text: string; icon: "oven" | "cake" | "pay" }[] = [
  {
    title: "Freshly baked daily",
    text: "Bread, cakes and pastries made fresh every morning — nothing sits on the shelf.",
    icon: "oven",
  },
  {
    title: "Perfect for celebrations",
    text: "Custom birthday cakes and celebration orders, made to order.",
    icon: "cake",
  },
  {
    title: "Pay your way",
    text: "Pay online with cards, UPI & netbanking, or simply pay at the counter or on delivery.",
    icon: "pay",
  },
];

const HOW_IT_WORKS = [
  { title: "Browse the menu", text: "Cakes, sweets, snacks and bakery — all in one place." },
  { title: "Add to your cart", text: "Pick your quantities and see the total before you order." },
  { title: "Pick up or get it delivered", text: "Dine-in, takeaway, or delivery to your door." },
];

interface ProductCardProps {
  product: Product;
  qty: number;
  busy: boolean;
  rating?: ReviewSummary;
  onIncrement: () => void;
  onDecrement: () => void;
}

function ProductCard({ product: p, qty, busy, rating, onIncrement, onDecrement }: ProductCardProps) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-gold-light/50 bg-cream transition hover:border-gold">
      <Link href={`/products/${p.id}`} className="flex-1">
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveImageUrl(p.imageUrl)}
            alt={p.name}
            className="h-40 w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-40 items-center justify-center bg-gold-light/20 text-4xl">🍰</div>
        )}
        <div className="p-4">
          <h3 className="font-semibold text-ink group-hover:text-plum">{p.name}</h3>
          <p className="text-xs text-charcoal/50">{p.categoryName}</p>
          {rating && rating.reviewCount > 0 && (
            <p className="mt-0.5 text-xs font-medium text-gold">
              ★ {rating.averageRating.toFixed(1)} <span className="font-normal text-charcoal/40">({rating.reviewCount})</span>
            </p>
          )}
          <p className="mt-1 text-sm text-charcoal/70 line-clamp-2">{p.description}</p>
        </div>
      </Link>
      <div className="flex items-center justify-between px-4 pb-4">
        <div>
          <span className="font-semibold text-ink">₹{p.price}</span>
          <span className="ml-1 text-xs text-charcoal/50">/ {p.unit}</span>
        </div>
        {qty > 0 ? (
          <QuantityStepper
            value={qty}
            min={0}
            max={p.stockQuantity}
            disabled={busy}
            onChange={(next) => (next > qty ? onIncrement() : onDecrement())}
          />
        ) : (
          <button
            disabled={!p.isAvailable || p.stockQuantity <= 0 || busy}
            onClick={onIncrement}
            className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!p.isAvailable ? "Unavailable" : p.stockQuantity <= 0 ? "Out of Stock" : busy ? "Adding..." : "Add to Cart"}
          </button>
        )}
      </div>
      {p.stockQuantity <= 5 && p.isAvailable && (
        <p className="px-4 pb-3 -mt-2 text-xs text-plum">Only {p.stockQuantity} left</p>
      )}
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const { getQuantity, incrementItem, decrementItem } = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [ratings, setRatings] = useState<Record<number, ReviewSummary>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const listingRef = useRef<HTMLDivElement>(null);
  const counterTrackRef = useRef<HTMLDivElement>(null);

  // Categories and a small product preview are public endpoints — shown to
  // guests and logged-in shoppers alike, not gated behind an account.
  useEffect(() => {
    apiFetch<Category[]>("/api/categories").then(setCategories).catch(() => {});
    apiFetch<Product[]>("/api/products").then((all) => setFeatured(all.slice(0, 6))).catch(() => {});
  }, []);

  // Real star ratings for just the featured six, not the whole catalog —
  // keeps a category with many products fast, and only ever shows a rating
  // that's actually backed by reviews.
  useEffect(() => {
    if (featured.length === 0) return;
    Promise.all(
      featured.map((p) =>
        apiFetch<ReviewSummary>(`/api/products/${p.id}/reviews`)
          .then((summary) => [p.id, summary] as const)
          .catch(() => [p.id, null] as const)
      )
    ).then((entries) => {
      const map: Record<number, ReviewSummary> = {};
      for (const [id, summary] of entries) {
        if (summary) map[id] = summary;
      }
      setRatings(map);
    });
  }, [featured]);

  useEffect(() => {
    // Browsing by category tile, no search: don't fetch anything until a category is picked.
    if (selectedCategoryId === null && !searchQuery) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const path = selectedCategoryId ? `/api/products?categoryId=${selectedCategoryId}` : "/api/products";
    apiFetch<Product[]>(path)
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [selectedCategoryId, searchQuery]);

  const showingCategoryOrSearch = selectedCategoryId !== null || searchQuery.trim() !== "";

  // Jumps down to the results whenever a category/search view opens — matters
  // most for the hero carousel's "Browse {category} →" buttons, since the
  // listing renders below the fold from there.
  useEffect(() => {
    if (showingCategoryOrSearch) {
      listingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showingCategoryOrSearch]);

  async function handleIncrement(product: Product) {
    setPendingId(product.id);
    try {
      await incrementItem(product);
      playPopSound();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to add to cart.");
      setTimeout(() => setMessage(null), 2500);
    } finally {
      setPendingId(null);
    }
  }

  async function handleDecrement(productId: number) {
    setPendingId(productId);
    try {
      await decrementItem(productId);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update cart.");
      setTimeout(() => setMessage(null), 2500);
    } finally {
      setPendingId(null);
    }
  }

  function scrollCounter(direction: 1 | -1) {
    const track = counterTrackRef.current;
    if (!track) return;
    const card = track.firstElementChild as HTMLElement | null;
    const amount = (card?.offsetWidth ?? track.clientWidth) + 20;
    track.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  const visibleProducts = products.filter((p) => matchesSearch(p, searchQuery));
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div>
      <AnnouncementTicker />
      <Hero categories={categories} onSelectCategory={setSelectedCategoryId} />

      {message && (
        <div className="mb-4 rounded-md bg-gold-light/40 px-4 py-2 text-sm font-medium text-ink">{message}</div>
      )}

      <div className="mb-8">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {!showingCategoryOrSearch ? (
        <div className="space-y-16">
          {/* --- Category tiles: the default view for everyone --- */}
          <section>
            <h1 className="mb-4 font-[family-name:var(--font-display)] text-xl font-medium text-ink">Shop by category</h1>
            {categories.length === 0 ? (
              <p className="text-charcoal/60">No categories yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategoryId(c.id)}
                    className="flex flex-col items-center gap-2 rounded-xl border border-gold-light/50 bg-cream p-6 text-center transition hover:border-gold hover:bg-gold-light/20"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-light/30 text-3xl">
                      {emojiFor(c.name)}
                    </span>
                    <span className="font-semibold text-ink">{c.name}</span>
                    {c.description && <span className="text-xs text-charcoal/60">{c.description}</span>}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* --- Fresh from the counter: a real preview, scroll-snap carousel --- */}
          {featured.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-ink">
                  Fresh from the counter
                </h2>
                <div className="flex gap-2">
                  <button
                    aria-label="Scroll left"
                    onClick={() => scrollCounter(-1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gold-light/60 text-ink transition hover:border-gold hover:bg-gold-light/20"
                  >
                    ‹
                  </button>
                  <button
                    aria-label="Scroll right"
                    onClick={() => scrollCounter(1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gold-light/60 text-ink transition hover:border-gold hover:bg-gold-light/20"
                  >
                    ›
                  </button>
                </div>
              </div>
              <div
                ref={counterTrackRef}
                className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {featured.map((p) => (
                  <div key={p.id} className="w-72 flex-none snap-start sm:w-80">
                    <ProductCard
                      product={p}
                      qty={getQuantity(p.id)}
                      busy={pendingId === p.id}
                      rating={ratings[p.id]}
                      onIncrement={() => handleIncrement(p)}
                      onDecrement={() => handleDecrement(p.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* --- How it works --- */}
          <section>
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.25em] text-plum">How it works</p>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-10">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={step.title}>
                  <div className="h-px w-10 bg-gold" />
                  <span className="mt-4 block font-[family-name:var(--font-display)] text-2xl text-charcoal/25">
                    0{i + 1}
                  </span>
                  <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg font-medium text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-charcoal/70">{step.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* --- Why order with us --- */}
          <section>
            <p className="mb-6 text-xs font-semibold uppercase tracking-[0.25em] text-plum">Why order with us</p>
            <div className="grid grid-cols-1 divide-y divide-gold-light/40 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {LANDING_FEATURES.map((f) => (
                <div key={f.title} className="flex flex-col items-start gap-2 py-6 sm:px-8 sm:py-0 sm:first:pl-0 sm:last:pr-0">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-light/30 text-gold">
                    <FeatureIcon name={f.icon} />
                  </span>
                  <h3 className="mt-1 font-[family-name:var(--font-display)] text-base font-medium text-ink">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-charcoal/70">{f.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* --- Closing CTA: only guests need to be told to sign up --- */}
          {!user && (
            <section className="rounded-2xl bg-plum px-8 py-10 text-center">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-cream">Ready to order?</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-cream/70">
                Create a free account or log in to add items to your cart and check out.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/register"
                  className="rounded-md bg-gold px-5 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-gold-light"
                >
                  Create account
                </Link>
                <Link
                  href="/login"
                  className="rounded-md border border-cream/30 px-5 py-2 text-sm font-semibold text-cream transition hover:bg-cream/10"
                >
                  Login
                </Link>
              </div>
            </section>
          )}
        </div>
      ) : (
        // --- Products: inside a category, or a search result ---
        <div ref={listingRef}>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setSelectedCategoryId(null);
                setSearchQuery("");
              }}
              className="text-sm font-medium text-plum hover:underline"
            >
              ← All categories
            </button>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-ink">
              {searchQuery.trim() ? `Search results for "${searchQuery}"` : selectedCategory?.name}
            </h2>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                selectedCategoryId === null
                  ? "bg-ink text-cream"
                  : "bg-gold-light/30 text-ink hover:bg-gold-light/50"
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategoryId(c.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  selectedCategoryId === c.id
                    ? "bg-ink text-cream"
                    : "bg-gold-light/30 text-ink hover:bg-gold-light/50"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border border-gold-light/40 p-4">
                  <div className="mb-3 h-36 rounded-lg bg-gold-light/30" />
                  <div className="mb-2 h-4 w-2/3 rounded bg-gold-light/30" />
                  <div className="h-3 w-1/3 rounded bg-gold-light/30" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-charcoal/60">No products found.</p>
          ) : visibleProducts.length === 0 ? (
            <p className="text-charcoal/60">No products match your search.</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  qty={getQuantity(p.id)}
                  busy={pendingId === p.id}
                  onIncrement={() => handleIncrement(p)}
                  onDecrement={() => handleDecrement(p.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
