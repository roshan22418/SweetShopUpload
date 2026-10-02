"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Category, ShopSettings } from "@/types";
import { useAuth } from "@/context/AuthContext";
import CrownMark from "@/components/CrownMark";
import { emojiFor, taglineFor } from "@/lib/categoryDisplay";

const FULFILMENT_TAGS = ["Dine-in", "Takeaway", "Delivery"];
const MAX_CATEGORY_SLIDES = 4;

interface HeroProps {
  categories: Category[];
  onSelectCategory: (id: number) => void;
}

export default function Hero({ categories, onSelectCategory }: HeroProps) {
  const { user } = useAuth();
  const [shopName, setShopName] = useState("KING CAKE PLACE");
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const categorySlides = categories.slice(0, MAX_CATEGORY_SLIDES);
  const slideCount = 1 + categorySlides.length;

  useEffect(() => {
    apiFetch<ShopSettings>("/api/shop-settings")
      .then((settings) => setShopName(settings.shopName))
      .catch(() => {});
  }, []);

  function goTo(index: number) {
    const next = (index + slideCount) % slideCount;
    setActive(next);
    trackRef.current?.scrollTo({ left: next * trackRef.current.clientWidth, behavior: "smooth" });
  }

  // Re-arms a fresh 6s window after every slide change, whether that change
  // came from autoplay, an arrow click, a dot click, or a swipe — so manual
  // interaction naturally resets the timer instead of fighting it.
  useEffect(() => {
    if (paused || slideCount <= 1) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => goTo(active + 1), 6000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, paused, slideCount]);

  function handleScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    setActive((prev) => (prev === index ? prev : index));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") goTo(active + 1);
    if (e.key === "ArrowLeft") goTo(active - 1);
  }

  const activeSlideName = active === 0 ? shopName : categorySlides[active - 1]?.name;

  return (
    <div
      className="relative mb-10 overflow-hidden rounded-3xl bg-ink"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{ background: "radial-gradient(60% 55% at 50% 40%, rgba(184,134,59,0.18), transparent 70%)" }}
      />

      <p className="sr-only" aria-live="polite">
        {`Slide ${active + 1} of ${slideCount}: ${activeSlideName}`}
      </p>

      <div
        ref={trackRef}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Highlights"
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-full flex-none snap-center flex-col items-center px-4 py-14 text-center sm:py-20">
          <CrownMark className="h-7 w-7 text-gold" />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.35em] text-gold-light">
            Patisserie &middot; Mithai &middot; Bakery
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-medium tracking-tight text-cream sm:text-6xl">
            {shopName}
          </h1>
          <div className="mt-5 h-px w-12 bg-gold/60" />
          <p className="mt-5 max-w-md text-sm text-cream/60 sm:text-base">
            {user
              ? `Welcome back, ${user.fullName.split(" ")[0]} — here's what's fresh today.`
              : "Fresh sweets, cakes & bakery, made daily for dine-in, takeaway or delivery."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {FULFILMENT_TAGS.map((tag) => (
              <span key={tag} className="rounded-full border border-cream/15 px-3 py-1 text-xs font-medium text-cream/70">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {categorySlides.map((c) => (
          <div
            key={c.id}
            className="flex w-full flex-none snap-center flex-col items-center px-4 py-14 text-center sm:py-20"
          >
            <span className="text-4xl">{emojiFor(c.name)}</span>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.35em] text-gold-light">On the menu</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-medium tracking-tight text-cream sm:text-5xl">
              {c.name}
            </h2>
            <div className="mt-5 h-px w-12 bg-gold/60" />
            <p className="mt-5 max-w-md text-sm text-cream/60 sm:text-base">{taglineFor(c.name)}</p>
            <button
              onClick={() => onSelectCategory(c.id)}
              className="mt-6 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink transition hover:bg-gold-light"
            >
              Browse {c.name} →
            </button>
          </div>
        ))}
      </div>

      {slideCount > 1 && (
        <>
          <button
            aria-label="Previous slide"
            onClick={() => goTo(active - 1)}
            className="absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-cream/20 bg-ink/60 text-cream backdrop-blur transition hover:bg-ink/90"
          >
            ‹
          </button>
          <button
            aria-label="Next slide"
            onClick={() => goTo(active + 1)}
            className="absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-cream/20 bg-ink/60 text-cream backdrop-blur transition hover:bg-ink/90"
          >
            ›
          </button>
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {Array.from({ length: slideCount }).map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${i === active ? "w-6 bg-gold" : "w-1.5 bg-cream/30"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
