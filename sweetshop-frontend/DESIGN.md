# KING CAKE PLACE — Homepage Design v2

Scope: `src/app/page.tsx` and the components it composes (`Hero`, `SearchBar`,
product cards). Carries forward the v1 palette/type system already shipped in
`globals.css` and `layout.tsx`. This pass adds carousels, a rotating
announcement strip, and more real content, while keeping the "quiet premium
patisserie" direction — not a generic e-commerce template.

## 1. What the brief actually asked for

"Redesign the UI much — carousels, offers, more things — as a real bakery
site, but keep it beautiful and minimalistic."

Read literally, "offers" suggests discount banners and coupon codes. Before
designing anything I checked what the backend actually supports:

- `sweetshop-backend` has **no discount, coupon, or promo-code model** —
  no field on `Product` for a sale price, nothing in `OrderService` that
  applies a percentage off. A "20% OFF" badge would be a lie with nothing
  behind it at checkout.
- There **is** a real review system (`/api/products/{id}/reviews` →
  `averageRating` / `reviewCount`, public GET) — genuine social proof I can
  use.
- `/api/categories` and `/api/products` are public GETs — guests can browse
  real data, already wired up in v1.
- Live categories in the dev DB right now: **Cakes, Sweet, Snacks, Bakery,
  South Indian**. Whatever "offers" content I design must not hardcode
  categories that don't exist (e.g. "Birthday Items" isn't in the DB).

Decision: "offers" becomes **honest merchandising**, not fabricated
discounts — a rotating hero carousel that spotlights real categories, plus
copy about real capabilities (custom cakes, delivery, payment options)
already established elsewhere in the app. Nothing quantitative is invented.

Deliberately **not** doing: fake % -off badges, invented coupon codes,
fabricated customer testimonials with made-up names, a "10,000+ orders"
style stats band (no analytics endpoint backs it), a free-delivery-above-₹X
banner (no such rule exists in the backend).

## 2. Tokens (unchanged from v1, carried forward)

| Token | Hex | Use |
|---|---|---|
| `cream` | `#FBF6EE` | page ground |
| `ink` | `#241512` | hero/footer, dark panels |
| `plum` | `#5C2A3B` | secondary accent, CTA panel |
| `gold` | `#B8863B` | primary accent, buttons, signature |
| `gold-light` | `#E8D5B5` | hairlines, tints, hover fills |
| `charcoal` | `#2A2320` | body text |

Type: Fraunces (display) + Manrope (body/UI). Signature: the crown mark
(`CrownMark.tsx`) — unchanged, extended to a couple more spots below.

## 3. Section plan

```
┌─────────────────────────────────────────────┐
│ ▸ Custom cakes for every celebration ◂       │  ← AnnouncementTicker (new)
├─────────────────────────────────────────────┤
│              ⬥ (crown)                       │
│        PATISSERIE · MITHAI · BAKERY          │
│           KING CAKE PLACE                     │  ← Hero, now a carousel:
│         [ live category spotlight ]           │    slide 1 = brand
│      ● ○ ○ ○ ○      ‹prev   next›            │    slides 2..n = one per
└─────────────────────────────────────────────┘    real category (capped 4)
[ search bar ]

Shop by category           (grid, unchanged from v1)
┌────┐┌────┐┌────┐┌────┐
│ 🎂 ││ 🍬 ││ 🥟 ││ 🍞 │
└────┘└────┘└────┘└────┘

Fresh from the counter     ‹ ›     ← NEW: horizontal scroll-snap carousel,
┌──────┐┌──────┐┌──────┐┈┈           real products, real ★ rating badge
│ card ││ card ││ card │              when a product actually has reviews
└──────┘└──────┘└──────┘

How it works                (unchanged: 3-step, numbered, quiet timeline)
Why order with us           (unchanged: flat 3-col, divider rule)
[ Ready to order? ]          (unchanged: guests-only CTA panel)
```

### 3.1 AnnouncementTicker (new component)

A slim one-line strip above the hero, cream text on a hairline-bordered
cream/ink-tinted bar. Cycles through short, true statements already
established elsewhere in the app's own copy (not new claims):

- "Custom cakes for every celebration"
- "Dine-in, takeaway & delivery available"
- "Pay online, by UPI, or at the counter"
- "Freshly baked every morning"

Cross-fades every 4.5s. Pauses on hover/focus. If
`prefers-reduced-motion: reduce`, shows the first line only, no animation.

### 3.2 Hero → carousel

Same ink panel/crown/wordmark treatment as v1 for slide 1. Slides 2+ are
generated **from whatever categories actually exist** (`categories.slice(0,
4)`), each rendering:

- category emoji (existing `emojiFor`)
- category name (real, from the API)
- a curated one-line tagline keyed by category name, same pattern as the
  existing `CATEGORY_EMOJI` map, with a generic fallback for any category
  name we don't recognize — **not** the raw `category.description` field,
  because live seed data has typos/placeholder text ("you willl enjoy")
  that would look unpolished on a hero slide
- a "Browse {name} →" button that sets `selectedCategoryId` and scrolls to
  the category grid

Controls: dot indicators (one per slide) + prev/next chevron buttons, ink
bg with gold/cream controls. Autoplay every 6s, pauses on
hover/focus-within and while a user has just interacted (resets timer).
Swipe-friendly via native CSS scroll-snap under the hood so touch drag
works for free. `prefers-reduced-motion` disables autoplay (manual
controls still work). Keyboard: left/right arrow keys move slides when the
carousel has focus; each slide region is `aria-roledescription="slide"`
inside an `aria-label="Highlights"` region, live region is polite so
screen readers aren't interrupted mid-sentence.

### 3.3 "Fresh from the counter" → product carousel

Same six products as v1's preview row, same `ProductCard`, but the layout
becomes a horizontally scrollable, snap-aligned row (`overflow-x-auto
snap-x`) instead of a static grid — lets a card peek at the edge, signals
"more to scroll," reads more like a real bakery counter display case than
a generic grid. Two small round chevron buttons next to the section title
scroll the row by one card width; native touch scroll/trackpad works
regardless.

Each card gets a small `★ 4.6 (12)` badge — **only when `reviewCount > 0`**
— fetched from the real per-product review endpoint for just these six
products (six parallel requests, not N+1 across the whole catalog; the
larger category-filtered grid does not fetch ratings, to keep that view
fast when a category has many products).

### 3.4 Everything else

Category grid, "How it works," "Why order with us," and the closing CTA
are unchanged from v1 — they're already doing their job. Not every section
needs to become a carousel; the grid stays a grid because browsing-by-tap
is the right interaction there.

## 4. Build order

1. `AnnouncementTicker.tsx` — new, self-contained, no dependencies on
   page state.
2. `Hero.tsx` — rewrite as carousel; accepts `categories` +
   `onSelectCategory` props from the page.
3. `page.tsx` — wire the new Hero props, add the ratings fetch for the
   featured six, convert the "Fresh from the counter" grid to a scroll-snap
   row with arrow controls.
4. Typecheck + lint + hit the running dev server to confirm it renders
   (no browser/screenshot tool available in this environment — visual
   check is on you).
