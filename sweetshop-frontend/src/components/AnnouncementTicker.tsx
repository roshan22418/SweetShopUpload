"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Custom cakes for every celebration",
  "Dine-in, takeaway & delivery available",
  "Pay online, by UPI, or at the counter",
  "Freshly baked every morning",
];

export default function AnnouncementTicker() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 4500);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <div
      className="mb-6 flex items-center justify-center rounded-full border border-gold-light/60 bg-gold-light/20 px-4 py-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <p key={index} aria-live="polite" className="animate-fade-in text-xs font-medium tracking-wide text-plum sm:text-sm">
        {MESSAGES[index]}
      </p>
    </div>
  );
}
